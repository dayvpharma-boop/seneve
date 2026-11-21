import { useEffect, useRef, useState, type FormEvent } from 'react';
import { demanderCodeWhatsApp, erreurWhatsApp, lienDemandeCode, normaliserTelephone, verifierCodeWhatsApp } from '@/lib/connexion-whatsapp';
import './connexion-whatsapp.css';

export function ConnexionWhatsApp({ creation, langue, enLigne, onConnexion }: {
  creation: boolean; langue: 'fr' | 'en'; enLigne: boolean; onConnexion: () => void;
}) {
  const en = langue === 'en';
  const [telephone, setTelephone] = useState('');
  const [prenom, setPrenom] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [prochainEnvoi, setProchainEnvoi] = useState(0);
  const [maintenant, setMaintenant] = useState(Date.now());
  // Garde synchrone contre le double appui, avant le prochain rendu React.
  const verrou = useRef(false);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => {
    if (!prochainEnvoi) return;
    const t = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [prochainEnvoi]);
  const attente = Math.max(0, Math.ceil((prochainEnvoi - maintenant) / 1000));

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!enLigne || verrou.current || Date.now() < prochainEnvoi) return;
    const phone = normaliserTelephone(telephone);
    if (!phone) { setErreur(en ? 'Enter your number with its country code, starting with +.' : 'Indique ton numéro avec son indicatif pays, en commençant par +.'); return; }
    if (creation && !prenom.trim()) return;
    verrou.current = true; setOccupe(true); setErreur('');
    const courant = revision.current;
    // Délai appliqué aussi après une erreur ambiguë pour éviter une rafale coûteuse.
    const fin = Date.now() + 60000; setMaintenant(Date.now()); setProchainEnvoi(fin);
    try {
      const { error } = await demanderCodeWhatsApp(phone, creation, prenom, langue);
      if (courant !== revision.current) return;
      if (error) { setErreur(erreurWhatsApp(error.message, en)); return; }
      setDestination(phone); setCode('');
    } catch { if (courant === revision.current) setErreur(erreurWhatsApp('network', en)); }
    finally { verrou.current = false; if (courant === revision.current) setOccupe(false); }
  }

  async function verifier(e: FormEvent) {
    e.preventDefault();
    if (!destination || !enLigne || verrou.current) return;
    if (!/^[0-9]{6}$/.test(code)) { setErreur(en ? 'Enter the 6-digit code.' : 'Saisis le code à 6 chiffres.'); return; }
    verrou.current = true; setOccupe(true); setErreur('');
    const courant = revision.current;
    try {
      const { data, error } = await verifierCodeWhatsApp(destination, code);
      if (courant !== revision.current) return;
      if (error || !data.session) { setErreur(erreurWhatsApp(error?.message ?? 'invalid otp', en)); return; }
      setCode(''); onConnexion();
    } catch { if (courant === revision.current) setErreur(erreurWhatsApp('network', en)); }
    finally { verrou.current = false; if (courant === revision.current) setOccupe(false); }
  }

  return <section className="card connexion-whatsapp" aria-label={en ? 'WhatsApp sign-in' : 'Connexion WhatsApp'}>
    <h2>{en ? 'With WhatsApp' : 'Avec WhatsApp'}</h2>
    <p>{en ? 'No email needed. Send a message to SÉNEVÉ on WhatsApp to get your temporary code.' : 'Sans e-mail. Écris à SÉNEVÉ sur WhatsApp pour recevoir ton code temporaire.'}</p>
    {erreur && <p role="alert" className="error">{erreur}</p>}
    {!destination ? <form className="form" onSubmit={envoyer} aria-busy={occupe}>
      {creation && <label>{en ? 'Your first name' : 'Ton prénom'}<input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required disabled={occupe} /></label>}
      <label>{en ? 'WhatsApp number with country code' : 'Numéro WhatsApp avec indicatif pays'}<input type="tel" autoComplete="tel" inputMode="tel" placeholder="+243…" value={telephone} onChange={e => setTelephone(e.target.value)} required disabled={occupe} /></label>
      <button className="btn" disabled={occupe || !enLigne || attente > 0}>{occupe ? (en ? 'Sending…' : 'Envoi…') : attente ? (en ? `Wait ${attente} s` : `Patienter ${attente} s`) : (en ? 'Receive my WhatsApp code' : 'Recevoir mon code WhatsApp')}</button>
    </form> : <>
      <p role="status">{en ? 'Your code is ready for' : 'Ton code est prêt pour'} {destination}.</p>
      <ol className="code-etapes">
        <li>{en
          ? <>From this WhatsApp number, send <strong>CODE</strong> to SÉNEVÉ.</>
          : <>Depuis ce numéro WhatsApp, envoie <strong>CODE</strong> à SÉNEVÉ.</>}</li>
        <li>{en ? 'SÉNEVÉ replies with your 6-digit code. Enter it below.' : 'SÉNEVÉ te répond avec ton code à 6 chiffres. Saisis-le ci-dessous.'}</li>
      </ol>
      <a className="code-ouvrir-whatsapp" href={lienDemandeCode()} target="_blank" rel="noopener noreferrer">{en ? 'Open WhatsApp' : 'Ouvrir WhatsApp'}</a>
      <form className="form" onSubmit={verifier} aria-busy={occupe}>
        <label>{en ? 'Verification code' : 'Code de vérification'}<input type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} required disabled={occupe} /></label>
        <button className="btn" disabled={occupe || !enLigne}>{en ? 'Verify and continue' : 'Vérifier et continuer'}</button>
      </form>
      <button type="button" className="link" disabled={occupe || !enLigne || attente > 0} onClick={e => void envoyer(e as unknown as FormEvent)}>{attente ? (en ? `Resend in ${attente} s` : `Renvoyer dans ${attente} s`) : (en ? 'Resend code' : 'Renvoyer le code')}</button>
      <button type="button" className="link" disabled={occupe} onClick={() => { setDestination(null); setCode(''); setErreur(''); }}>{en ? 'Change number' : 'Changer de numéro'}</button>
    </>}
    <p className="muted">{en ? 'Verifying your number does not subscribe you to WhatsApp programme messages. Already have an email account? Sign in to it before linking another sign-in method.' : 'Vérifier ton numéro ne t’inscrit pas aux messages de programme WhatsApp. Tu as déjà un compte e-mail ? Connecte-toi à ce compte avant de lui ajouter un autre moyen de connexion.'}</p>
  </section>;
}
