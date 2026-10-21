import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDateHeure } from '@/lib/journal';
import { lienWhatsApp } from '@/lib/admin';
import { OBSTACLE_TEXTES } from '@/lib/progres';

type Frein = { cree_le: string; motif: string; prenom: string | null; langue: string | null; programme_id: string | null; email: string | null; whatsapp: string | null };
const ORDRE = ['temps', 'compris', 'difficile', 'personnel', 'autre', 'plus_tard'] as const;
const LIBELLE: Record<string, string> = { ...OBSTACLE_TEXTES.fr.motifs, plus_tard: '« Pas maintenant »' };

/** Réponses « Qu'est-ce qui t'a freiné ? » (90 derniers jours). Coordonnées visibles par l'administrateur seulement. */
export function FreinsAdmin({ admin }: { admin: boolean }) {
  const [liste, setListe] = useState<Frein[] | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    void Promise.resolve(supabase.rpc('staff_list_obstacles'))
      .then(r => { if (r?.error) setErreur(true); else setListe((r?.data ?? []) as Frein[]); })
      .catch(() => setErreur(true));
  }, []);

  const personnels = (liste ?? []).filter(f => f.motif === 'personnel');
  return <section className="card" aria-label="Ce qui freine les participants">
    <p className="tag">Ce qui freine les participants</p>
    <p className="muted">Réponses à la question posée après 2 actions non réalisées (90 derniers jours). Ce sont des réponses déclarées, pas un jugement.</p>
    {erreur ? <p role="alert">Impossible de charger ces réponses pour le moment.</p>
      : !liste ? <p className="muted">Chargement…</p>
      : liste.length === 0 ? <p className="muted">Aucune réponse pour le moment.</p>
      : <>
        <ul className="bilan-list">
          {ORDRE.map(m => { const n = liste.filter(f => f.motif === m).length; return n > 0 && <li key={m}>{LIBELLE[m]} : <strong>{n}</strong></li>; })}
        </ul>
        {admin && personnels.length > 0 && <>
          <p><strong>« Une situation personnelle »</strong> — personnes qu’il peut être utile de contacter :</p>
          <ul className="bilan-list">
            {personnels.map((f, k) => <li key={`${f.cree_le}-${k}`}>
              {f.prenom || 'Sans prénom'} · {formatDateHeure(f.cree_le, 'fr-FR')}{f.programme_id ? ` · ${f.programme_id}` : ''}
              {f.email && <> · <a className="link" href={`mailto:${f.email}`}>{f.email}</a></>}
              {f.whatsapp && <> · <a className="link" href={lienWhatsApp(f.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}
            </li>)}
          </ul>
        </>}
        {!admin && <p className="muted">Les noms et coordonnées sont visibles par l’administrateur.</p>}
      </>}
  </section>;
}
