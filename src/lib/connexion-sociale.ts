import { chargerModuleSupabase } from './supabase-differe';

/**
 * Connexion avec Google ou Facebook (demande du 25/10/2026).
 * Un bouton n'apparaît que lorsque son fournisseur est activé dans Supabase (Authentication → Providers) :
 * tant qu'un fournisseur n'est pas configuré, il reste absent de la page plutôt que d'afficher une erreur.
 */
export type Fournisseur = 'google' | 'facebook';
// Google activé dans Supabase (seneve-prod) le 25/10/2026, vérifié par /auth/v1/settings ; Facebook pas encore.
export const FOURNISSEURS_ACTIFS: readonly Fournisseur[] = ['google'];

/** Prénom à partir du compte : prénom saisi à l'inscription, sinon celui transmis par Google ou Facebook. */
export function prenomDuCompte(meta: Record<string, unknown> | undefined | null): string {
  const lire = (k: string) => (typeof meta?.[k] === 'string' ? (meta[k] as string).trim() : '');
  const direct = lire('prenom') || lire('given_name') || lire('first_name');
  if (direct) return direct;
  const complet = lire('full_name') || lire('name');
  return complet.split(/\s+/u)[0] ?? '';
}

/** Ouvre la page de connexion du fournisseur ; au retour, la personne arrive dans son espace, dans sa langue. */
export async function connexionSociale(fournisseur: Fournisseur, langue: 'fr' | 'en') {
  const { supabase, siteUrl } = await chargerModuleSupabase();
  return supabase.auth.signInWithOAuth({
    provider: fournisseur,
    options: {
      redirectTo: siteUrl(langue === 'en' ? 'espace?lang=en' : 'espace'),
      scopes: fournisseur === 'facebook' ? 'email public_profile' : undefined,
    },
  });
}
