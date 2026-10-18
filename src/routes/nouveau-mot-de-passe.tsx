import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { langueMemorisee, langueValide, type Langue } from '@/lib/langue';
import { authError } from './connexion';

const TEXTES = {
  fr: {
    titrePage: 'Nouveau mot de passe — SÉNEVÉ', titre: 'Nouveau mot de passe', champ: 'Nouveau mot de passe',
    court: 'Le mot de passe doit contenir au moins 8 caractères.', expire: 'Le lien a expiré. Redemande un e-mail depuis « Mot de passe oublié ? ».',
    reseau: 'Erreur réseau. Vérifie ta connexion et réessaie.', fait: 'Ton mot de passe a été modifié.', espace: 'Aller à mon espace',
    unInstant: 'Un instant…', enregistrer: 'Enregistrer',
  },
  en: {
    titrePage: 'New password — SÉNEVÉ', titre: 'New password', champ: 'New password',
    court: 'The password must contain at least 8 characters.', expire: 'The link has expired. Ask for a new email with “Forgot your password?”.',
    reseau: 'Network error. Check your connection and try again.', fait: 'Your password has been changed.', espace: 'Go to my space',
    unInstant: 'Just a moment…', enregistrer: 'Save',
  },
} as const;

export function NewPassword() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  // Langue : ?lang=en, sinon le choix gardé dans le compte (lien reçu par e-mail), sinon celle de cet appareil.
  const [langue, setLangue] = useState<Langue>(() => langueValide(search.get('lang')) ?? langueMemorisee());
  useEffect(() => {
    if (search.get('lang')) return;
    void Promise.resolve(supabase.auth.getSession()).then(r => {
      const l = langueValide(r?.data?.session?.user?.user_metadata?.['langue']);
      if (l) setLangue(l);
    }).catch(() => undefined);
  }, [search]);
  const T = TEXTES[langue];
  useEffect(() => { document.title = T.titrePage; document.documentElement.lang = langue; }, [T, langue]);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError(T.court); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message.toLowerCase().includes('session') ? T.expire : authError(error.message, langue)); return; }
      setDone(true);
    } catch { setError(T.reseau); }
    finally { setBusy(false); }
  }

  return <main className="wrap">
    <p className="brand">SÉNEVÉ</p>
    <h1>{T.titre}</h1>
    {done ? <div className="card"><p className="info" role="status">{T.fait}</p><button type="button" className="btn action-btn" onClick={() => navigate('/espace')}>{T.espace}</button></div>
      : <form className="card form" onSubmit={submit}>
        <label className="field">{T.champ}<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? T.unInstant : T.enregistrer}</button>
      </form>}
  </main>;
}
