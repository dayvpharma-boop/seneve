import { IllustrationPage } from '@/components/IllustrationPage';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { siteUrl, supabase } from '@/lib/supabase';
import { authError } from './connexion';
import { EnteteRecuperation, lienConnexion } from '@/components/EnteteRecuperation';
import { IconeConnexion } from '@/components/IconeConnexion';
import { IconeRecuperation } from '@/components/IconeRecuperation';

export function ForgotPassword() {
  const [search] = useSearchParams();
  const langue = search.get('lang') === 'en' ? 'en' : 'fr';
  const en = langue === 'en';
  const location = useLocation();
  const initial = (location.state as { email?: unknown } | null)?.email;
  const [email, setEmail] = useState(typeof initial === 'string' ? initial : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const verrou = useRef(false);
  const titre = en ? 'Forgot password' : 'Mot de passe oublié';
  useEffect(() => { document.title = `${titre} — SÉNEVÉ`; document.documentElement.lang = langue; }, [titre, langue]);

  async function envoyer(e?: FormEvent) {
    e?.preventDefault();
    if (verrou.current) return;
    verrou.current = true;
    setBusy(true); setError('');
    try {
      const { error: erreur } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl(`nouveau-mot-de-passe${en ? '?lang=en' : ''}`) });
      if (erreur) { setError(authError(erreur.message, langue)); return; }
      setSent(true);
    } catch { setError(en ? 'Network error. Check your connection and try again.' : 'Erreur réseau. Vérifie ta connexion et réessaie.'); }
    finally { verrou.current = false; setBusy(false); }
  }

  return <main className="wrap connexion auth-maquette recup-page recup-demande">
    <EnteteRecuperation langue={langue} />
    <div className="recup-vignette"><span className="recup-disque"><IconeRecuperation nom="mark_email_unread" taille={24} /></span><div><strong>{en ? 'Security & trust' : 'Sécurité & confiance'}</strong><p>{en ? 'Recover access with a temporary link sent by email.' : 'Récupère ton accès avec un lien temporaire envoyé par e-mail.'}</p></div></div>
    <header className="recup-intro"><p className="recup-repere"><span className="auth-point" />{en ? 'Recover access' : 'Récupération d’accès'}</p><h1>{titre}</h1><p>{en ? 'Enter the email address linked to your account to reset your password.' : 'Saisis l’adresse e-mail associée à ton compte pour réinitialiser ton mot de passe en toute tranquillité.'}</p></header><IllustrationPage theme="securite" />
    {sent ? <section className="recup-confirmation" role="status" aria-labelledby="titre-envoi"><span className="recup-disque"><IconeRecuperation nom="forward_to_inbox" taille={26} /></span><p className="recup-kicker">{en ? 'Request received' : 'Demande prise en compte'}</p><h2 id="titre-envoi">{en ? 'Check your inbox' : 'Consulte ta boîte de réception'}</h2><p>{en ? 'If an account exists for this address, we have sent you an email to choose a new password.' : 'Si un compte existe pour cette adresse, nous t’avons envoyé un e-mail pour choisir un nouveau mot de passe.'}</p><div className="recup-conseil"><IconeRecuperation nom="schedule" /><p>{en ? 'Check your spam folder or wait a moment. If the link has expired, request a new email.' : 'Pense à vérifier tes courriers indésirables ou patiente un instant. Si le lien a expiré, demande un nouvel e-mail.'}</p></div><button type="button" className="recup-secondaire" onClick={() => void envoyer()} disabled={busy}><IconeRecuperation nom="sync" taille={18} />{busy ? (en ? 'Sending…' : 'Envoi en cours…') : (en ? 'Resend email' : 'Renvoyer l’e-mail')}</button></section>
      : <form className="recup-form" onSubmit={envoyer}><div className="auth-field"><label className="field" htmlFor="email-recuperation">{en ? 'Email' : 'E-mail'}</label><span className="auth-hint">{en ? 'Login ID' : 'Identifiant'}</span><div className="auth-input"><IconeRecuperation nom="alternate_email" /><input id="email-recuperation" type="email" autoComplete="email" inputMode="email" placeholder="marie@exemple.com" required value={email} onChange={e => setEmail(e.target.value)} aria-describedby="aide-recuperation" /></div><p className="recup-aide" id="aide-recuperation">{en ? 'Requesting a link does not change your current password.' : 'La demande du lien ne modifie pas ton mot de passe actuel.'}</p></div><button className="btn moment-btn" type="submit" disabled={busy}>{busy ? (en ? 'Sending…' : 'Envoi en cours…') : (en ? 'Receive the link' : 'Recevoir le lien')}<IconeConnexion nom="arrow_forward" taille={18} /></button></form>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="recup-achat"><span><IconeConnexion nom="auto_stories" /></span><div><strong>{en ? 'Did you buy the book or a journey?' : 'Tu as acheté le livre ou un parcours ?'}</strong><p>{en ? 'Use the same email address as for your purchase: it is what opens your access.' : 'Utilise la même adresse e-mail que pour l’achat : c’est elle qui ouvre ton accès.'}</p></div></div>
    <Link className="recup-retour" to={lienConnexion(langue)}><IconeConnexion nom="arrow_back" />{en ? 'Back to sign in' : 'Retour à la connexion'}</Link>
    <footer className="recup-footer"><Link to={en ? '/confidentialite?lang=en' : '/confidentialite'}><IconeRecuperation nom="lock" taille={16} />{en ? 'Privacy' : 'Confidentialité'}</Link><p>{en ? 'Find out how SÉNEVÉ protects your personal data and your journal.' : 'Découvre comment SÉNEVÉ protège tes données personnelles et ton journal.'}</p></footer>
  </main>;
}
