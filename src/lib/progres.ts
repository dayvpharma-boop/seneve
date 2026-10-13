/** Bilan factuel « Mes progrès » : ce que le participant a enregistré, jour par jour. Aucun score, aucun diagnostic. */
import { dayInfo } from './espace';

export type EtatAction = 'realisee' | 'partielle' | 'preparee' | 'non_commencee';
export type JourBilan = { jour: number; ouvert: boolean; theme: string | null; etat: EtatAction | null; aide: boolean; realiseeLe: string | null };
export type Bilan = {
  joursOuverts: number; duree: number; termine: boolean; pasCommence: boolean;
  realisees: number; partielles: number; preparees: number; aides: number; actionsOuvertes: number;
  jours: JourBilan[]; prochain: number | null;
};

type Contenu = { content_id: string; jour: number; numero_message: number; theme: string };
type Activite = { activity_id: string; content_id: string; type_activite: string };
type Etat = { activity_id: string; etat: string; aide_demandee: boolean; realisee_le: string | null };

/** Construit le bilan d'une inscription à partir des contenus de sa version, de ses actions et des états enregistrés. */
export function bilan(dateDebut: string, duree: number, contenus: Contenu[], activites: Activite[], etats: Etat[], now: Date = new Date()): Bilan {
  const { day, finished, notStarted } = dayInfo(dateDebut, now, duree);
  const joursOuverts = notStarted ? 0 : finished ? duree : day;
  const jours: JourBilan[] = [];
  for (let j = 1; j <= duree; j++) {
    const ducJour = contenus.filter(c => c.jour === j).sort((a, b) => a.numero_message - b.numero_message);
    const ids = new Set(ducJour.map(c => c.content_id));
    const action = activites.find(a => a.type_activite === 'action' && ids.has(a.content_id));
    const e = action ? etats.find(s => s.activity_id === action.activity_id) : undefined;
    const etat = action ? ((e?.etat as EtatAction | undefined) ?? 'non_commencee') : null;
    jours.push({ jour: j, ouvert: j <= joursOuverts, theme: ducJour[0]?.theme ?? null, etat, aide: Boolean(e?.aide_demandee), realiseeLe: e?.realisee_le ?? null });
  }
  const ouverts = jours.filter(x => x.ouvert && x.etat !== null);
  const prochain = ouverts.find(x => x.etat !== 'realisee')?.jour ?? null;
  return {
    joursOuverts, duree, termine: finished, pasCommence: notStarted,
    realisees: ouverts.filter(x => x.etat === 'realisee').length,
    partielles: ouverts.filter(x => x.etat === 'partielle').length,
    preparees: ouverts.filter(x => x.etat === 'preparee').length,
    aides: ouverts.filter(x => x.aide).length,
    actionsOuvertes: ouverts.length,
    jours, prochain,
  };
}

export const PROGRES_TEXTES = {
  fr: {
    locale: 'fr-FR',
    titre: 'Mes progrès',
    retour: 'Retour à mon espace',
    intro: 'Ce bilan reprend uniquement ce que tu as enregistré. Il ne mesure ni ta foi ni ta valeur.',
    joursOuverts: (n: number, d: number) => `${n} jour${n > 1 ? 's' : ''} ouvert${n > 1 ? 's' : ''} sur ${d}`,
    termine: 'Parcours terminé',
    pasCommence: 'Ton parcours n’a pas encore commencé.',
    realisees: (n: number, t: number) => `${n} action${n > 1 ? 's' : ''} réalisée${n > 1 ? 's' : ''} sur ${t}`,
    partielles: (n: number) => `${n} en partie`,
    preparees: (n: number) => `${n} préparée${n > 1 ? 's' : ''}`,
    aides: (n: number) => `${n} avec une aide demandée`,
    notes: (n: number) => `${n} note${n > 1 ? 's' : ''} dans ton journal`,
    prochain: (j: number) => `Prochaine étape : l’action du jour ${j}, quand tu le souhaites.`,
    toutFait: 'Toutes les actions ouvertes sont enregistrées comme réalisées.',
    reprendre: 'Reprendre dans mon espace',
    jour: (n: number) => `Jour ${n}`,
    etats: { realisee: 'Réalisée', partielle: 'Réalisée en partie', preparee: 'Préparée', non_commencee: 'Pas encore enregistrée' } as Record<string, string>,
    aide: 'aide demandée',
    le: ' le ',
    ferme: 'Pas encore ouvert',
    sansAction: 'Pas d’action ce jour-là',
    aucun: 'Aucun parcours pour le moment.',
    chargement: 'Chargement…',
    erreur: 'Impossible de charger ton bilan pour le moment.',
    reessayer: 'Réessayer',
  },
  en: {
    locale: 'en-GB',
    titre: 'My progress',
    retour: 'Back to my space',
    intro: 'This summary only shows what you have recorded. It measures neither your faith nor your worth.',
    joursOuverts: (n: number, d: number) => `${n} of ${d} day${d > 1 ? 's' : ''} open`,
    termine: 'Journey completed',
    pasCommence: 'Your journey has not started yet.',
    realisees: (n: number, t: number) => `${n} of ${t} action${t > 1 ? 's' : ''} completed`,
    partielles: (n: number) => `${n} partly done`,
    preparees: (n: number) => `${n} prepared`,
    aides: (n: number) => `${n} with help requested`,
    notes: (n: number) => `${n} note${n > 1 ? 's' : ''} in your journal`,
    prochain: (j: number) => `Next step: the action of day ${j}, whenever you are ready.`,
    toutFait: 'All open actions are recorded as completed.',
    reprendre: 'Continue in my space',
    jour: (n: number) => `Day ${n}`,
    etats: { realisee: 'Completed', partielle: 'Partly done', preparee: 'Prepared', non_commencee: 'Not recorded yet' } as Record<string, string>,
    aide: 'help requested',
    le: ' on ',
    ferme: 'Not open yet',
    sansAction: 'No action that day',
    aucun: 'No journey yet.',
    chargement: 'Loading…',
    erreur: 'Your summary cannot be loaded right now.',
    reessayer: 'Try again',
  },
} as const;

export function progresTextes(langue: string | null | undefined) {
  return PROGRES_TEXTES[langue === 'en' ? 'en' : 'fr'];
}
