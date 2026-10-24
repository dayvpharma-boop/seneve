import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, from: vi.fn(() => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) })) } }));
import { Bibliotheque } from '@/routes/bibliotheque';

afterEach(cleanup);
// Demande du 24/10/2026 : « Parcours & offres » quitte le bas de l'espace pour la bibliothèque.
it('la bibliothèque mène aux parcours et offres (FR)', () => {
  render(<MemoryRouter initialEntries={['/bibliotheque']}><Bibliotheque /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Parcours & offres' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Voir les parcours et offres/ })).toHaveAttribute('href', '/offres');
});
it('la bibliothèque mène aux parcours et offres (EN)', () => {
  render(<MemoryRouter initialEntries={['/bibliotheque?lang=en']}><Bibliotheque /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /View the journeys and offers/ })).toHaveAttribute('href', '/offres?lang=en');
});
