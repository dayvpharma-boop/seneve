import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { user_metadata: {} } } } }) },
    rpc: () => Promise.resolve({ data: 'P1', error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Progres } from '@/routes/progres';
import { bilan } from '@/lib/progres';

const P = 'PROSPECT_LIVRE_7J_FR_V1';
const contenus = Array.from({ length: 7 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}` }));
const activites = [
  ...Array.from({ length: 7 }, (_, k) => ({ activity_id: `A${k + 1}`, content_id: `C${k + 1}`, type_activite: 'action' })),
  { activity_id: 'Q1', content_id: 'C1', type_activite: 'question' },
];

describe('bilan', () => {
  const now = new Date('2026-10-13T12:00:00Z'); // jour 3 d'un parcours commencé le 11

  it('ne compte que les jours ouverts et distingue chaque état', () => {
    const b = bilan('2026-10-11', 7, contenus, activites, [
      { activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-11T09:00:00Z' },
      { activity_id: 'A2', etat: 'partielle', aide_demandee: true, realisee_le: null },
      { activity_id: 'A5', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-13T09:00:00Z' },
    ], now);
    expect(b.joursOuverts).toBe(3);
    expect(b.actionsOuvertes).toBe(3);
    expect(b.realisees).toBe(1);          // le jour 5 n'est pas encore ouvert : il ne compte pas
    expect(b.partielles).toBe(1);
    expect(b.aides).toBe(1);
    expect(b.prochain).toBe(2);           // une action partielle n'est pas terminée
    expect(b.jours[3]!.ouvert).toBe(false);
  });

  it('parcours terminé et tout réalisé : pas de prochaine étape', () => {
    const tout = activites.filter(a => a.type_activite === 'action').map(a => ({ activity_id: a.activity_id, etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-01T09:00:00Z' }));
    const b = bilan('2026-09-01', 7, contenus, activites, tout, now);
    expect(b.termine).toBe(true);
    expect(b.realisees).toBe(7);
    expect(b.prochain).toBeNull();
  });

  it('parcours à venir : rien d’ouvert', () => {
    const b = bilan('2026-10-20', 7, contenus, activites, [], now);
    expect(b.pasCommence).toBe(true);
    expect(b.actionsOuvertes).toBe(0);
  });
});

describe('page Mes progrès', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    tables['participants'] = [{ langue: 'fr' }];
    tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
    tables['programmes'] = [{ programme_id: P, nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 }];
    tables['contents'] = contenus;
    tables['activities'] = activites;
    tables['activity_state'] = [{ enrollment_id: 'E7', activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-11T09:00:00Z' }];
    tables['journal_entries'] = [{ entry_id: 'N1' }, { entry_id: 'N2' }];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('bilan factuel, sans jugement, avec reprise', async () => {
    render(<MemoryRouter initialEntries={['/progres']}><Routes><Route path="/progres" element={<Progres />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('3 jours ouverts sur 7')).toBeInTheDocument();
    expect(screen.getByText(/ne mesure ni ta foi ni ta valeur/)).toBeInTheDocument();
    expect(screen.getByText('1 action réalisée sur 3')).toBeInTheDocument();
    expect(screen.getByText('2 notes dans ton journal')).toBeInTheDocument();
    expect(screen.getByText(/Prochaine étape : l’action du jour 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre dans mon espace' })).toHaveAttribute('href', '/espace?parcours=E7&jour=2');
    expect(screen.getByRole('link', { name: 'Réalisée le 11 octobre' })).toBeInTheDocument();
    expect(screen.getAllByText('Pas encore ouvert')).toHaveLength(4);
    expect(document.body.textContent).not.toMatch(/score|%/i);
  });
});
