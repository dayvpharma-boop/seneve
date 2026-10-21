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

export type Semaine = { numero: number; de: number; a: number; complete: boolean; applicables: number; realisees: number; partielles: number; aides: number };

/** Bilan hebdomadaire (cahier des charges) : semaines de 7 jours depuis le début du parcours, à partir des seules actions enregistrées. */
export function semaines(b: Bilan): Semaine[] {
  const out: Semaine[] = [];
  for (let de = 1; de <= b.duree; de += 7) {
    const a = Math.min(de + 6, b.duree);
    const jours = b.jours.filter(j => j.jour >= de && j.jour <= a);
    if (!jours.some(j => j.ouvert)) break;
    const ouverts = jours.filter(j => j.ouvert && j.etat !== null);
    out.push({
      numero: (de - 1) / 7 + 1, de, a, complete: jours.every(j => j.ouvert),
      applicables: ouverts.length,
      realisees: ouverts.filter(j => j.etat === 'realisee').length,
      partielles: ouverts.filter(j => j.etat === 'partielle').length,
      aides: ouverts.filter(j => j.aide).length,
    });
  }
  return out;
}

/** Semaine à mettre en avant dans l'espace : le dernier jour d'une semaine et le jour suivant. */
export function semaineDuJour(b: Bilan, jourCalendaire: number): Semaine | null {
  if (b.pasCommence) return null;
  return semaines(b).find(x => x.complete && (jourCalendaire === x.a || jourCalendaire === x.a + 1)) ?? null;
}

/** Seuil validé par Dr Justin (14/10/2026) : 3 jours ouverts sans aucune action enregistrée. */
export const SEUIL_REPRISE_JOURS = 3;

/**
 * Aide à la reprise : renvoie le jour à reprendre si, depuis le dernier jour où une action a été enregistrée,
 * au moins SEUIL_REPRISE_JOURS jours se sont ouverts sans aucune action enregistrée. Aucune interprétation : seulement des dates.
 */
export function jourDeReprise(b: Bilan, jourCalendaire: number): number | null {
  if (b.pasCommence || b.termine || jourCalendaire > b.duree) return null;
  const enregistre = (j: JourBilan) => j.etat !== null && (j.etat !== 'non_commencee' || j.aide);
  const dernier = b.jours.filter(j => j.ouvert && enregistre(j)).reduce((m, j) => Math.max(m, j.jour), 0);
  const silencieux = b.jours.filter(j => j.ouvert && j.jour > dernier && j.etat !== null);
  if (jourCalendaire - dernier - 1 < SEUIL_REPRISE_JOURS || silencieux.length === 0) return null;
  return silencieux[0]!.jour;
}

/** Seuil validé par Dr Justin (16/10/2026) : 2 actions de suite non réalisées. */
export const SEUIL_OBSTACLE_ACTIONS = 2;

/**
 * « Qu'est-ce qui t'a freiné ? » : les 2 dernières actions des jours passés (le jour en cours n'est pas compté,
 * la personne peut encore agir aujourd'hui) ne sont ni réalisées, ni faites en partie, sans aide demandée.
 * Renvoie la clé de la série (ex. « 4-5 ») pour ne poser la question qu'une fois.
 */
export function serieObstacle(b: Bilan, jourCalendaire: number): string | null {
  if (b.pasCommence || b.termine) return null;
  const passes = b.jours.filter(j => j.ouvert && j.etat !== null && j.jour < jourCalendaire);
  const derniers = passes.slice(-SEUIL_OBSTACLE_ACTIONS);
  if (derniers.length < SEUIL_OBSTACLE_ACTIONS) return null;
  const nonFaite = (j: JourBilan) => (j.etat === 'non_commencee' || j.etat === 'preparee') && !j.aide;
  return derniers.every(nonFaite) ? derniers.map(j => j.jour).join('-') : null;
}

export const OBSTACLE_TEXTES = {
  fr: {
    titre: 'Qu’est-ce qui t’a freiné ces derniers jours ?',
    motifs: { temps: 'Je n’ai pas eu le temps', compris: 'Je n’ai pas bien compris l’action', difficile: 'L’action me paraît trop difficile', personnel: 'Une situation personnelle', autre: 'Autre chose' } as Record<string, string>,
    envoyer: 'Envoyer',
    plusTard: 'Pas maintenant',
    envoi: 'Envoi…',
    merci: 'Merci. Reprends quand tu peux, à ton rythme.',
    coachTexte: 'Le coach peut t’expliquer l’action et la découper en petits pas.',
    coach: 'Parler au coach',
    aideTexte: 'Tu peux en parler à l’équipe d’accompagnement.',
    aide: 'Demander de l’aide',
    erreur: 'Réponse non envoyée. Vérifie ta connexion et réessaie.',
    prive: 'Ta réponse reste privée : elle sert seulement à mieux t’accompagner.',
  },
  en: {
    titre: 'What held you back these last days?',
    motifs: { temps: 'I didn’t have the time', compris: 'I didn’t really understand the action', difficile: 'The action seems too hard', personnel: 'A personal situation', autre: 'Something else' } as Record<string, string>,
    envoyer: 'Send',
    plusTard: 'Not now',
    envoi: 'Sending…',
    merci: 'Thank you. Pick it up again whenever you can, at your own pace.',
    coachTexte: 'The coach can explain the action and break it into small steps.',
    coach: 'Talk to the coach',
    aideTexte: 'You can talk about it with the support team.',
    aide: 'Ask for help',
    erreur: 'Answer not sent. Check your connection and try again.',
    prive: 'Your answer stays private: it is only used to support you better.',
  },
} as const;

export const REPRISE_TEXTES = {
  fr: {
    titre: (p: string) => p ? `Content de te revoir, ${p} 🌱` : 'Content de te revoir 🌱',
    texte: (j: number) => `Tu peux reprendre là où tu t’es arrêté : l’action du jour ${j}.`,
    bouton: (j: number) => `Reprendre au jour ${j}`,
    aide: 'Si quelque chose t’a bloqué, tu peux le dire au coach ou demander de l’aide.',
    coach: 'Parler au coach',
    demander: 'Demander de l’aide',
  },
  en: {
    titre: (p: string) => p ? `Good to see you again, ${p} 🌱` : 'Good to see you again 🌱',
    texte: (j: number) => `You can pick up where you left off: the action of day ${j}.`,
    bouton: (j: number) => `Resume at day ${j}`,
    aide: 'If something held you back, you can tell the coach or ask for help.',
    coach: 'Talk to the coach',
    demander: 'Ask for help',
  },
} as const;

export const SEMAINE_TEXTES = {
  fr: {
    titre: (n: number) => `Ta semaine ${n} en bref`,
    jours: (de: number, a: number) => `Jours ${de} à ${a}`,
    realisees: (n: number, t: number) => `Actions réalisées : ${n} sur ${t}`,
    partielles: (n: number) => `Faites en partie : ${n}`,
    aides: (n: number) => `Aide demandée : ${n}`,
    nonEvalue: 'Non évalué : aucune action prévue cette semaine.',
    objectif: (t: string) => `Ton objectif : « ${t} »`,
    journal: 'Prends 5 minutes pour écrire ton bilan dans ton journal.',
    ouvrirJournal: 'Écrire mon bilan',
    note: 'Ce bilan reprend uniquement ce que tu as enregistré.',
    titreListe: 'Semaine par semaine',
    enCours: 'en cours',
  },
  en: {
    titre: (n: number) => `Your week ${n} at a glance`,
    jours: (de: number, a: number) => `Days ${de} to ${a}`,
    realisees: (n: number, t: number) => `Actions completed: ${n} of ${t}`,
    partielles: (n: number) => `Partly done: ${n}`,
    aides: (n: number) => `Help requested: ${n}`,
    nonEvalue: 'Not evaluated: no action planned this week.',
    objectif: (t: string) => `Your goal: “${t}”`,
    journal: 'Take 5 minutes to write your review in your journal.',
    ouvrirJournal: 'Write my review',
    note: 'This summary only shows what you have recorded.',
    titreListe: 'Week by week',
    enCours: 'in progress',
  },
} as const;

export function semaineTextes(langue: string | null | undefined) {
  return SEMAINE_TEXTES[langue === 'en' ? 'en' : 'fr'];
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
    fermes: 'Pas encore ouverts',
    jours: (a: number, b: number) => `Jours ${a} à ${b}`,
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
    fermes: 'Not open yet',
    jours: (a: number, b: number) => `Days ${a} to ${b}`,
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
