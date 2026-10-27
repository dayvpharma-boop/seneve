// Accès à Supabase chargé à la demande : la bibliothèque (environ 220 Ko) ne fait plus partie
// du fichier principal, et la page du test s'affiche sans l'attendre.
// Les fichiers du fichier principal passent par ici au lieu d'importer '@/lib/supabase'.
export const chargerModuleSupabase = () => import('./supabase');
export const chargerSupabase = () => chargerModuleSupabase().then(m => m.supabase);
