/** Textes de l'espace, dans la langue du parcours affiché (le contenu du parcours, lui, vient de la base). */
export type Langue = 'fr' | 'en';

export const ESPACE_TEXTES = {
  fr: {
    locale: 'fr-FR',
    commence: (date: string) => `Ton accompagnement commence le ${date}. Le jour 1 s'ouvrira ce jour-là.`,
    termine: (n: number) => `Ce parcours de ${n} jours est terminé. Tu peux relire les ${n} journées.`,
    jourSur: (d: number, n: number) => `Jour ${d} sur ${n}`,
    pause: 'Ce parcours est en pause.',
    jour: (n: number) => `Jour ${n}`,
    jourFerme: (n: number) => `Jour ${n}, pas encore ouvert`,
    ouvreDemain: (n: number) => `Le jour ${n} s'ouvre demain.`,
    dansLeLivre: 'Dans le livre : ',
    question: 'Question pour réfléchir',
    action: 'Ton action du jour',
    realisee: 'Action réalisée',
    le: ' le ',
    bouton: "J'ai réalisé cette action",
    boutonPartie: "Je l'ai faite en partie",
    boutonAide: "J'ai besoin d'aide",
    partielleNotee: 'Noté : tu l’as faite en partie. Tu pourras la terminer quand tu voudras.',
    aideNotee: 'Noté : ta demande d’aide a été transmise à l’équipe d’accompagnement. Tu peux la suivre et y ajouter des précisions.',
    ecrireEquipe: 'Suivre ma demande',
    demanderCoach: 'Demander au coach',
    enregistrement: 'Enregistrement…',
    erreur: 'Non enregistré. Vérifie ta connexion et réessaie.',
  },
  en: {
    locale: 'en-GB',
    commence: (date: string) => `Your journey starts on ${date}. Day 1 will open that day.`,
    termine: (n: number) => `This ${n}-day journey is complete. You can reread all ${n} days.`,
    jourSur: (d: number, n: number) => `Day ${d} of ${n}`,
    pause: 'This journey is paused.',
    jour: (n: number) => `Day ${n}`,
    jourFerme: (n: number) => `Day ${n}, not open yet`,
    ouvreDemain: (n: number) => `Day ${n} opens tomorrow.`,
    dansLeLivre: 'In the book: ',
    question: 'Question to reflect on',
    action: 'Your action for today',
    realisee: 'Action completed',
    le: ' on ',
    bouton: 'I completed this action',
    boutonPartie: 'I did part of it',
    boutonAide: 'I need help',
    partielleNotee: 'Noted: you did part of it. You can finish it whenever you like.',
    aideNotee: 'Noted: your request for help has been passed on to the support team. You can follow it and add details.',
    ecrireEquipe: 'Follow my request',
    demanderCoach: 'Ask the coach',
    enregistrement: 'Saving…',
    erreur: 'Not saved. Check your connection and try again.',
  },
} as const;

export function textes(langue: string | null | undefined) {
  return ESPACE_TEXTES[langue === 'en' ? 'en' : 'fr'];
}

/** Nom court du parcours, dans sa langue. */
export function nomParcours(nom: string, langue: string, duree: number): string {
  if (langue === 'en') return `Book companion — ${duree} days`;
  return nom.replace(/ en français/, '');
}
