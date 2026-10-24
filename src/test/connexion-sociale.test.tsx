import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const { oauth, liste } = vi.hoisted(() => ({ oauth: vi.fn(), liste: [] as string[] }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithOAuth: oauth } }, siteUrl: (p: string) => `https://site/seneve/${p}` }));
vi.mock('@/lib/connexion-sociale', async orig => {
  const vrai = await orig<typeof import('@/lib/connexion-sociale')>();
  return { ...vrai, FOURNISSEURS_ACTIFS: liste };
});
import { BoutonsConnexionSociale } from '@/components/BoutonsConnexionSociale';
import { prenomDuCompte, connexionSociale } from '@/lib/connexion-sociale';

afterEach(() => { cleanup(); oauth.mockReset(); liste.length = 0; });
describe('Connexion avec Google / Facebook (25/10/2026)', () => {
  it('aucun bouton tant qu’aucun fournisseur n’est activé', () => {
    const { container } = render(<BoutonsConnexionSociale langue="fr" />);
    expect(container).toBeEmptyDOMElement();
  });
  it('bouton Google : ouvre Google et revient dans l’espace, dans la langue de la page', async () => {
    liste.push('google');
    oauth.mockResolvedValue({ data: {}, error: null });
    render(<BoutonsConnexionSociale langue="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://site/seneve/espace?lang=en', scopes: undefined } });
  });
  it('message clair si le fournisseur refuse', async () => {
    liste.push('facebook');
    oauth.mockResolvedValue({ data: {}, error: { message: 'Unsupported provider' } });
    render(<BoutonsConnexionSociale langue="fr" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer avec Facebook' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion avec Facebook n’est pas disponible pour le moment.');
  });
  it('prénom : celui de l’inscription, sinon celui de Google ou Facebook', () => {
    expect(prenomDuCompte({ prenom: 'Marie', full_name: 'Jeanne Dupont' })).toBe('Marie');
    expect(prenomDuCompte({ full_name: 'Jeanne Dupont' })).toBe('Jeanne');
    expect(prenomDuCompte({ given_name: 'Paul', name: 'Paul Kabila' })).toBe('Paul');
    expect(prenomDuCompte(undefined)).toBe('');
    expect(typeof connexionSociale).toBe('function');
  });
});
