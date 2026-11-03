import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccueilDecouverte } from '@/components/AccueilDecouverte';

const accueil = (langue = 'fr') => render(<MemoryRouter><AccueilDecouverte prenom="Marie" starting={false} commencer={() => undefined} reglages={null} footer={null} langue={langue} /></MemoryRouter>);

afterEach(() => vi.unstubAllEnvs());

describe('Accueil avant inscription : Habitudes & Défis en haut (03/11/2026)', () => {
  it('montre la carte Habitudes & Défis avant la Découverte, avec le lien d’inscription', () => {
    vi.stubEnv('VITE_HABITUDES_DEFIS', 'true');
    accueil();
    const carte = screen.getByRole('complementary', { name: 'Habitudes & Défis' });
    expect(screen.getByRole('link', { name: /Activer mes 30 jours gratuits/ })).toHaveAttribute('href', '/habitudes/inscription?lang=fr');
    expect(screen.getByRole('link', { name: 'En savoir plus' })).toHaveAttribute('href', '/habitudes?lang=fr');
    const decouverte = screen.getByRole('heading', { name: 'Découverte 7 jours' });
    expect(carte.compareDocumentPosition(decouverte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /Commencer ma Découverte/ })).toBeInTheDocument();
  });

  it('en anglais, les liens gardent la langue', () => {
    vi.stubEnv('VITE_HABITUDES_DEFIS', 'true');
    accueil('en');
    expect(screen.getByRole('link', { name: /Activate my 30 free days/ })).toHaveAttribute('href', '/habitudes/inscription?lang=en');
  });

  it('reste masquée tant que Habitudes & Défis n’est pas ouvert', () => {
    vi.stubEnv('VITE_HABITUDES_DEFIS', 'false');
    accueil();
    expect(screen.queryByRole('complementary', { name: 'Habitudes & Défis' })).toBeNull();
  });
});
