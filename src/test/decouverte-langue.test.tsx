import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const appels: { name: string; args: unknown }[] = [];
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: table === 'participants' ? { prenom: 'Marie' } : null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: unknown) => { appels.push({ name, args }); return Promise.resolve({ data: null, error: null }); },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';
afterEach(() => { cleanup(); appels.length = 0; });

describe('Découverte : choix de la langue', () => {
  it('français par défaut', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Commencer ma Découverte' }));
    await waitFor(() => expect(appels).toContainEqual({ name: 'start_discovery', args: { p_langue: 'fr' } }));
  });
  it('à l’arrivée dans l’espace, les achats faits avec la même adresse sont ouverts (après le compte participant)', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Commencer ma Découverte' });
    const noms = appels.map(a => a.name);
    expect(noms).toContain('claim_my_purchases');
    expect(noms.indexOf('ensure_participant')).toBeLessThan(noms.indexOf('claim_my_purchases'));
  });

  it('anglais sur demande', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start in English' }));
    await waitFor(() => expect(appels).toContainEqual({ name: 'start_discovery', args: { p_langue: 'en' } }));
  });
});
