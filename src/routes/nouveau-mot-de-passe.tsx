import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { authError } from './connexion';

export function NewPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message.toLowerCase().includes('session') ? 'Le lien a expiré. Redemande un e-mail depuis « Mot de passe oublié ? ».' : authError(error.message)); return; }
      setDone(true);
    } catch { setError('Erreur réseau. Vérifie ta connexion et réessaie.'); }
    finally { setBusy(false); }
  }

  return <main className="wrap">
    <p className="brand">SÉNEVÉ</p>
    <h1>Nouveau mot de passe</h1>
    {done ? <div className="card"><p className="info" role="status">Ton mot de passe a été modifié.</p><button type="button" className="btn action-btn" onClick={() => navigate('/espace')}>Aller à mon espace</button></div>
      : <form className="card form" onSubmit={submit}>
        <label className="field">Nouveau mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Un instant…' : 'Enregistrer'}</button>
      </form>}
  </main>;
}
