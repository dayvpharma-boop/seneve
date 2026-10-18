import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { siteUrl, supabase } from '@/lib/supabase';
import { Icone } from '@/components/Icone';

export function authError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return 'Cette adresse est déjà utilisée. Connecte-toi.';
  if (m.includes('email not confirmed')) return "Ton adresse n'est pas encore confirmée. Ouvre l'e-mail reçu et clique sur le lien.";
  if (m.includes('fetch') || m.includes('network')) return 'Erreur réseau. Vérifie ta connexion et réessaie.';
  if (m.includes('rate limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.';
  if (m.includes('password')) return 'Le mot de passe doit contenir au moins 8 caractères.';
  return "Une erreur s'est produite. Réessaie.";
}

export function Connexion() {
  const navigate = useNavigate();
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
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: siteUrl('espace'), data: { prenom: prenom.trim() } },
        });
        if (error) { setError(authError(error.message)); return; }
        if (data.user && data.user.identities?.length === 0) { setError('Cette adresse est déjà utilisée. Connecte-toi.'); return; }
        if (!data.session) { setInfo("Nous t'avons envoyé un e-mail. Ouvre-le et clique sur le lien pour confirmer ton adresse, puis reviens te connecter."); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(authError(error.message)); return; }
      }
      navigate('/espace');
    } catch (err) {
      setError(authError(err instanceof Error ? err.message : 'network'));
    } finally { setBusy(false); }
  }

  async function forgot() {
    setError(''); setInfo('');
    if (!email) { setError('Indique ton e-mail ci-dessus, puis appuie sur « Mot de passe oublié ? ».'); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl('nouveau-mot-de-passe') });
      if (error) { setError(authError(error.message)); return; }
      setInfo("Si un compte existe pour cette adresse, nous t'avons envoyé un e-mail pour choisir un nouveau mot de passe.");
    } catch { setError('Erreur réseau. Vérifie ta connexion et réessaie.'); }
  }

  function choose(next: 'signup' | 'signin') { setTab(next); setError(''); setInfo(''); }

  // Style de l'écran « Aujourd'hui » (validé le 15/10/2026) : choix en deux parties, champs bien visibles,
  // rappel « même adresse que pour l'achat » à l'inscription, mot de passe qu'on peut afficher.
  return <main className="wrap connexion">
    <header className="today-head"><div><p className="brand">SÉNEVÉ</p><h1>Ton espace</h1></div></header>
    <p className="connexion-intro">Ton parcours du jour, ton journal et tes progrès, au même endroit.</p>
    <div className="choix-double" role="tablist" aria-label="Ton espace">
      <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => choose('signup')}>Créer un compte</button>
      <button type="button" role="tab" aria-selected={tab === 'signin'} onClick={() => choose('signin')}>Se connecter</button>
    </div>
    <form className="card form connexion-form" onSubmit={submit}>
      {tab === 'signup' && <label className="field">Ton prénom<input value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" required /></label>}
      <label className="field">E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" required /></label>
      {tab === 'signup' && <p className="connexion-achat"><Icone nom="livre" taille={20} />{'Tu as acheté le livre ou un parcours\u00A0? Utilise la même adresse e-mail que pour l’achat\u00A0: c’est elle qui ouvre ton accès.'}</p>}
      <label className="field" htmlFor="mot-de-passe">Mot de passe</label>
      <div className="champ-mdp">
        <input id="mot-de-passe" type={voir ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} aria-describedby={tab === 'signup' ? 'aide-mdp' : undefined} required />
        <button type="button" className="mdp-voir" aria-controls="mot-de-passe" aria-pressed={voir} onClick={() => setVoir(v => !v)}>{voir ? 'Masquer' : 'Afficher'}</button>
      </div>
      {tab === 'signup' && <p className="muted connexion-aide" id="aide-mdp">Au moins 8 caractères.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {info && <p className="connexion-info" role="status">{info}</p>}
      <button className="btn moment-btn" type="submit" disabled={busy}>{busy ? 'Un instant…' : tab === 'signup' ? 'Créer un compte' : 'Se connecter'}</button>
      {tab === 'signin' && <button type="button" className="link connexion-oubli" onClick={forgot}>Mot de passe oublié ?</button>}
    </form>
    <p className="muted connexion-legal">{tab === 'signup' ? 'En créant un compte, tu confirmes avoir au moins 18\u00A0ans. ' : ''}<Link className="link-inline" to="/confidentialite">Comment nous protégeons tes données</Link></p>
  </main>;
}
