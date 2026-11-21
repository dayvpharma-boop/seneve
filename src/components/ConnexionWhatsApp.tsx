import { useEffect, useRef, useState, type FormEvent } from 'react';
import { demanderCodeWhatsApp, erreurWhatsApp, lienDemandeCode, normaliserTelephone, verifierCodeWhatsApp } from '@/lib/connexion-whatsapp';
import { maskPhone } from '@/lib/liaison';
import { LogoWhatsApp } from './LogoWhatsApp';
import './connexion-whatsapp.css';

/** « Continuer avec WhatsApp » (21/11/2026) : un seul bouton, comme Google, qui ouvre un panneau en deux étapes.
 *  1. Prénom (création) et numéro → Supabase Auth prépare le code.
 *  2. La personne envoie « CODE » à SÉNEVÉ sur WhatsApp, reçoit son code et le saisit ici. */
const TEXTES = {
  fr: {
    bouton: 'Continuer avec WhatsApp', fermer: 'Fermer',
    titre: 'Avec ton numéro WhatsApp', sousTitre: 'Ni e-mail ni mot de passe : un code suffit.',
    etapes: ['Ton numéro', 'Ton code'],
    prenom: 'Ton prénom', prenomExemple: 'ex. Marie',
    numero: 'Ton numéro WhatsApp', numeroAide: 'Avec l’indicatif du pays',
    recevoir: 'Recevoir mon code', envoi: 'Un instant…',
    titre2: 'Demande ton code sur WhatsApp',
    explication: (n: string) => <>Depuis le <strong>{n}</strong>, envoie le mot <strong>CODE</strong> à SÉNEVÉ. Tu reçois aussitôt ton code à 6 chiffres.</>,
    envoyerCode: 'Envoyer CODE',
    code: 'Ton code à 6 chiffres', valider: 'Me connecter', validerCreation: 'Créer mon compte', verification: 'Vérification…',
    renvoyer: 'Recevoir un nouveau code', renvoyerDans: (s: number) => `Nouveau code dans ${s} s`, changer: 'Changer de numéro',
    formatNumero: 'Indique ton numéro avec son indicatif, en commençant par +.', formatCode: 'Saisis les 6 chiffres reçus sur WhatsApp.',
    note: 'Ton numéro sert seulement à te connecter : il ne t’inscrit à aucun message WhatsApp.',
    noteEmail: 'Tu as déjà un compte avec ton e-mail ? Connecte-toi avec lui, puis ajoute ton numéro dans Mes réglages.',
  },
  en: {
    bouton: 'Continue with WhatsApp', fermer: 'Close',
    titre: 'With your WhatsApp number', sousTitre: 'No email, no password: a code is enough.',
    etapes: ['Your number', 'Your code'],
    prenom: 'Your first name', prenomExemple: 'e.g. Mary',
    numero: 'Your WhatsApp number', numeroAide: 'With the country code',
    recevoir: 'Receive my code', envoi: 'One moment…',
    titre2: 'Ask for your code on WhatsApp',
    explication: (n: string) => <>From <strong>{n}</strong>, send the word <strong>CODE</strong> to SÉNEVÉ. Your 6-digit code arrives right away.</>,
    envoyerCode: 'Send CODE',
    code: 'Your 6-digit code', valider: 'Sign in', validerCreation: 'Create my account', verification: 'Checking…',
    renvoyer: 'Get a new code', renvoyerDans: (s: number) => `New code in ${s} s`, changer: 'Change number',
    formatNumero: 'Enter your number with its country code, starting with +.', formatCode: 'Enter the 6 digits received on WhatsApp.',
    note: 'Your number is only used to sign in: it does not sign you up for any WhatsApp message.',
    noteEmail: 'Already have an account with your email? Sign in with it, then add your number in My settings.',
  },
} as const;

export function ConnexionWhatsApp({ creation, langue, enLigne, onConnexion }: {
  creation: boolean; langue: 'fr' | 'en'; enLigne: boolean; onConnexion: () => void;
}) {
  const en = langue === 'en';
  const T = TEXTES[en ? 'en' : 'fr'];
  const [ouvert, setOuvert] = useState(false);
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

  async function envoyer(e?: FormEvent) {
    e?.preventDefault();
    if (!enLigne || verrou.current || Date.now() < prochainEnvoi) return;
    const phone = normaliserTelephone(telephone);
    if (!phone) { setErreur(T.formatNumero); return; }
    if (creation && !prenom.trim()) return;
    verrou.current = true; setOccupe(true); setErreur('');
    const courant = revision.current;
    // Délai appliqué aussi après une erreur ambiguë pour éviter une rafale.
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
    if (!/^[0-9]{6}$/.test(code)) { setErreur(T.formatCode); return; }
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

  if (!ouvert) return <div className="wa-entree">
    <button type="button" className="auth-social-bouton wa-bouton" disabled={!enLigne} aria-expanded={false} onClick={() => setOuvert(true)}>
      <LogoWhatsApp /><span>{T.bouton}</span>
    </button>
  </div>;

  const etape = destination ? 2 : 1;
  return <section className="wa-panneau connexion-whatsapp" aria-label={T.bouton}>
    <header className="wa-tete">
      <span className="wa-pastille"><LogoWhatsApp taille={22} blanc /></span>
      <div><h2>{T.titre}</h2><p>{T.sousTitre}</p></div>
      <button type="button" className="wa-fermer" aria-label={T.fermer} onClick={() => { revision.current++; setOuvert(false); setErreur(''); }}>×</button>
    </header>
    <ol className="wa-progression" aria-label={en ? 'Steps' : 'Étapes'}>
      {T.etapes.map((nom, i) => <li key={nom} className={i + 1 < etape ? 'fait' : i + 1 === etape ? 'actuelle' : undefined} aria-current={i + 1 === etape ? 'step' : undefined}><span>{i + 1 < etape ? '✓' : i + 1}</span>{nom}</li>)}
    </ol>
    {erreur && <p role="alert" className="error wa-erreur">{erreur}</p>}
    {!destination ? <form className="wa-formulaire" onSubmit={e => void envoyer(e)} aria-busy={occupe}>
      {creation && <label className="wa-champ"><span>{T.prenom}</span><input value={prenom} placeholder={T.prenomExemple} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required disabled={occupe} /></label>}
      <label className="wa-champ"><span>{T.numero} <small>{T.numeroAide}</small></span><input type="tel" autoComplete="tel" inputMode="tel" placeholder="+243 81 234 5678" value={telephone} onChange={e => setTelephone(e.target.value)} required disabled={occupe} /></label>
      <button className="wa-principal" disabled={occupe || !enLigne || attente > 0}>{occupe ? T.envoi : attente ? T.renvoyerDans(attente) : T.recevoir}</button>
    </form> : <>
      <div className="wa-etape2" role="status">
        <h3>{T.titre2}</h3>
        <p>{T.explication(maskPhone(destination))}</p>
        <div className="wa-bulle" aria-hidden="true"><span>CODE</span><small>✓✓</small></div>
        <a className="wa-ouvrir" href={lienDemandeCode()} target="_blank" rel="noopener noreferrer"><LogoWhatsApp taille={20} blanc /><span>{T.envoyerCode}</span></a>
      </div>
      <form className="wa-formulaire" onSubmit={verifier} aria-busy={occupe}>
        <label className="wa-champ"><span>{T.code}</span><input className="wa-code" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="······" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required disabled={occupe} /></label>
        <button className="wa-principal" disabled={occupe || !enLigne}>{occupe ? T.verification : creation ? T.validerCreation : T.valider}</button>
      </form>
      <div className="wa-liens">
        <button type="button" className="link" disabled={occupe || !enLigne || attente > 0} onClick={() => void envoyer()}>{attente ? T.renvoyerDans(attente) : T.renvoyer}</button>
        <button type="button" className="link" disabled={occupe} onClick={() => { setDestination(null); setCode(''); setErreur(''); }}>{T.changer}</button>
      </div>
    </>}
    <p className="wa-note">{T.note}{!creation && <> {T.noteEmail}</>}</p>
  </section>;
}
