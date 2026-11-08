import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

/** Signalé par Dr Justin le 08/11/2026 : après s'être déconnecté d'un compte anglais, son compte français
 * restait en anglais (le ?lang=en de la page de connexion suivait toutes les pages). */
const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Justin' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';
import { GarderLangue } from '@/components/GarderLangue';

const content = (jour: number) => ({ content_id: `P-${jour}`, programme_id: 'PROSPECT_LIVRE_7J_FR_V1', version: 1, jour, numero_message: 1, theme: `Thème ${jour}`, explication: null, texte_officiel: `Texte ${jour}`, reference_livre: null });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  tables['participants'] = [{ prenom: 'Justin' }];
  tables['programmes'] = [{ programme_id: 'PROSPECT_LIVRE_7J_FR_V1', nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 }];
  tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
  tables['contents'] = Array.from({ length: 7 }, (_, k) => content(k + 1));
  tables['activities'] = [];
  tables['activity_state'] = [];
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function Adresse() { const l = useLocation(); return <p data-testid="adresse">{l.pathname + l.search}</p>; }

it('compte français ouvert après un compte anglais : « Aujourd’hui » retire ?lang=en et la page suivante reste en français', async () => {
  render(<MemoryRouter initialEntries={['/connexion?lang=en', '/espace?lang=en']} initialIndex={1}>
    <GarderLangue /><Adresse />
    <Routes>
      <Route path="/espace" element={<><Espace /><Link to="/bible">vers la Bible</Link></>} />
      <Route path="/bible" element={<p>Bible</p>} />
    </Routes>
  </MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Bonjour Justin' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('adresse')).toHaveTextContent(/^\/espace$/));
  fireEvent.click(screen.getByText('vers la Bible'));
  expect(screen.getByTestId('adresse')).toHaveTextContent(/^\/bible$/);
});

it('un compte anglais garde l’anglais', async () => {
  tables['programmes'] = [{ programme_id: 'PROSPECT_LIVRE_7J_EN_V1', nom: 'Book discovery — 7 days', duree_jours: 7 }];
  tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: 'PROSPECT_LIVRE_7J_EN_V1', version: 1, langue: 'en', date_debut: '2026-10-11', etat: 'active' }];
  tables['contents'] = Array.from({ length: 7 }, (_, k) => ({ ...content(k + 1), programme_id: 'PROSPECT_LIVRE_7J_EN_V1' }));
  render(<MemoryRouter initialEntries={['/espace?lang=en']}><GarderLangue /><Adresse /><Routes><Route path="/espace" element={<Espace />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Hello Justin' })).toBeInTheDocument();
  expect(screen.getByTestId('adresse')).toHaveTextContent('/espace?lang=en');
});
