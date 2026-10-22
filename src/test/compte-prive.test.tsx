import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  session: vi.fn(),
  listener: null as null | ((event: string, session: { user: { id: string } } | null) => void),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {
  getSession: () => m.session(),
  onAuthStateChange: (f: typeof m.listener) => { m.listener = f; return { data: { subscription: { unsubscribe: () => { m.listener = null; } } } }; },
} } }));
import { ComptePrive } from '@/components/ComptePrive';

beforeEach(() => { m.session.mockReset(); });
afterEach(cleanup);
function ouvrir() {
  render(<MemoryRouter initialEntries={['/journal']}><Routes>
    <Route path="/journal" element={<ComptePrive enfants={id => <p>Compte {id}</p>} />} />
    <Route path="/connexion" element={<p>Connexion requise</p>} />
  </Routes></MemoryRouter>);
}
it('un chargement tardif de l’ancien compte ne remplace pas le nouveau', async () => {
  let terminer!: (v: unknown) => void;
  m.session.mockReturnValue(new Promise(resolve => { terminer = resolve; }));
  ouvrir();
  act(() => m.listener?.('SIGNED_IN', { user: { id: 'B' } }));
  expect(screen.getByText('Compte B')).toBeInTheDocument();
  await act(async () => { terminer({ data: { session: { user: { id: 'A' } } }, error: null }); });
  expect(screen.getByText('Compte B')).toBeInTheDocument();
  expect(screen.queryByText('Compte A')).toBeNull();
});
it('une déconnexion survenue pendant le chargement ne réaffiche pas le compte', async () => {
  let terminer!: (v: unknown) => void;
  m.session.mockReturnValue(new Promise(resolve => { terminer = resolve; }));
  ouvrir();
  act(() => m.listener?.('SIGNED_OUT', null));
  expect(screen.getByText('Connexion requise')).toBeInTheDocument();
  await act(async () => { terminer({ data: { session: { user: { id: 'A' } } }, error: null }); });
  expect(screen.queryByText('Compte A')).toBeNull();
});
it('un échec de session garde les écrans privés fermés et permet une nouvelle tentative', async () => {
  m.session.mockRejectedValueOnce(new Error('indisponible'));
  ouvrir();
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de vérifier ta connexion');
  expect(screen.queryByText(/Compte/)).toBeNull();
});
