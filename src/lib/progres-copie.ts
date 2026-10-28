/** Copie hors connexion de la page Progrès (décision du 28/10/2026) : seulement des nombres et l'état des jours.
 * Aucun texte du journal, aucune consigne, aucune donnée Habitudes & Défis. Effacée à la déconnexion. */
import type { Bilan, EtatAction } from './progres';

const PREFIXE = 'seneve:progres:v1:';

export type JourCopie = { jour: number; ouvert: boolean; etat: EtatAction | null };
export type ParcoursCopie = { enrollment_id: string; nom: string; langue: string; realisees: number; joursOuverts: number; duree: number; jours: JourCopie[] };
export type CopieProgres = { le: string; parcours: ParcoursCopie[] };

/** Ne garde que les champs utiles à l'écran hors connexion. */
export function reduireBilan(p: { enrollment_id: string; nom: string; langue: string }, b: Bilan): ParcoursCopie {
  return {
    enrollment_id: p.enrollment_id, nom: p.nom, langue: p.langue,
    realisees: b.realisees, joursOuverts: b.joursOuverts, duree: b.duree,
    jours: b.jours.map(j => ({ jour: j.jour, ouvert: j.ouvert, etat: j.etat })),
  };
}

export function enregistrerCopieProgres(userId: string, parcours: ParcoursCopie[], maintenant = new Date()): void {
  try {
    if (!parcours.length) { localStorage.removeItem(PREFIXE + userId); return; }
    localStorage.setItem(PREFIXE + userId, JSON.stringify({ le: maintenant.toISOString(), parcours } satisfies CopieProgres));
  } catch { /* stockage indisponible : pas de copie */ }
}

export function lireCopieProgres(userId: string): CopieProgres | null {
  try {
    const brut = localStorage.getItem(PREFIXE + userId);
    if (!brut) return null;
    const c = JSON.parse(brut) as CopieProgres;
    return typeof c?.le === 'string' && Array.isArray(c.parcours) && c.parcours.length ? c : null;
  } catch { return null; }
}

/** À la déconnexion : aucune copie de progrès ne reste sur l'appareil. */
export function effacerCopiesProgres(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXE)) localStorage.removeItem(k);
    }
  } catch { /* rien */ }
}

/** Les 7 jours de la semaine de parcours en cours (jours 1 à 7, 8 à 14…). */
export function semaineEnCours(p: ParcoursCopie): JourCopie[] {
  const dernier = Math.max(1, Math.min(p.joursOuverts, p.duree));
  const debut = Math.floor((dernier - 1) / 7) * 7 + 1;
  return p.jours.filter(j => j.jour >= debut && j.jour < debut + 7);
}
