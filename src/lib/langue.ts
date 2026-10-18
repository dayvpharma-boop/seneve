import { supabase } from '@/lib/supabase';

/** Langue des menus de l'espace participant (l'administration reste en français). */
export type Langue = 'fr' | 'en';

const CLE = 'seneve_langue';

export function langueValide(v: unknown): Langue | null {
  return v === 'fr' || v === 'en' ? v : null;
}

/** Dernière langue connue sur cet appareil : sert seulement pendant le chargement, avant de lire le compte. */
export function langueMemorisee(): Langue {
  try { return langueValide(window.localStorage.getItem(CLE)) ?? 'fr'; } catch { return 'fr'; }
}

export function memoriserLangue(langue: string | null | undefined) {
  const l = langueValide(langue);
  if (!l) return;
  try { window.localStorage.setItem(CLE, l); } catch { /* stockage indisponible : sans effet */ }
}

/**
 * Langue des menus d'un participant :
 * 1. son choix (fait à l'inscription en anglais ou avec « Langue / Language »), gardé dans son compte ;
 * 2. sinon, l'anglais si tous ses parcours sont en anglais ;
 * 3. sinon, la langue déjà enregistrée sur sa fiche (français par défaut).
 */
export function langueDesMenus(choix: unknown, languesParcours: string[], fiche: unknown): Langue {
  const c = langueValide(choix);
  if (c) return c;
  if (languesParcours.length && languesParcours.every(l => l === 'en')) return 'en';
  return langueValide(fiche) ?? 'fr';
}

/** Enregistre la langue sur la fiche du participant (utilisée aussi par les e-mails de l'équipe). Sans effet en cas d'erreur. */
export async function enregistrerLangueFiche(langue: Langue) {
  try { await supabase.from('participants').update({ langue }).not('auth_user_id', 'is', null); } catch { /* réessayé à la prochaine visite */ }
}

/** Choix explicite : gardé dans le compte (pour tous les appareils et les e-mails de connexion) et sur la fiche. */
export async function choisirLangue(langue: Langue) {
  memoriserLangue(langue);
  try { await supabase.auth.updateUser({ data: { langue } }); } catch { /* sans effet */ }
  await enregistrerLangueFiche(langue);
}
