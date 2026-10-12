import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fausse base : chaque table renvoie les lignes fournies, quelle que soit la chaîne de filtres.
const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';

const content = (programme_id: string, jour: number) => ({
  content_id: `${programme_id}-${jour}`, programme_id, version: 1, jour, numero_message: 1,
  theme: `Thème ${programme_id} ${jour}`, explication: null, texte_officiel: `Texte ${jour}`, reference_livre: null,
});

describe('Espace avec plusieurs parcours', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [
      { programme_id: 'PROSPECT_LIVRE_7J_FR_V1', nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 },
      { programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', nom: 'Accompagnement du livre en français — 14 jours', duree_jours: 14 },
    ];
    tables['enrollments'] = [
      { enrollment_id: 'E14', programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-19', etat: 'active' },
      { enrollment_id: 'E7', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' },
    ];
    tables['contents'] = [
      ...Array.from({ length: 7 }, (_, k) => content('PROSPECT_LIVRE_7J_FR_V1', k + 1)),
      ...Array.from({ length: 14 }, (_, k) => content('ACHETEUR_LIVRE_14J_FR_V1', k + 1)),
    ];
    tables['activities'] = [];
    tables['activity_state'] = [];
    tables['channel_links'] = [];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('affiche d’abord le parcours en cours, puis la date de début du 14 jours', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 2 sur 7')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Découverte du livre — 7 jours' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Accompagnement du livre — 14 jours' }));
    expect(screen.getByText(/Ton accompagnement commence le lundi 19 octobre/)).toBeInTheDocument();
    expect(screen.queryByText(/Thème ACHETEUR/)).not.toBeInTheDocument();
  });

  it('14 jours commencé : 14 pastilles et durée lue dans le programme', async () => {
    tables['enrollments'] = [{ enrollment_id: 'E14', programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-10', etat: 'active' }];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 3 sur 14')).toBeInTheDocument();
    expect(screen.getByText('Thème ACHETEUR_LIVRE_14J_FR_V1 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour 14, pas encore ouvert' })).toBeDisabled();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
