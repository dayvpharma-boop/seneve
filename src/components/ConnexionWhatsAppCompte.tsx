import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { maskPhone } from '@/lib/liaison';
import { lienDemandeCode, normaliserTelephone } from '@/lib/connexion-whatsapp';
import './connexion-whatsapp.css';

/** Mes réglages → « Se connecter avec WhatsApp » (décision de Dr Justin du 21/11/2026).
 *  Un compte e-mail déjà connecté ajoute son numéro : Supabase Auth prépare un code (changement de numéro),
 *  la personne envoie « CODE » au WhatsApp de SÉNEVÉ, reçoit le code et le saisit ici.
 *  Ensuite elle peut se connecter avec ce numéro OU avec son e-mail : c'est le même compte, rien n'est fusionné. */
const TEXTES = {
  fr: {
    intro: 'Ajoute ton numéro WhatsApp pour te connecter aussi avec lui. Ton e-mail reste valable ; c’est le même compte.',
    actif: (n: string) => `Tu peux te connecter avec ton WhatsApp ${n} ou avec ton e-mail.`,
    numero: 'Numéro WhatsApp avec indicatif pays', preparer: 'Recevoir mon code WhatsApp', instant: 'Un instant…',
    pret: (n: string) => `Ton code est prêt pour ${n}.`,
    etape1: <>Depuis ce numéro WhatsApp, envoie <strong>CODE</strong> à SÉNEVÉ.</>,
    etape2: 'SÉNEVÉ te répond avec ton code à 6 chiffres. Saisis-le ci-dessous.',
    ouvrir: 'Ouvrir WhatsApp', code: 'Code de vérification', confirmer: 'Confirmer mon numéro', changer: 'Changer de numéro',
    fait: 'C’est fait : ton numéro WhatsApp est ajouté à ton compte.',
    formatNumero: 'Indique ton numéro avec son indicatif pays, en commençant par +.', formatCode: 'Saisis le code à 6 chiffres.',
    pris: 'Ce numéro est déjà utilisé par un autre compte SÉNEVÉ. Par sécurité, rien n’a été changé. Écris à l’équipe depuis Aide.',
    trop: 'Trop de tentatives. Patiente avant de réessayer.', mauvais: 'Code incorrect ou expiré. Demande un nouveau code.',
    reseau: 'Vérifie ta connexion et réessaie.', indispo: 'Impossible pour le moment. Réessaie plus tard.',
    note: 'Ajouter ton numéro ne t’inscrit à aucun message WhatsApp.',
  },
  en: {
    intro: 'Add your WhatsApp number to sign in with it too. Your email still works; it is the same account.',
    actif: (n: string) => `You can sign in with your WhatsApp ${n} or with your email.`,
    numero: 'WhatsApp number with country code', preparer: 'Receive my WhatsApp code', instant: 'One moment…',
    pret: (n: string) => `Your code is ready for ${n}.`,
    etape1: <>From this WhatsApp number, send <strong>CODE</strong> to SÉNEVÉ.</>,
    etape2: 'SÉNEVÉ replies with your 6-digit code. Enter it below.',
    ouvrir: 'Open WhatsApp', code: 'Verification code', confirmer: 'Confirm my number', changer: 'Change number',
    fait: 'Done: your WhatsApp number is added to your account.',
    formatNumero: 'Enter your number with its country code, starting with +.', formatCode: 'Enter the 6-digit code.',
    pris: 'This number is already used by another SÉNEVÉ account. For safety, nothing was changed. Write to the team from Help.',
    trop: 'Too many attempts. Please wait before trying again.', mauvais: 'Invalid or expired code. Request a new code.',
    reseau: 'Check your connection and try again.', indispo: 'Not possible right now. Try again later.',
    note: 'Adding your number does not sign you up for any WhatsApp message.',
  },
} as const;

type Textes = (typeof TEXTES)['fr' | 'en'];

export function erreurAjoutNumero(message: string | undefined, T: Textes): string {
  const m = (message ?? '').toLowerCase();
  if (/phone_exists|already been registered|already registered/.test(m)) return T.pris;
  if (/rate.limit|too many|for security|only request/.test(m)) return T.trop;
  if (/expired|invalid/.test(m)) return T.mauvais;
  if (/network|fetch/.test(m)) return T.reseau;
  return T.indispo;
}

export function ConnexionWhatsAppCompte({ langue, enLigne = true, onResume }: {
  langue?: string | null; enLigne?: boolean; onResume?: (resume: string | null) => void;
}) {
  const en = langue === 'en';
  const T = TEXTES[en ? 'en' : 'fr'];
  const [actuel, setActuel] = useState<string | null | undefined>(undefined);
  const [telephone, setTelephone] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const verrou = useRef(false);

  useEffect(() => {
    let vivant = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!vivant) return;
      const p = data.user?.phone;
      setActuel(p ? '+' + p.replace(/^\+/, '') : null);
    }).catch(() => { if (vivant) setActuel(null); });
    // Proposer le numéro déjà relié avec « Relier mon WhatsApp », s'il existe.
    void supabase.from('channel_links').select('identite_canal').eq('canal', 'whatsapp').eq('etat', 'verifiee').maybeSingle()
      .then(({ data }) => { if (vivant && data?.identite_canal) setTelephone(t => t || String(data.identite_canal)); });
    return () => { vivant = false; };
  }, []);
  useEffect(() => { onResume?.(actuel === undefined ? null : actuel ? maskPhone(actuel) : (en ? 'Not added' : 'Non ajouté')); }, [actuel, en, onResume]);

  async function preparer(e: FormEvent) {
    e.preventDefault();
    if (!enLigne || verrou.current) return;
    const phone = normaliserTelephone(telephone);
    if (!phone) { setErreur(T.formatNumero); return; }
    verrou.current = true; setOccupe(true); setErreur('');
    try {
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) { setErreur(erreurAjoutNumero(error.message + ' ' + (error.code ?? ''), T)); return; }
      setDestination(phone); setCode('');
    } catch { setErreur(T.reseau); }
    finally { verrou.current = false; setOccupe(false); }
  }

  async function confirmer(e: FormEvent) {
    e.preventDefault();
    if (!destination || !enLigne || verrou.current) return;
    if (!/^[0-9]{6}$/.test(code)) { setErreur(T.formatCode); return; }
    verrou.current = true; setOccupe(true); setErreur('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: destination, token: code, type: 'phone_change' });
      if (error || !data.user) { setErreur(erreurAjoutNumero(error?.message ?? 'invalid', T)); return; }
      setActuel(destination); setDestination(null); setCode(''); setSucces(true);
    } catch { setErreur(T.reseau); }
    finally { verrou.current = false; setOccupe(false); }
  }

  if (actuel === undefined) return null;

  return <div className="card connexion-whatsapp">
    {actuel ? <p className={succes ? 'success' : undefined} role="status">{succes ? T.fait + ' ' : ''}{T.actif(maskPhone(actuel))}</p> : <p>{T.intro}</p>}
    {!actuel && !destination && <form className="form" onSubmit={preparer} aria-busy={occupe}>
      <label>{T.numero}<input type="tel" autoComplete="tel" inputMode="tel" placeholder="+243…" value={telephone} onChange={e => setTelephone(e.target.value)} required disabled={occupe} /></label>
      <button className="btn" disabled={occupe || !enLigne}>{occupe ? T.instant : T.preparer}</button>
    </form>}
    {!actuel && destination && <>
      <p role="status">{T.pret(destination)}</p>
      <ol className="code-etapes"><li>{T.etape1}</li><li>{T.etape2}</li></ol>
      <a className="code-ouvrir-whatsapp" href={lienDemandeCode()} target="_blank" rel="noopener noreferrer">{T.ouvrir}</a>
      <form className="form" onSubmit={confirmer} aria-busy={occupe}>
        <label>{T.code}<input type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required disabled={occupe} /></label>
        <button className="btn" disabled={occupe || !enLigne}>{T.confirmer}</button>
      </form>
      <button type="button" className="link" disabled={occupe} onClick={() => { setDestination(null); setCode(''); setErreur(''); }}>{T.changer}</button>
    </>}
    {erreur && <p className="error" role="alert">{erreur}</p>}
    {!actuel && <p className="muted">{T.note}</p>}
  </div>;
}
