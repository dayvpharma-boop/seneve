import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Suppression d'un compte par un administrateur (règle validée par Dr Justin le 23/10/2026) :
 *  confirmation en retapant l'adresse e-mail de la personne ; les achats restent, sans nom ni e-mail. */
export function SuppressionCompte({ email, onSupprime }: { email: string; onSupprime: () => Promise<void> }) {
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ouvert) champ.current?.focus(); }, [ouvert]);
  const identique = saisie.trim().toLowerCase() === email.trim().toLowerCase();

  async function supprimer() {
    if (!identique || busy) return;
    setBusy(true); setErreur('');
    const { error } = await supabase.rpc('staff_supprimer_compte', { p_email: email, p_confirmation: saisie });
    setBusy(false);
    if (error) { setErreur(error.message || 'La suppression n’a pas abouti. Réessaie.'); return; }
    await onSupprime();
  }

  if (!ouvert) return <button type="button" className="link admin-suppression-ouvrir" onClick={() => setOuvert(true)}>Supprimer ce compte</button>;
  return <div className="admin-suppression" role="group" aria-labelledby="titre-suppression">
    <p className="admin-suppression-titre" id="titre-suppression">Supprimer définitivement ce compte ?</p>
    <p>Seront effacés : le compte de connexion, le prénom, le journal, le coach, l’objectif, la progression, les demandes d’aide, les rappels et la liaison WhatsApp. Les achats restent pour la comptabilité, sans nom ni e-mail.</p>
    <p className="muted">Les sauvegardes de la nuit gardent encore ces données 30 jours. La feuille Google Sheets du système WhatsApp n’est pas modifiée.</p>
    <label className="field"><span>Pour confirmer, tape l’adresse e-mail de la personne</span>
      <input ref={champ} type="email" value={saisie} onChange={e => setSaisie(e.target.value)} autoComplete="off" placeholder={email} />
    </label>
    <button type="button" className="btn admin-suppression-confirmer" disabled={!identique || busy} onClick={() => void supprimer()}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
    <button type="button" className="link" disabled={busy} onClick={() => { setOuvert(false); setSaisie(''); setErreur(''); }}>Annuler</button>
    {erreur && <p className="error" role="alert">{erreur}</p>}
  </div>;
}
