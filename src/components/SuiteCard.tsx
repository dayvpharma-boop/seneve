import { Link } from 'react-router-dom';
import { IconeFin } from '@/components/IconeFin';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { offresSuivantes, prixAffiche, programmesSuivants, SUITE_TEXTES, type Offre } from '@/lib/suite';

/** « Et après ? » : affichée le dernier jour d'un parcours et après sa fin. Rien n'est acheté ni ouvert automatiquement. */
export function SuiteCard({ programmeId, langue, dejaInscrit, maquette = false }: { programmeId: string; langue: string; dejaInscrit: string[]; maquette?: boolean }) {
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
  if(maquette) { const en=langue==='en'; return <section className="fin-suite" aria-label={T.titre}><div className="fin-suite-repere"><span>{en?'Next step':'Étape suivante'}</span></div><h2>{T.titre}</h2><p>{T.intro}</p>{offres.map((o,i)=><article key={o.offre_id} className="fin-offre"><h3>{o.produit}{o.type_offre&&!o.produit.toLowerCase().includes(o.type_offre.toLowerCase())?` (${o.type_offre})`:''}</h3><div className="fin-prix"><IconeFin nom="auto_stories" taille={20}/><span>{prixAffiche(o,langue) || (en?'See the offer details':'Consulte le détail de l’offre')}</span></div>{o.lien_achat?<a className={i===0?'fin-principal':'fin-secondaire'} href={o.lien_achat} target="_blank" rel="noopener noreferrer">{T.voir}<IconeFin nom="arrow_forward" taille={18}/></a>:<p className="muted">{T.bientot}</p>}</article>)}<ul className="fin-points"><li><IconeFin nom="nature" taille={18}/><span>{en?'Continue reading and practising':'Poursuivre la lecture et la pratique'}</span></li><li><IconeFin nom="lock" taille={18}/><span>{en?'Keep writing in your journal':'Continuer à écrire dans ton journal'}</span></li><li><IconeFin nom="temp_preferences_custom" taille={18}/><span>{en?'Ask the support team for help':'Demander de l’aide à l’équipe'}</span></li></ul><p className="fin-libre">{T.libre}</p><Link className="fin-secondaire" to="/journal">{en?'Not now · Stay with my reflections':'Pas maintenant · Rester sur mes réflexions'}</Link></section>; }
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
