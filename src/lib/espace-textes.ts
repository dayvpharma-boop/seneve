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
    boutonPartie: "Je l'ai faite en partie",
    boutonAide: "J'ai besoin d'aide",
    partielleNotee: 'Noté : tu l’as faite en partie. Tu pourras la terminer quand tu voudras.',
    aideNotee: 'Noté : ta demande d’aide a été transmise à l’équipe d’accompagnement. Tu peux la suivre et y ajouter des précisions.',
    ecrireEquipe: 'Suivre ma demande',
    demanderCoach: 'Demander au coach',
    enregistrement: 'Enregistrement…',
    erreur: 'Non enregistré. Vérifie ta connexion et réessaie.',
    moment: (n: number, heure: string | null) => heure ? `${heureFr(heure)}` : `Moment ${n}`,
    momentFerme: (heure: string) => `Ce moment s’ouvre à ${heureFr(heure)} (heure de Kinshasa).`,
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
    boutonPartie: 'I did part of it',
    boutonAide: 'I need help',
    partielleNotee: 'Noted: you did part of it. You can finish it whenever you like.',
    aideNotee: 'Noted: your request for help has been passed on to the support team. You can follow it and add details.',
    ecrireEquipe: 'Follow my request',
    demanderCoach: 'Ask the coach',
    enregistrement: 'Saving…',
    erreur: 'Not saved. Check your connection and try again.',
    moment: (n: number, heure: string | null) => heure ? heure : `Moment ${n}`,
    momentFerme: (heure: string) => `This moment opens at ${heure} (Kinshasa time).`,
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
