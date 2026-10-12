import { createClient } from '@supabase/supabase-js';

// Projet SÉNEVÉ — clé publiable (publique par conception). Les données sont protégées par les règles par ligne (RLS).
const SUPABASE_URL = 'https://lclquncbhrmpwxgsthhk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eRS-dLnGZDYLhF7RVvXmrA_lR9gNVdd';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'seneve' },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Adresse complète d'une page du site (tient compte du dossier /seneve/). */
export function siteUrl(path: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
