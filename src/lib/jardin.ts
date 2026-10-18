/** « Le jardin du sénevé » : une plante qui grandit avec les actions réalisées.
 *  Seules les actions explicitement réalisées comptent. La plante ne recule jamais :
 *  une pause ou une action non faite ne fait rien perdre (reprise sans culpabilité). */
import type { Bilan } from './progres';

export type Stade = 0 | 1 | 2 | 3 | 4 | 5;

/** Stade de 0 (graine) à 5 (arbre). L'arbre n'apparaît qu'une fois toutes les actions du parcours réalisées. */
export function stadeJardin(realisees: number, total: number): Stade {
  if (total <= 0 || realisees <= 0) return 0;
  if (realisees >= total) return 5;
  return Math.max(1, Math.min(4, Math.ceil((4 * realisees) / total))) as Stade;
}

/** Actions réalisées et nombre total d'actions prévues dans tout le parcours (jours avec une action). */
export function compteJardin(b: Bilan): { realisees: number; total: number } {
  return {
    realisees: b.jours.filter(j => j.etat === 'realisee').length,
    total: b.jours.filter(j => j.etat !== null).length,
  };
}

const TEXTES = {
  fr: {
    titre: 'Ton sénevé',
    compte: (n: number, t: number) => `${n} action${n > 1 ? 's' : ''} réalisée${n > 1 ? 's' : ''} sur ${t}`,
    stades: [
      'Ta graine est plantée. Chaque action réalisée la fera grandir.',
      'Une première pousse sort de terre.',
      'Ta pousse prend racine.',
      'Ta plante grandit, action après action.',
      'Ton sénevé devient un arbuste.',
      'Ton sénevé est devenu un arbre.',
    ],
    note: 'Il ne fane jamais : une pause ne te fait rien perdre.',
    illustration: (s: number) => ['Une graine dans la terre', 'Une petite pousse', 'Une jeune pousse avec des feuilles', 'Une plante qui grandit', 'Un arbuste', 'Un arbre'][s]!,
  },
  en: {
    titre: 'Your mustard seed',
    compte: (n: number, t: number) => `${n} of ${t} action${t > 1 ? 's' : ''} completed`,
    stades: [
      'Your seed is planted. Each action you complete will help it grow.',
      'A first shoot is coming up.',
      'Your shoot is taking root.',
      'Your plant is growing, one action at a time.',
      'Your mustard seed is becoming a shrub.',
      'Your mustard seed has become a tree.',
    ],
    note: 'It never withers: taking a break costs you nothing.',
    illustration: (s: number) => ['A seed in the ground', 'A small shoot', 'A young shoot with leaves', 'A growing plant', 'A shrub', 'A tree'][s]!,
  },
};

export const jardinTextes = (langue?: string) => TEXTES[langue === 'en' ? 'en' : 'fr'];
