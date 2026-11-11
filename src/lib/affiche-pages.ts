/** Pages où l'affiche d'annonce peut apparaître. Fichier sans dépendance : il reste dans le fichier de démarrage,
 *  alors que l'affiche elle-même (et Supabase) n'est chargée que sur ces pages (allègement du 11/11/2026). */
const PAGES_EXCLUES = /^\/(|p|en|connexion|admin|mot-de-passe-oublie|nouveau-mot-de-passe|confidentialite|bible\/[^/]+\/\d+)$/;

export function pageAutorisee(chemin: string): boolean {
  return !PAGES_EXCLUES.test(chemin.replace(/\/$/, '') || '/') && chemin !== '/';
}
