import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { authError } from './connexion';
import { EnteteRecuperation } from '@/components/EnteteRecuperation';
import { IconeConnexion } from '@/components/IconeConnexion';
import './recuperation-moderne.css';
import {useEnLigne} from '@/lib/hors-ligne';
import { IconeRecuperation } from '@/components/IconeRecuperation';

export function NewPassword() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const enLigne = useEnLigne();
  const langue = search.get('lang') === 'en' ? 'en' : 'fr';
  const en = langue === 'en';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmationInvalide, setConfirmationInvalide] = useState(false);
  const [voirConfirmation, setVoirConfirmation] = useState(false);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [voir, setVoir] = useState(false);
  const verrou = useRef(false);
  const titre = en ? 'New password' : 'Nouveau mot de passe';
  useEffect(() => { document.title = `${titre} — SÉNEVÉ`; document.documentElement.lang = langue; }, [titre, langue]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (verrou.current || !enLigne) return;
    setError('');
    if (password.length < 8) { setError(en ? 'The password must contain at least 8 characters.' : 'Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirmation) { setConfirmationInvalide(true); confirmationRef.current?.focus(); return; }
    setConfirmationInvalide(false);
    verrou.current = true; setBusy(true);
    try {
      const { error: erreur } = await supabase.auth.updateUser({ password });
      if (erreur) { setError(/expired|session/i.test(erreur.message) ? (en ? 'The link has expired. Request another email from “Forgot password?”.' : 'Le lien a expiré. Redemande un e-mail depuis « Mot de passe oublié ? ».') : /token|invalid.*link|link.*invalid|invalid.*otp/i.test(erreur.message) ? (en ? 'This link is invalid. Request a new link to continue.' : 'Ce lien est invalide. Demande un nouveau lien pour continuer.') : authError(erreur.message, langue)); return; }
      setPassword(''); setConfirmation(''); setDone(true);
    } catch { setError(en ? 'Network error. Check your connection and try again.' : 'Erreur réseau. Vérifie ta connexion et réessaie.'); }
    finally { verrou.current = false; setBusy(false); }
  }

  return <main className="wrap connexion auth-maquette recup-page recup-nouveau">
    <EnteteRecuperation langue={langue} nouveau />
    <section className="recup-shell">
    <span className="recup-disque recup-entete-icone"><IconeRecuperation nom="lock" taille={24}/></span>
    <header className="recup-intro"><h1>{titre}</h1><p>{en ? 'Choose a new password to return to your space and your journal.' : 'Définis un nouveau mot de passe pour retrouver ton espace et ton journal.'}</p></header>
    {!enLigne && !done && <p className="recup-offline" role="status">{en ? 'You are offline. Reconnect to save your new password.' : 'Tu es hors connexion. Reconnecte-toi pour enregistrer ton nouveau mot de passe.'}</p>}
    {done ? <section className="recup-succes" aria-labelledby="titre-succes"><div className="recup-sceau"><IconeRecuperation nom="spa" taille={32} /><span><IconeRecuperation nom="check" taille={14} /></span></div><p className="recup-kicker"><IconeRecuperation nom="verified" taille={14} />{en ? 'Password updated' : 'Mot de passe modifié'}</p><h2 id="titre-succes">{en ? 'Peace on your path' : 'Paix sur ton chemin'}</h2><p role="status">{en ? 'Your password has been changed.' : 'Ton mot de passe a été modifié.'}</p><button type="button" className="btn moment-btn" onClick={() => navigate(en ? '/espace?lang=en' : '/espace')}>{en ? 'Go to my space' : 'Aller à mon espace'}<IconeConnexion nom="arrow_forward" taille={18} /></button></section>
      : <form className="recup-form" onSubmit={submit} aria-busy={busy}>
        <div className="recup-password-carte"><div className="auth-field"><label className="field" htmlFor="nouveau-password">{titre}</label><span className="auth-hint">{password.length >= 8 ? (en ? 'Minimum met' : 'Conforme') : password.length ? (en ? `${8 - password.length} more` : `${8 - password.length} restants`) : (en ? 'Required' : 'Requis')}</span><div className="auth-input champ-mdp"><IconeRecuperation nom="lock" /><input id="nouveau-password" placeholder="••••••••••••" type={voir ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete="new-password" aria-describedby="regle-password" required /><button type="button" className="mdp-voir" aria-controls="nouveau-password" aria-pressed={voir} onClick={() => setVoir(v => !v)}>{voir ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</button></div></div><p className={`recup-regle${password.length >= 8 ? ' is-valid' : ''}`} id="regle-password"><span><IconeRecuperation nom="check" taille={13} /></span>{en ? 'At least 8 characters' : 'Au moins 8 caractères'}</p><div className="auth-field recup-confirm-field"><label className="field" htmlFor="confirmation-password">{en ? 'Confirm new password' : 'Confirmer le nouveau mot de passe'}</label><div className="auth-input champ-mdp"><IconeRecuperation nom="lock" /><input ref={confirmationRef} id="confirmation-password" placeholder="••••••••••••" type={voirConfirmation ? 'text' : 'password'} value={confirmation} onChange={e => { setConfirmation(e.target.value); setConfirmationInvalide(false); }} minLength={8} autoComplete="new-password" required aria-invalid={confirmationInvalide} aria-describedby={confirmationInvalide ? 'erreur-confirmation' : undefined} /><button type="button" className="mdp-voir" aria-label={voirConfirmation ? (en ? 'Hide confirmation' : 'Masquer la confirmation') : (en ? 'Show confirmation' : 'Afficher la confirmation')} aria-controls="confirmation-password" aria-pressed={voirConfirmation} onClick={() => setVoirConfirmation(v => !v)}>{voirConfirmation ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</button></div></div>{confirmationInvalide && <p className="error recup-confirm-erreur" id="erreur-confirmation" role="alert">{en ? 'The two passwords do not match.' : 'Les deux mots de passe ne correspondent pas.'}</p>}<div className="recup-conseil"><span className="recup-petite-graine"><IconeRecuperation nom="grain" taille={16} /></span><p>{en ? 'Choose a unique password that you do not use elsewhere.' : 'Choisis un mot de passe unique, que tu n’utilises pas ailleurs.'}</p></div></div>
        {error && <div className="recup-erreur"><p className="error" role="alert">{error}</p></div>}
        <button className="btn moment-btn" type="submit" disabled={busy || !enLigne}>{busy ? (en ? 'Saving…' : 'Un instant…') : (en ? 'Save' : 'Enregistrer')}<IconeConnexion nom="arrow_forward" taille={18} /></button>
      </form>}
    {!done && <Link className="recup-demander" to={`/mot-de-passe-oublie${en ? '?lang=en' : ''}`}>{en ? 'Request a new link' : 'Demander un nouveau lien'}</Link>}
    </section>
    <aside className="recup-protection"><span><IconeRecuperation nom="lock_clock" taille={18} /></span><div><strong>{en ? 'Protecting your space' : 'Protection de ton espace'}</strong><p>{en ? 'Your password protects access to your space and your journal.' : 'Ton mot de passe protège l’accès à ton espace et à ton journal.'}</p></div></aside>
    <div className="recup-decor" aria-hidden="true"><span /><IconeRecuperation nom="all_inclusive" taille={14} /><span /></div>
  </main>;
}
