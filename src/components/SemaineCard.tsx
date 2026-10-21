import {IconeJourneeSuite} from './IconeJourneeSuite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { semaineTextes, type Semaine } from '@/lib/progres';

/** Bilan de fin de semaine : uniquement les actions enregistrées, sans jugement. */
export function SemaineCard({ semaine, langue, horsLigne = false }: { semaine: Semaine; langue: string; horsLigne?: boolean }) {
  const T = semaineTextes(langue);
  const [objectif, setObjectif] = useState<string | null>(null);
  useEffect(() => {
    if (horsLigne) return;
    void Promise.resolve(supabase.from('goals').select('texte').eq('etat', 'confirme').maybeSingle())
      .then(r => { const t = (r?.data as { texte?: string } | null)?.texte; if (t) setObjectif(t); })
      .catch(() => undefined);
  }, [horsLigne]);

  return <section className="card semaine-card" aria-label={T.titre(semaine.numero)}>
    <p className="tag"><IconeJourneeSuite nom="insights"/>{T.titre(semaine.numero)}</p>
    <p className="muted">{T.jours(semaine.de, semaine.a)}</p>
    {semaine.applicables === 0 ? <p>{T.nonEvalue}</p> : <ul className="bilan-list">
      <li><strong>{T.realisees(semaine.realisees, semaine.applicables)}</strong></li>
      {semaine.partielles > 0 && <li>{T.partielles(semaine.partielles)}</li>}
      {semaine.aides > 0 && <li>{T.aides(semaine.aides)}</li>}
    </ul>}
    {objectif && <p>{T.objectif(objectif)}</p>}
    <p>{T.journal}</p>
    {!horsLigne && <Link className="btn btn-link" to="/journal">{T.ouvrirJournal}</Link>}
    <p className="muted">{T.note}</p>
  </section>;
}
