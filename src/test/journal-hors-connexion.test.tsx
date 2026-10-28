import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ComptePrive', () => ({ ComptePrive: ({ enfants }: { enfants: (id: string) => unknown }) => enfants('U1') }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }) },
    rpc: () => Promise.reject(new TypeError('Failed to fetch')),
    from: () => { throw new TypeError('Failed to fetch'); },
  },
  siteUrl: (p: string) => p,
}));

import { Journal } from '@/routes/journal';
import { draft } from '@/lib/journal';

const page = () => render(<MemoryRouter initialEntries={['/journal']}><Routes><Route path="/journal" element={<Journal />} /></Routes></MemoryRouter>);

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

describe('journal hors connexion (maquette Stitch du 28/10/2026)', () => {
  it('sans réseau, propose un brouillon gardé sur l’appareil et le dit seulement après relecture', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    page();
    expect(await screen.findByText('Hors connexion. Tes notes déjà enregistrées s’afficheront au retour du réseau.')).toBeInTheDocument();
    const champ = screen.getByLabelText('Brouillon sur cet appareil');
    const garder = screen.getByRole('button', { name: 'Conserver le brouillon' });
    expect(garder).toBeDisabled();
    fireEvent.change(champ, { target: { value: 'Ma note sans réseau' } });
    fireEvent.click(garder);
    expect(screen.getByText('Brouillon conservé sur cet appareil. Pas encore enregistré dans ton journal.')).toBeInTheDocument();
    expect(draft.read('journal:libre', 'U1')).toBe('Ma note sans réseau');
    expect(screen.getByText('Un brouillon peut être effacé si le navigateur libère de la place.')).toBeInTheDocument();
  });
  it('avec réseau, une erreur de chargement garde le message habituel', async () => {
    page();
    expect(await screen.findByText('Impossible de charger ton journal pour le moment.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Brouillon sur cet appareil')).not.toBeInTheDocument();
  });
});
