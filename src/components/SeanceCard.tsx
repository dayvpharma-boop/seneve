import {IconeConfidentialite} from './IconeConfidentialite';
import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { avecLangue } from '@/lib/espace';
import { supabase } from '@/lib/supabase';

type Seance = { numero: number; jour: number; ouverte: boolean; demande: { etat: string; cree_le: string } | null };

export const SEANCE_TEXTES = {
  fr: {
    titre: 'Séance 1-à-1 avec le Dr Justin',
    intro: (total: number) => `Ton accompagnement comprend ${total} séances personnelles.`,
    ouverte: (n: number, j: number) => `Ta séance n° ${n} (prévue au jour ${j}) peut être demandée.`,
    explication: 'Appuie sur le bouton : le Dr Justin recevra ta demande et te contactera pour fixer l’heure.',
    bouton: (n: number) => `Demander ma séance n° ${n}`,
    envoi: 'Envoi…',
    demandee: (n: number) => `Séance n° ${n} demandée. Le Dr Justin te contactera pour fixer l’heure.`,
    suivre: 'Suivre ma demande',
    prochaine: (n: number, j: number) => `Prochaine séance : n° ${n}, au jour ${j}.`,
    toutes: 'Toutes tes séances ont été demandées.',
    erreur: 'Demande non envoyée. Vérifie ta connexion et réessaie.',
    etats: { recue: 'reçue', affectee: 'confiée', en_cours: 'en cours', attente_participant: 'en attente de ta réponse', resolue: 'traitée', annulee: 'annulée' } as Record<string, string>,
    etat: 'État : ',
  },
  en: {
    titre: 'One-to-one session with Dr Justin',
    intro: (total: number) => `Your coaching includes ${total} personal sessions.`,
    ouverte: (n: number, j: number) => `You can now request session ${n} (planned for day ${j}).`,
    explication: 'Tap the button: Dr Justin will receive your request and contact you to set the time.',
    bouton: (n: number) => `Request session ${n}`,
    envoi: 'Sending…',
    demandee: (n: number) => `Session ${n} requested. Dr Justin will contact you to set the time.`,
    suivre: 'Follow my request',
    prochaine: (n: number, j: number) => `Next session: number ${n}, on day ${j}.`,
    toutes: 'All your sessions have been requested.',
    erreur: 'Request not sent. Check your connection and try again.',
    etats: { recue: 'received', affectee: 'assigned', en_cours: 'in progress', attente_participant: 'waiting for your reply', resolue: 'handled', annulee: 'cancelled' } as Record<string, string>,
    etat: 'Status: ',
  },
} as const;

/** Demande de séance 1-à-1 (Accompagnement personnel) : rien n'est promis, le Dr Justin rappelle la personne. */
export function SeanceCard({ enrollmentId, langue }: { enrollmentId: string; langue: string }) {
  const T = SEANCE_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [seances, setSeances] = useState<Seance[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await supabase.rpc('seances_etat', { p_enrollment_id: enrollmentId });
      if (!r.error && r.data) setSeances(((r.data as { seances?: Seance[] }).seances) ?? []);
    } catch { /* la carte reste cachée */ }
  }, [enrollmentId]);
  useEffect(() => { void load(); }, [load]);

  if (!seances || seances.length === 0) return null;
  const aDemander = [...seances].reverse().find(s => s.ouverte && !s.demande);
  const derniereDemandee = [...seances].reverse().find(s => s.demande);
  const prochaine = seances.find(s => !s.ouverte);

  async function demander(n: number) {
    if (busy) return;
    setBusy(true); setError(false);
    const { error } = await supabase.rpc('seance_demander', { p_enrollment_id: enrollmentId, p_numero: n });
    setBusy(false);
    if (error) { setError(true); return; }
    await load();
  }

  return <div className="card">
    <p className="tag"><IconeConfidentialite nom="person"/>{T.titre}</p>
    <p className="muted">{T.intro(seances.length)}</p>
    {aDemander ? <>
      <p>{T.ouverte(aDemander.numero, aDemander.jour)}</p>
      <p className="muted">{T.explication}</p>
      <button type="button" className="btn action-btn" disabled={busy} onClick={() => void demander(aDemander.numero)}><IconeJourneeSuite nom="calendar_month" taille={18}/>{busy ? T.envoi : T.bouton(aDemander.numero)}</button>
    </> : derniereDemandee?.demande ? <>
      <p className="success" role="status">{T.demandee(derniereDemandee.numero)}</p>
      <p className="muted">{T.etat}{T.etats[derniereDemandee.demande.etat] ?? derniereDemandee.demande.etat}</p>
      <Link className="link" to={avecLangue("/aide", langue)}>{T.suivre}</Link>
    </> : null}
    {!aDemander && (prochaine ? <p className="muted">{T.prochaine(prochaine.numero, prochaine.jour)}</p> : derniereDemandee && seances.every(s => s.demande) ? <p className="muted">{T.toutes}</p> : null)}
    {error && <p className="error" role="alert">{T.erreur}</p>}
  </div>;
}
