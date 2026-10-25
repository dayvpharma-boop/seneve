/** Textes de l'espace, dans la langue du parcours affiché (le contenu du parcours, lui, vient de la base). */
export type Langue = 'fr' | 'en';

export const ESPACE_TEXTES = {
  fr: {
    locale: 'fr-FR',
    commence: (date: string) => `Ton accompagnement commence le ${date}. Le jour 1 s'ouvrira ce jour-là.`,
    termine: (n: number) => `Ce parcours de ${n} jours est terminé. Tu peux relire les ${n} journées.`,
    jourSur: (d: number, n: number) => `Jour ${d} sur ${n}`,
    pause: 'Ce parcours est en pause.',
    horsLigne: (le: string) => `Tu n’as pas de connexion. Tu peux relire tes journées (copie du ${le}). Les actions et le coach reviendront avec le réseau.`,
    cloture: 'Ce parcours est terminé : les actions sont fermées. Tes journées, ton journal et tes progrès restent enregistrés, tu peux tout relire.',
    jour: (n: number) => `Jour ${n}`,
    jourFerme: (n: number) => `Jour ${n}, pas encore ouvert`,
    ouvreDemain: (n: number) => `Le jour ${n} s'ouvre demain.`,
    dansLeLivre: 'Dans le livre : ',
    sources: 'Sources : ',
    carnet: 'Carnet de bord : ',
    livre: 'Livre : ',
    guide: 'Guide de l’accompagnement : ',
    question: 'Question pour réfléchir',
    action: 'Ton action du jour',
    realisee: 'Action réalisée',
    le: ' le ',
    bouton: "J'ai réalisé cette action",
    boutonPrepa: "Je l'ai préparée",
    boutonPartie: "Je l'ai faite en partie",
    boutonAide: "J'ai besoin d'aide",
    prepareeNotee: 'Noté : tu l’as préparée. Elle n’est pas encore comptée comme réalisée : reviens le dire quand tu l’auras faite.',
    partielleNotee: 'Noté : tu l’as faite en partie. Tu pourras la terminer quand tu voudras.',
    aideNotee: 'Noté : ta demande d’aide a été transmise à l’équipe d’accompagnement. Tu peux la suivre et y ajouter des précisions.',
    ecrireEquipe: 'Suivre ma demande',
    demanderCoach: 'Demander au coach',
    enregistrement: 'Enregistrement…',
    erreur: 'Non enregistré. Vérifie ta connexion et réessaie.',
    moment: (n: number, heure: string | null) => heure ? `${heureFr(heure)}` : `Moment ${n}`,
    momentFerme: (heure: string) => `Ce moment s’ouvre à ${heureFr(heure)} (heure de Kinshasa).`,
    tousLesJours: 'Voir tous les jours',
    reglages: 'Mes réglages',
    plusLoin: 'Pour aller plus loin',
    // Écran « Aujourd'hui » validé le 15/10/2026 (fusion référence Dribbble + essai Stitch).
    taJournee: 'Ta journée',
    parcoursDecouverte: 'Parcours Découverte',
    progressionHebdomadaire: 'Progression hebdomadaire',
    actionsSemaine: (n: number, total: number) => total ? `${n} / ${total} actions réalisées` : 'Aucune action prévue',
    nombreMoments: (n: number) => n === 1 ? '1 message' : `${n} moments`,
    journalPrive: 'Tes notes sont privées. Les notes enregistrées sont conservées dans ton espace. Tu choisis celles que tu partages.',
    lireEtAgir: 'Lire et agir',
    lire: 'Lire',
    ecrireJournal: 'Écrire dans mon journal',
    ecrireReflexion: 'Écrire ma réflexion',
    auj: 'Auj.',
    aujourdhui: 'aujourd’hui',
    hier: 'hier',
    jourFait: (n: number) => `Jour ${n}, action réalisée`,
    jourAujourdhui: (n: number) => `Jour ${n}, aujourd’hui`,
    periodes: { matin: 'Matin', midi: 'Midi', soir: 'Soir' },
    retour: 'Retour',
    // Onglets des parcours (participant inscrit à plusieurs parcours) — traduits le 25/10/2026.
    mesParcours: 'Mes parcours',
    ongletAVenir: 'À venir',
    ongletPause: 'En pause',
    ongletTermine: 'Terminé',
    ongletJour: (n: number) => `Jour ${n} en cours`,
    // Écran du jour identique en anglais (25/10/2026) : mêmes repères courts qu’en français.
    jourCourt: (n: number) => `J${n}`,
    nombreEtapes: (n: number) => n === 1 ? '1 étape' : `${n} étapes`,
  },
  en: {
    locale: 'en-GB',
    commence: (date: string) => `Your journey starts on ${date}. Day 1 will open that day.`,
    termine: (n: number) => `This ${n}-day journey is complete. You can reread all ${n} days.`,
    jourSur: (d: number, n: number) => `Day ${d} of ${n}`,
    pause: 'This journey is paused.',
    horsLigne: (le: string) => `You are offline. You can reread your days (copy from ${le}). Actions and the coach will come back with the network.`,
    cloture: 'This journey has ended: actions are closed. Your days, journal and progress stay saved, and you can reread everything.',
    jour: (n: number) => `Day ${n}`,
    jourFerme: (n: number) => `Day ${n}, not open yet`,
    ouvreDemain: (n: number) => `Day ${n} opens tomorrow.`,
    dansLeLivre: 'In the book: ',
    sources: 'Sources: ',
    carnet: 'Journal: ',
    livre: 'Book: ',
    guide: 'Coaching guide: ',
    question: 'Question to reflect on',
    action: 'Your action for today',
    realisee: 'Action completed',
    le: ' on ',
    bouton: 'I completed this action',
    boutonPrepa: "I've prepared it",
    boutonPartie: 'I did part of it',
    boutonAide: 'I need help',
    prepareeNotee: 'Noted: you have prepared it. It is not counted as completed yet: come back and say so once you have done it.',
    partielleNotee: 'Noted: you did part of it. You can finish it whenever you like.',
    aideNotee: 'Noted: your request for help has been passed on to the support team. You can follow it and add details.',
    ecrireEquipe: 'Follow my request',
    demanderCoach: 'Ask the coach',
    enregistrement: 'Saving…',
    erreur: 'Not saved. Check your connection and try again.',
    moment: (n: number, heure: string | null) => heure ? heure : `Moment ${n}`,
    momentFerme: (heure: string) => `This moment opens at ${heure} (Kinshasa time).`,
    tousLesJours: 'See all days',
    reglages: 'My settings',
    plusLoin: 'Going further',
    taJournee: 'Your day',
    parcoursDecouverte: 'Discovery journey',
    progressionHebdomadaire: 'Weekly progress',
    actionsSemaine: (n: number, total: number) => total ? `${n} / ${total} actions completed` : 'No actions scheduled',
    nombreMoments: (n: number) => n === 1 ? '1 message' : `${n} moments`,
    journalPrive: 'Your notes are private. Saved notes are kept in your space. You choose which ones to share.',
    lireEtAgir: 'Read and act',
    lire: 'Read',
    ecrireJournal: 'Write in my journal',
    ecrireReflexion: 'Write my reflection',
    auj: 'Today',
    aujourdhui: 'today',
    hier: 'yesterday',
    jourFait: (n: number) => `Day ${n}, action completed`,
    jourAujourdhui: (n: number) => `Day ${n}, today`,
    periodes: { matin: 'Morning', midi: 'Midday', soir: 'Evening' },
    retour: 'Back',
    mesParcours: 'My journeys',
    ongletAVenir: 'Upcoming',
    ongletPause: 'Paused',
    ongletTermine: 'Completed',
    ongletJour: (n: number) => `Day ${n} in progress`,
    jourCourt: (n: number) => `D${n}`,
    nombreEtapes: (n: number) => n === 1 ? '1 step' : `${n} steps`,
  },
} as const;

/** « 13:00 » → « 13 h » ; « 08:30 » → « 8 h 30 ». */
function heureFr(heure: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(heure);
  if (!m) return heure;
  const h = String(Number(m[1]));
  return m[2] === '00' ? `${h} h` : `${h} h ${m[2]}`;
}

export function textes(langue: string | null | undefined) {
  return ESPACE_TEXTES[langue === 'en' ? 'en' : 'fr'];
}

/** Nom court du parcours, dans sa langue. */
export function nomParcours(nom: string, langue: string, duree: number): string {
  // Parcours anglais : le suivi du livre porte un nom français dans la base, les formations un nom anglais.
  if (langue === 'en') return /livre|book/i.test(nom) || !nom.trim() ? `Book companion — ${duree} days` : nom;
  return nom.replace(/ en français/, '');
}

/** Référence affichée sous le texte du jour. Les contenus des formations notent « C : » (carnet de bord)
 *  et « L : » (livre) : on écrit ces sources en clair au lieu de tout présenter comme « Dans le livre ». */
export function referenceAffichee(ref: string, langue: string | null | undefined): string {
  const T = textes(langue);
  const r = ref.trim();
  if (!/^[CG]\s*:/.test(r) && !/(^|[.;]\s*)[LG]\s*:/.test(r)) return T.dansLeLivre + r;
  const parts = r.split(/(?:^|(?<=[.;])\s*)(?=[CLG]\s*:)/).map(x => x.trim()).filter(Boolean);
  const lisible = parts.map(x => x.replace(/^C\s*:\s*/, T.carnet).replace(/^L\s*:\s*/, T.livre).replace(/^G\s*:\s*/, T.guide).replace(/[.;]\s*$/, ''));
  return T.sources + lisible.join(' — ');
}
