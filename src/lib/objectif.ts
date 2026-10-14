/** Objectif personnel : règles, racines du livre et textes (carte de l'espace). */
import { texts } from './test-texts';

export const OBJECTIF_MIN = 5;
export const OBJECTIF_MAX = 300;
const CLE_TEST = 'seneve:racine_test';

/** Noms des 7 racines, tels que validés pour le Test des 7 Racines (1 à 7 en base). */
export function nomsRacines(langue: string | null | undefined): string[] {
  return texts[langue === 'en' ? 'en' : 'fr'].roots.map(r => r.n);
}

/** Racine retenue au Test des 7 Racines sur cet appareil (0 à 6), jamais envoyée sans action du participant. */
export function memoriserRacineTest(k: number): void {
  try { if (k >= 0 && k <= 6) window.localStorage.setItem(CLE_TEST, String(k)); } catch { /* stockage indisponible */ }
}
export function racineTest(): number | null {
  try {
    const v = window.localStorage.getItem(CLE_TEST);
    const n = v === null ? NaN : Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
  } catch { return null; }
}

export function objectifValide(texte: string): string | null {
  const t = texte.trim();
  return t.length >= OBJECTIF_MIN && t.length <= OBJECTIF_MAX ? t : null;
}

export const OBJECTIF_TEXTES = {
  fr: {
    titre: 'Mon objectif',
    invitation: 'Choisis l’objectif que tu veux poursuivre pendant ton parcours. C’est toi qui le formules ; tu pourras le modifier.',
    conseil: 'Un objectif utile est simple, réaliste pour toi et relié à une action que tu peux observer. Tu n’as pas à raconter ta situation personnelle.',
    exemple: 'Exemple : « Organiser un moment quotidien pour appliquer un principe du parcours. »',
    champ: 'Mon objectif',
    racine: 'Racine liée (facultatif)',
    aucune: 'Aucune en particulier',
    suggestionTest: (nom: string) => `Au Test des 7 Racines, sur cet appareil, tu as retenu : ${nom}.`,
    utiliser: 'La choisir',
    confirmer: 'Confirmer mon objectif',
    choisir: 'Choisir mon objectif',
    enregistrement: 'Enregistrement…',
    modifier: 'Modifier mon objectif',
    annuler: 'Annuler',
    depuis: 'Confirmé le',
    trop: (min: number, max: number) => `Entre ${min} et ${max} caractères.`,
    erreur: 'Objectif non enregistré. Vérifie ta connexion et réessaie.',
    note: 'Le coach peut s’appuyer sur ton objectif pour mieux t’accompagner. L’ancien objectif reste dans ton historique.',
  },
  en: {
    titre: 'My goal',
    invitation: 'Choose the goal you want to pursue during your journey. You write it yourself; you can change it later.',
    conseil: 'A useful goal is simple, realistic for you and linked to an action you can observe. You do not have to describe your personal situation.',
    exemple: 'Example: “Set aside a daily moment to apply a principle from the journey.”',
    champ: 'My goal',
    racine: 'Related root (optional)',
    aucune: 'None in particular',
    suggestionTest: (nom: string) => `In the 7 Roots Test, on this device, you chose: ${nom}.`,
    utiliser: 'Choose it',
    confirmer: 'Confirm my goal',
    choisir: 'Choose my goal',
    enregistrement: 'Saving…',
    modifier: 'Change my goal',
    annuler: 'Cancel',
    depuis: 'Confirmed on',
    trop: (min: number, max: number) => `Between ${min} and ${max} characters.`,
    erreur: 'Goal not saved. Check your connection and try again.',
    note: 'The coach can use your goal to support you better. Your previous goal stays in your history.',
  },
} as const;

export function objectifTextes(langue: string | null | undefined) {
  return OBJECTIF_TEXTES[langue === 'en' ? 'en' : 'fr'];
}
