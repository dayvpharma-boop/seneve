import type { EchangeAide } from '@/lib/admin';
import { formatDateHeure } from '@/lib/journal';

/** Échange d'une demande d'aide vu par l'équipe : chaque réponse enregistrée et chaque réponse du participant, dans l'ordre. */
export function EchangesDemande({ messages }: { messages?: EchangeAide[] | null }) {
  if (!messages?.length) return null;
  return <section className="admin-echanges" aria-label="Échanges avec le participant">
    <p className="admin-echanges-titre">Échanges avec le participant</p>
    {messages.map((m, i) => <div key={i} className={`admin-echange admin-echange-${m.auteur}`}>
      <p className="admin-echange-qui">{m.auteur === 'participant' ? 'Réponse du participant' : 'Réponse de l’équipe'} · {formatDateHeure(m.cree_le, 'fr-FR')}</p>
      <p className="admin-echange-texte">{m.texte}</p>
    </div>)}
  </section>;
}
