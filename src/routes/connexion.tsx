import { useEffect, useState, type FormEvent } from 'react';
import { BoutonsConnexionSociale } from '@/components/BoutonsConnexionSociale';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { siteUrl, supabase } from '@/lib/supabase';
import { IconeConnexion } from '@/components/IconeConnexion';
import { Icone } from '@/components/Icone';
import { PenseeLivre } from '@/components/RepereParcours';
import {habitudesActivees} from '@/lib/habitudes-configuration';

const ERREURS = {
  fr: {
    login: 'E-mail ou mot de passe incorrect.', deja: 'Cette adresse est déjà utilisée. Connecte-toi.',
    confirm: "Ton adresse n'est pas encore confirmée. Ouvre l'e-mail reçu et clique sur le lien.",
    reseau: 'Erreur réseau. Vérifie ta connexion et réessaie.', limite: 'Trop de tentatives. Réessaie dans quelques minutes.',
    mdp: 'Le mot de passe doit contenir au moins 8 caractères.', autre: "Une erreur s'est produite. Réessaie.",
  },
  en: {
    login: 'Incorrect email or password.', deja: 'This address is already in use. Please sign in.',
    confirm: 'Your address is not confirmed yet. Open the email you received and click the link.',
    reseau: 'Network error. Check your connection and try again.', limite: 'Too many attempts. Try again in a few minutes.',
    mdp: 'The password must contain at least 8 characters.', autre: 'Something went wrong. Please try again.',
  },
};

export function authError(message: string | undefined, langue: 'fr' | 'en' = 'fr'): string {
  const E = ERREURS[langue];
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login')) return E.login;
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return E.deja;
  if (m.includes('email not confirmed')) return E.confirm;
  if (m.includes('fetch') || m.includes('network')) return E.reseau;
  // « For security purposes, you can only request this after N seconds » : envois d'e-mail trop rapprochés.
  if (m.includes('rate limit') || m.includes('for security purposes') || m.includes('only request this after')) return E.limite;
  if (m.includes('password')) return E.mdp;
  return E.autre;
}

// Textes de la page (anglais validé par Dr Justin Tshims le 18/10/2026).
const TEXTES = {
  fr: {
    titre: 'Ton espace', onglet: 'Mon espace', intro: 'Tes lectures, tes actions et ton journal pour mettre en pratique les principes du Royaume au quotidien.',
    creer: 'Créer un compte', connecter: 'Se connecter', prenom: 'Ton prénom', email: 'E-mail', mdp: 'Mot de passe',
    achat: 'Tu as acheté le livre ou un parcours\u00A0? Utilise la même adresse e-mail que pour l’achat\u00A0: c’est elle qui ouvre ton accès.',
    afficher: 'Afficher', masquer: 'Masquer', aideMdp: 'Au moins 8 caractères.', patienter: 'Un instant…', oubli: 'Mot de passe oublié ?',
    envoye: "Nous t'avons envoyé un e-mail. Ouvre-le et clique sur le lien pour confirmer ton adresse, puis reviens te connecter.",
    oubliSansEmail: 'Indique ton e-mail ci-dessus, puis appuie sur « Mot de passe oublié ? ».',
    oubliEnvoye: "Si un compte existe pour cette adresse, nous t'avons envoyé un e-mail pour choisir un nouveau mot de passe.",
    age: 'En créant un compte, tu confirmes avoir au moins 18\u00A0ans. ', confidentialite: 'Comment nous protégeons tes données',
    autreLangue: 'English', titrePage: 'Mon espace — SÉNEVÉ',
    pasEncore: 'Pas encore de compte ?', securite: 'Connexion sécurisée · Données privées et préservées',
    renvoyer: "Renvoyer l'e-mail de confirmation", renvoyerDans: (s: number) => `Renvoyer l'e-mail de confirmation (${s} s)`,
    renvoye: (e: string) => `Nouvel e-mail envoyé à ${e}. Pense à regarder aussi dans les courriers indésirables.`,
  },
  en: {
    titre: 'Your space', onglet: 'Your space', intro: 'Your readings, actions and journal to put Kingdom principles into practice in everyday life.',
    creer: 'Create an account', connecter: 'Sign in', prenom: 'Your first name', email: 'Email', mdp: 'Password',
    achat: 'Did you buy the book or a journey? Use the same email address as for your purchase: it is what opens your access.',
    afficher: 'Show', masquer: 'Hide', aideMdp: 'At least 8 characters.', patienter: 'Just a moment…', oubli: 'Forgot your password?',
    envoye: 'We have sent you an email. Open it and click the link to confirm your address, then come back to sign in.',
    oubliSansEmail: 'Enter your email above, then tap “Forgot your password?”.',
    oubliEnvoye: 'If an account exists for this address, we have sent you an email to choose a new password.',
    age: 'By creating an account, you confirm that you are at least 18 years old. ', confidentialite: 'How we protect your data',
    autreLangue: 'Français', titrePage: 'Your space — SÉNEVÉ',
    pasEncore: 'Don’t have an account yet?', securite: 'Secure connection · Your data stays private and protected',
    renvoyer: 'Resend the confirmation email', renvoyerDans: (s: number) => `Resend the confirmation email (${s} s)`,
    renvoye: (e: string) => `New email sent to ${e}. Please also check your spam folder.`,
  },
};

export function Connexion() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const langue: 'fr' | 'en' = search.get('lang') === 'en' ? 'en' : 'fr';
  // Intention fermée : aucune URL fournie par la requête n'est utilisée comme destination.
  const suiteHabitudes=habitudesActivees()&&search.get('suite')==='habitudes';
  const T = TEXTES[langue];
  useEffect(() => { document.title = T.titrePage; document.documentElement.lang = langue; }, [T, langue]);
  const [tab, setTab] = useState<'signup' | 'signin'>(() => search.get('mode') === 'signin' ? 'signin' : 'signup');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [voir, setVoir] = useState(false);
  // Adresse en attente de confirmation : on peut redemander l'e-mail, une fois par minute au plus.
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [attente, setAttente] = useState(0);
  const [renvoi, setRenvoi] = useState(false);
  useEffect(() => {
    if (attente <= 0) return;
    const t = window.setTimeout(() => setAttente(a => a - 1), 1000);
    return () => window.clearTimeout(t);
  }, [attente]);

  async function renvoyer() {
    if (!aConfirmer || renvoi || attente > 0) return;
    setRenvoi(true); setError(''); setInfo('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: aConfirmer, options: { emailRedirectTo: siteUrl('espace') } });
      if (error) { setError(authError(error.message, langue)); return; }
      setInfo(T.renvoye(aConfirmer)); setAttente(60);
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : 'network', langue));
    } finally { setRenvoi(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setInfo(''); setAConfirmer(null);
    if (password.length < 8) { setError(ERREURS[langue].mdp); return; }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          // Inscription sur la page anglaise : la langue est gardée dans le compte, l'espace s'ouvre en anglais
          // après le lien de confirmation (l'adresse de retour reste celle autorisée dans Supabase).
          options: { emailRedirectTo: siteUrl('espace'), data: langue === 'en' ? { prenom: prenom.trim(), langue: 'en' } : { prenom: prenom.trim() } },
        });
        if (error) { setError(authError(error.message, langue)); return; }
        if (data.user && data.user.identities?.length === 0) { setError(ERREURS[langue].deja); return; }
        if (!data.session) { setInfo(T.envoye); setAConfirmer(email); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(authError(error.message, langue));
          if ((error.message ?? '').toLowerCase().includes('email not confirmed')) setAConfirmer(email);
          return;
        }
      }
      const retour = location.state?.retourJournal ?? location.state?.retour;
      // Connexion faite sur la page anglaise : l'espace s'ouvre en anglais.
      navigate(typeof retour === 'string' && /^\/(?:journal|admin)(?:\?|$)/.test(retour) ? retour : suiteHabitudes ? `/habitudes/inscription?lang=${langue}` : langue === 'en' ? '/espace?lang=en' : '/espace', { replace: true, state: { citationBiblique: location.state?.citationBiblique } });
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : 'network', langue));
    } finally { setBusy(false); }
  }

  function forgot() {
    navigate(`/mot-de-passe-oublie${langue === 'en' ? '?lang=en' : ''}`, { state: { email } });
  }

  function choose(next: 'signup' | 'signin') { setTab(next); setError(''); setInfo(''); setAConfirmer(null); }

  return <main className={`wrap connexion auth-maquette auth-${tab}`}>
    <header className="auth-header">
      <Link className="auth-back" to="/" aria-label={langue === 'en' ? 'Back to the test' : 'Revenir au test'}><IconeConnexion nom="arrow_back" taille={22} /></Link>
      <span className="auth-brand"><Icone nom="graine" taille={22} /><strong>SÉNEVÉ</strong></span>
      <Link className="auth-language" to={(langue === 'en' ? '/connexion?lang=fr' : '/connexion?lang=en')+(suiteHabitudes?`&mode=${tab}&suite=habitudes`:'')}><IconeConnexion nom="language" taille={16} /><span>{T.autreLangue}</span><IconeConnexion nom="expand_more" taille={16} /></Link>
    </header>
    <div className="auth-intro">
      <p className="auth-repere">{tab === 'signup' ? <IconeConnexion nom="bookmark" taille={14} /> : <span className="auth-point" />}{langue === 'en' ? 'One step each day' : 'Un pas chaque jour'}</p>
      <h1>{T.titre}</h1><p className="connexion-intro">{T.intro}</p>
    </div>
    <div className="choix-double" role="tablist" aria-label={T.onglet}>
      <button id="auth-signup" type="button" role="tab" aria-selected={tab === 'signup'} aria-controls="auth-form" onClick={() => choose('signup')}>{tab === 'signup' && <IconeConnexion nom="person_add" taille={18} />}{T.creer}</button>
      <button id="auth-signin" type="button" role="tab" aria-selected={tab === 'signin'} aria-controls="auth-form" onClick={() => choose('signin')}>{tab === 'signup' && <IconeConnexion nom="login" taille={18} />}{T.connecter}</button>
    </div>
    <BoutonsConnexionSociale langue={langue === 'en' ? 'en' : 'fr'} />
    <form id="auth-form" className="card form connexion-form" onSubmit={submit} aria-labelledby={`auth-${tab}`}>
      {tab === 'signup' && <div className="auth-field"><label className="field" htmlFor="auth-prenom">{T.prenom}</label><span className="auth-hint">{langue === 'en' ? 'Required' : 'Requis'}</span><div className="auth-input"><IconeConnexion nom="badge" /><input id="auth-prenom" placeholder={langue === 'en' ? 'e.g. Mary' : 'ex. Marie'} value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required /></div></div>}
      <div className="auth-field"><label className="field" htmlFor="auth-email">{T.email}</label>{tab === 'signup' && <span className="auth-hint">{langue === 'en' ? 'Login ID' : 'Identifiant'}</span>}<div className="auth-input">{tab === 'signup' && <IconeConnexion nom="mail" />}<input id="auth-email" placeholder="marie@exemple.com" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required /></div></div>
      <div className="connexion-password auth-field">
        <label className="field" htmlFor="mot-de-passe">{T.mdp}</label>
        <div className="champ-mdp auth-input">
          {tab === 'signup' && <IconeConnexion nom="key" />}
          <input id="mot-de-passe" placeholder="••••••••" type={voir ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} aria-describedby={tab === 'signup' ? 'aide-mdp' : undefined} required />
          <button type="button" className="mdp-voir" aria-controls="mot-de-passe" aria-pressed={voir} onClick={() => setVoir(v => !v)}>{tab === 'signup' && <IconeConnexion nom={voir ? 'visibility_off' : 'visibility'} taille={18} />}{voir ? T.masquer : T.afficher}</button>
        </div>
        {tab === 'signup' && <p className="muted connexion-aide" id="aide-mdp"><IconeConnexion nom="info" taille={15} />{T.aideMdp}</p>}
        {tab === 'signin' && <button type="button" className="link connexion-oubli" onClick={forgot}>{T.oubli}</button>}
      </div>
      <p className="connexion-achat"><span className="auth-achat-icon"><IconeConnexion nom={tab === 'signup' ? 'auto_stories_filled' : 'auto_stories'} taille={20} /></span><span>{T.achat}</span></p>
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="connexion-info" role="status">{info}</p>}
      {aConfirmer && aConfirmer === email && <button type="button" className="link connexion-renvoi" disabled={renvoi || attente > 0} onClick={() => void renvoyer()}><IconeConnexion nom="mail" taille={16} />{attente > 0 ? T.renvoyerDans(attente) : renvoi ? T.patienter : T.renvoyer}</button>}
      <button className="btn moment-btn" type="submit" disabled={busy}>{busy ? T.patienter : tab === 'signup' ? T.creer : T.connecter}{tab === 'signup' ? <IconeConnexion nom="arrow_forward" taille={18} /> : <IconeConnexion nom="east" taille={18} />}</button>
    </form>
    <div className="connexion-suite">
      {tab === 'signin' && <p className="connexion-inscription"><span>{T.pasEncore}</span><button type="button" onClick={() => choose('signup')}>{T.creer}</button></p>}
      <p className="connexion-securite"><IconeConnexion nom={tab === 'signup' ? 'shield_lock' : 'verified_user'} taille={16} /><span>{T.securite}</span></p>
    </div>
    <p className="muted connexion-legal">{tab === 'signup' ? T.age : ''}<Link className="link-inline" to={langue === 'en' ? '/confidentialite?lang=en' : '/confidentialite'}>{T.confidentialite}<IconeConnexion nom="open_in_new" taille={14} /></Link></p>
    {tab === 'signup' ? <aside className="auth-rythme"><span><IconeConnexion nom="spa" taille={20} /></span><div><strong>{langue === 'en' ? 'An unhurried rhythm' : 'Un rythme sans précipitation'}</strong><p>{langue === 'en' ? 'Take time to put each teaching into practice.' : 'Prends le temps de mettre chaque enseignement en pratique.'}</p></div></aside> : <div className="auth-pensee"><span className="auth-pensee-icone"><IconeConnexion nom="bookmark_heart" taille={24} /></span><PenseeLivre langue={langue} /></div>}
  </main>;
}
