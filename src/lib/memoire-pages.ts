/** Mémoire des pages pendant la visite (demande de Dr Justin du 30/10/2026).
 * Passer d'un onglet à l'autre (Aujourd'hui, Parcours…) ne doit plus réafficher « Chargement… » :
 * la dernière version chargée de chaque page reste en mémoire tant que le site est ouvert.
 * Rien n'est écrit sur l'appareil : cette mémoire disparaît à la fermeture de l'onglet,
 * à la déconnexion et au changement de compte (chaque entrée porte le compte qui l'a chargée).
 */
export const FRAICHEUR_MEMOIRE_MS = 30 * 60 * 1000;

type Entree = { le: number; donnees: unknown };
const memoire = new Map<string, Entree>();
const cle = (page: string, userId: string) => `${userId}:${page}`;

export function garderEnMemoire(page: string, userId: string, donnees: unknown, maintenant = Date.now()): void {
  memoire.set(cle(page, userId), { le: maintenant, donnees });
}

export function lireEnMemoire<T>(page: string, userId: string): { le: number; donnees: T } | null {
  const e = memoire.get(cle(page, userId));
  return e ? { le: e.le, donnees: e.donnees as T } : null;
}

/** Remplace les données gardées sans changer leur date (une action notée ne les rend pas plus récentes). */
export function modifierEnMemoire<T>(page: string, userId: string, modifier: (d: T) => T): void {
  const e = memoire.get(cle(page, userId));
  if (e) memoire.set(cle(page, userId), { le: e.le, donnees: modifier(e.donnees as T) });
}

/** Moins de 30 minutes et même journée sur le téléphone. */
export function memoireFraiche(le: number, maintenant = Date.now()): boolean {
  const age = maintenant - le;
  if (!(age >= 0 && age < FRAICHEUR_MEMOIRE_MS)) return false;
  return new Date(le).toDateString() === new Date(maintenant).toDateString();
}

/** Dernier compte vérifié pendant la visite : l'écran privé s'affiche sans attendre la relecture de la session. */
let dernierCompte: string | undefined;
export function compteMemorise(): string | undefined { return dernierCompte ?? compteDeLAppareil(); }

/** Page rouverte de zéro (fréquent sur iPhone) : compte de la session gardée sur l'appareil par Supabase.
 *  Sert seulement à afficher l'écran sans attendre ; la session est toujours vérifiée ensuite. */
function compteDeLAppareil(): string | undefined {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !/^sb-.+-auth-token$/.test(k)) continue;
      const id = (JSON.parse(localStorage.getItem(k) ?? 'null') as { user?: { id?: unknown } } | null)?.user?.id;
      if (typeof id === 'string' && id) return id;
    }
  } catch { /* stockage indisponible */ }
  return undefined;
}
export function memoriserCompte(id: string | null): void { dernierCompte = id ?? undefined; }

export function effacerMemoire(): void { memoire.clear(); dernierCompte = undefined; }
