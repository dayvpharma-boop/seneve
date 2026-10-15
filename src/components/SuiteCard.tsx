import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { offresSuivantes, prixAffiche, programmesSuivants, SUITE_TEXTES, type Offre } from '@/lib/suite';

/** « Et après ? » : affichée le dernier jour d'un parcours et après sa fin. Rien n'est acheté ni ouvert automatiquement. */
export function SuiteCard({ programmeId, langue, dejaInscrit }: { programmeId: string; langue: string; dejaInscrit: string[] }) {
  const T = SUITE_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [offres, setOffres] = useState<Offre[] | null>(null);
  const cle = dejaInscrit.join(',');
  useEffect(() => {
    const suivants = programmesSuivants(programmeId);
    if (!suivants.length) { setOffres([]); return; }
    void Promise.resolve(supabase.from('offers').select('offre_id, produit, type_offre, langue, programme_id, prix, devise, lien_achat').in('programme_id', suivants).eq('actif', true))
      .then(r => setOffres(r?.error ? [] : offresSuivantes(programmeId, (r?.data ?? []) as Offre[], cle ? cle.split(',') : [])))
      .catch(() => setOffres([]));
  }, [programmeId, cle]);

  if (!offres || offres.length === 0) return null;
  return <section className="card" aria-label={T.titre}>
    <p className="tag">{T.titre}</p>
    <p>{T.intro}</p>
    <ul className="bilan-list">
      {offres.map(o => <li key={o.offre_id}>
        <strong>{o.produit}</strong>{o.type_offre && !o.produit.toLowerCase().includes(o.type_offre.toLowerCase()) ? ` (${o.type_offre})` : ''}{prixAffiche(o, langue) ? ` — ${prixAffiche(o, langue)}` : ''}
        {o.lien_achat ? <> · <a className="link" href={o.lien_achat} target="_blank" rel="noopener noreferrer">{T.voir}</a></> : <span className="muted"> · {T.bientot}</span>}
      </li>)}
    </ul>
    <p className="muted">{T.libre}</p>
  </section>;
}
