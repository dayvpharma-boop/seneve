import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn(() => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) })) } }));
import { Confidentialite } from '@/routes/confidentialite';
import { EspaceErreur } from '@/components/EspaceErreur';
import { AccueilDecouverte } from '@/components/AccueilDecouverte';

// Signalé le 24/10/2026 : l'icône du profil en haut de certaines pages ne menait nulle part.
describe('Icône du profil en haut des pages', () => {
  afterEach(cleanup);
  it('Confidentialité : l’icône mène au profil', () => {
    render(<MemoryRouter initialEntries={['/confidentialite']}><Confidentialite /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveAttribute('href', '/profil');
  });
  it('Confidentialité en anglais : l’icône mène au profil anglais', () => {
    render(<MemoryRouter initialEntries={['/confidentialite?lang=en']}><Confidentialite /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profil?lang=en');
  });
  it('Écran d’erreur de l’espace : l’initiale mène au profil', () => {
    render(<MemoryRouter><EspaceErreur prenom="Marie" message="Erreur" reessayer={() => undefined} langue="fr" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveAttribute('href', '/profil');
  });
  it('Accueil de la Découverte : l’initiale mène au profil', () => {
    render(<MemoryRouter><AccueilDecouverte prenom="Marie" starting={false} commencer={() => undefined} reglages={null} footer={null} langue="en" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profil?lang=en');
  });
});
