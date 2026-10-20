import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Icone } from '@/components/Icone';
import { offresSuivantes, prixAffiche, programmesSuivants, SUITE_TEXTES, type Offre } from '@/lib/suite';

/** « Et après ? » : affichée le dernier jour d'un parcours et après sa fin. Rien n'est acheté ni ouvert automatiquement. */
export function SuiteCard({ programmeId, langue, dejaInscrit }: { programmeId: string; langue: string; dejaInscrit: string[] }) {
  const T = SUITE_TEXTES[langue === 'en' ? 'en' : 'fr'];
  const [offres, setOffres] = useState<Offre[] | null>(null);
  const [masquee, setMasquee] = useState(false);
  const cle = dejaInscrit.join(',');
  useEffect(() => {
    const suivants = programmesSuivants(programmeId);
    if (!suivants.length) { setOffres([]); return; }
    void Promise.resolve(supabase.from('offers').select('offre_id, produit, type_offre, langue, programme_id, prix, devise, lien_achat').in('programme_id', suivants).eq('actif', true))
      .then(r => setOffres(r?.error ? [] : offresSuivantes(programmeId, (r?.data ?? []) as Offre[], cle ? cle.split(',') : [])))
      .catch(() => setOffres([]));
  }, [programmeId, cle]);

  if (!offres || offres.length === 0 || masquee) return null;
  // Mise en page de la maquette validée « Parcours accompli » (étape suivante) : offres réelles du catalogue, sans contenu inventé.
  const en = langue === 'en';
  return <section className="card fp-suite" aria-label={T.titre}>
    <div className="fp-ligne"><p className="fp-etiquette">{T.titre}</p><span className="fp-suivante">{en ? 'Next step' : 'Étape suivante'}</span></div>
    <p className="fp-suite-intro">{T.intro}</p>
    <ul className="fp-offres" role="list">
      {offres.map(o => <li key={o.offre_id} className="fp-offre">
        <span className="fp-offre-icone" aria-hidden="true"><Icone nom="livre" taille={18} /></span>
        <div className="fp-offre-texte">
          <p><strong>{o.produit}</strong>{o.type_offre && !o.produit.toLowerCase().includes(o.type_offre.toLowerCase()) ? ` (${o.type_offre})` : ''}{prixAffiche(o, langue) ? ` — ${prixAffiche(o, langue)}` : ''}</p>
          {o.lien_achat
            ? <a className="btn btn-fleche fp-voir" href={o.lien_achat} target="_blank" rel="noopener noreferrer">{T.voir}<Icone nom="fleche" taille={18} /></a>
            : <p className="fp-bientot">{T.bientot}</p>}
        </div>
      </li>)}
    </ul>
    <p className="fp-libre">{T.libre}</p>
    <button type="button" className="fp-plus-tard" onClick={() => setMasquee(true)}>{en ? 'Not now' : 'Pas maintenant'}</button>
  </section>;
}
