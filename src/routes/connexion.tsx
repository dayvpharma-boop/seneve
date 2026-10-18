import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { siteUrl, supabase } from '@/lib/supabase';
import { Icone } from '@/components/Icone';

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
  if (m.includes('rate limit')) return E.limite;
  if (m.includes('password')) return E.mdp;
  return E.autre;
}

// Textes de la page (anglais validé par Dr Justin Tshims le 18/10/2026).
const TEXTES = {
  fr: {
    titre: 'Ton espace', onglet: 'Mon espace', intro: 'Ton parcours du jour, ton journal et tes progrès, au même endroit.',
    creer: 'Créer un compte', connecter: 'Se connecter', prenom: 'Ton prénom', email: 'E-mail', mdp: 'Mot de passe',
    achat: 'Tu as acheté le livre ou un parcours\u00A0? Utilise la même adresse e-mail que pour l’achat\u00A0: c’est elle qui ouvre ton accès.',
    afficher: 'Afficher', masquer: 'Masquer', aideMdp: 'Au moins 8 caractères.', patienter: 'Un instant…', oubli: 'Mot de passe oublié ?',
    envoye: "Nous t'avons envoyé un e-mail. Ouvre-le et clique sur le lien pour confirmer ton adresse, puis reviens te connecter.",
    oubliSansEmail: 'Indique ton e-mail ci-dessus, puis appuie sur « Mot de passe oublié ? ».',
    oubliEnvoye: "Si un compte existe pour cette adresse, nous t'avons envoyé un e-mail pour choisir un nouveau mot de passe.",
    age: 'En créant un compte, tu confirmes avoir au moins 18\u00A0ans. ', confidentialite: 'Comment nous protégeons tes données',
    autreLangue: 'English', titrePage: 'Mon espace — SÉNEVÉ',
  },
  en: {
    titre: 'Your space', onglet: 'Your space', intro: 'Your daily journey, your journal and your progress, all in one place.',
    creer: 'Create an account', connecter: 'Sign in', prenom: 'Your first name', email: 'Email', mdp: 'Password',
    achat: 'Did you buy the book or a journey? Use the same email address as for your purchase: it is what opens your access.',
    afficher: 'Show', masquer: 'Hide', aideMdp: 'At least 8 characters.', patienter: 'Just a moment…', oubli: 'Forgot your password?',
    envoye: 'We have sent you an email. Open it and click the link to confirm your address, then come back to sign in.',
    oubliSansEmail: 'Enter your email above, then tap “Forgot your password?”.',
    oubliEnvoye: 'If an account exists for this address, we have sent you an email to choose a new password.',
    age: 'By creating an account, you confirm that you are at least 18 years old. ', confidentialite: 'How we protect your data (in French)',
    autreLangue: 'Français', titrePage: 'Your space — SÉNEVÉ',
  },
};

export function Connexion() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const langue: 'fr' | 'en' = search.get('lang') === 'en' ? 'en' : 'fr';
  const T = TEXTES[langue];
  useEffect(() => { document.title = T.titrePage; document.documentElement.lang = langue; }, [T, langue]);
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [voir, setVoir] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    if (password.length < 8) { setError(ERREURS[langue].mdp); return; }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: siteUrl('espace'), data: { prenom: prenom.trim() } },
        });
        if (error) { setError(authError(error.message, langue)); return; }
        if (data.user && data.user.identities?.length === 0) { setError(ERREURS[langue].deja); return; }
        if (!data.session) { setInfo(T.envoye); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(authError(error.message, langue)); return; }
      }
      navigate('/espace');
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : 'network', langue));
    } finally { setBusy(false); }
  }

  async function forgot() {
    setError(''); setInfo('');
    if (!email) { setError(T.oubliSansEmail); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl('nouveau-mot-de-passe') });
      if (error) { setError(authError(error.message, langue)); return; }
      setInfo(T.oubliEnvoye);
    } catch { setError(ERREURS[langue].reseau); }
  }

  function choose(next: 'signup' | 'signin') { setTab(next); setError(''); setInfo(''); }

  // Style de l'écran « Aujourd'hui » (validé le 15/10/2026) : choix en deux parties, champs bien visibles,
  // rappel « même adresse que pour l'achat » à l'inscription, mot de passe qu'on peut afficher.
  return <main className="wrap connexion">
    <header className="today-head"><div><p className="brand">SÉNEVÉ</p><h1>{T.titre}</h1></div><Link className="link language-link" to={langue === 'en' ? '/connexion' : '/connexion?lang=en'}>{T.autreLangue}</Link></header>
    <p className="connexion-intro">{T.intro}</p>
    <div className="choix-double" role="tablist" aria-label={T.onglet}>
      <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => choose('signup')}>{T.creer}</button>
      <button type="button" role="tab" aria-selected={tab === 'signin'} onClick={() => choose('signin')}>{T.connecter}</button>
    </div>
    <form className="card form connexion-form" onSubmit={submit}>
      {tab === 'signup' && <label className="field">{T.prenom}<input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required /></label>}
      <label className="field">{T.email}<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required /></label>
      {tab === 'signup' && <p className="connexion-achat"><Icone nom="livre" taille={20} />{T.achat}</p>}
      <label className="field" htmlFor="mot-de-passe">{T.mdp}</label>
      <div className="champ-mdp">
        <input id="mot-de-passe" type={voir ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} aria-describedby={tab === 'signup' ? 'aide-mdp' : undefined} required />
        <button type="button" className="mdp-voir" aria-controls="mot-de-passe" aria-pressed={voir} onClick={() => setVoir(v => !v)}>{voir ? T.masquer : T.afficher}</button>
      </div>
      {tab === 'signup' && <p className="muted connexion-aide" id="aide-mdp">{T.aideMdp}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="connexion-info" role="status">{info}</p>}
      <button className="btn moment-btn" type="submit" disabled={busy}>{busy ? T.patienter : tab === 'signup' ? T.creer : T.connecter}</button>
      {tab === 'signin' && <button type="button" className="link connexion-oubli" onClick={forgot}>{T.oubli}</button>}
    </form>
    <p className="muted connexion-legal">{tab === 'signup' ? T.age : ''}<Link className="link-inline" to="/confidentialite">{T.confidentialite}</Link></p>
  </main>;
}
