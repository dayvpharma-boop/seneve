/** Copie hors connexion de la journée Habitudes & Défis (décision de Dr Justin du 29/10/2026 : « Lire et noter »).
 * Une seule journée par inscription et par compte : activités publiées, horaires et états de cette journée.
 * Jamais le compteur privé, le journal, les défis ni l'historique. Effacée à la déconnexion. */
import type { JourRecette } from './habitudes-jour-recette';
import { calendrierHabitudes } from './habitudes-calendrier';

const PREFIXE = 'seneve:habitudes:copie:v1:';

export type CopieJourHd = { le: string; enrollmentId: string; participantId: string; dateLocale: string; fuseau: string; finExclue: string | null; data: JourRecette };

export function enregistrerCopieJourHd(userId: string, copie: Omit<CopieJourHd, 'le'>, maintenant = new Date()): void {
  try { localStorage.setItem(`${PREFIXE}${userId}:${copie.enrollmentId}`, JSON.stringify({ ...copie, le: maintenant.toISOString() } satisfies CopieJourHd)); }
  catch { /* stockage indisponible : pas de copie */ }
}

/** Copies utilisables maintenant : même compte, journée encore en cours dans le fuseau du participant, accès non terminé. */
export function copiesJourHdValides(userId: string, maintenant = Date.now()): CopieJourHd[] {
  const out: CopieJourHd[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(`${PREFIXE}${userId}:`)) continue;
      const c = JSON.parse(localStorage.getItem(k) ?? 'null') as CopieJourHd | null;
      if (!c || typeof c.le !== 'string' || !c.data || !Array.isArray(c.data.activites)) continue;
      if (c.finExclue && Date.parse(c.finExclue) <= maintenant) continue;
      let aujourdhui: string | null = null;
      try { aujourdhui = calendrierHabitudes('2000-01-01', 1, c.fuseau, new Date(maintenant)).date_locale; } catch { aujourdhui = null; }
      if (aujourdhui !== c.dateLocale) continue;
      out.push(c);
    }
  } catch { return []; }
  return out;
}

/** À la déconnexion : aucune copie Habitudes ne reste sur l'appareil. */
export function effacerCopiesJourHd(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXE)) localStorage.removeItem(k);
    }
  } catch { /* rien */ }
}
