import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bilan, jourDeReprise } from '@/lib/progres';

const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string) => Promise.resolve(name === 'record_progress' ? { data: { etat: 'realisee', aide_demandee: false }, error: null } : { data: null, error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));
import { Espace } from '@/routes/espace';

const P = 'ACHETEUR_LIVRE_14J_FR_V1';
const contenus = Array.from({ length: 14 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte ${k + 1}`, reference_livre: null }));
const activites = contenus.map(c => ({ activity_id: `A${c.jour}`, content_id: c.content_id, type_activite: 'action', consigne: `Action ${c.jour}`, obligatoire: true }));
const fait = (j: number, etat = 'realisee', aide = false) => ({ enrollment_id: 'E1', activity_id: `A${j}`, etat, aide_demandee: aide, realisee_le: etat === 'realisee' ? '2026-10-01T10:00:00Z' : null });
const b = (jour: number, etats: ReturnType<typeof fait>[]) => bilan('2026-10-01', 14, contenus, activites, etats, new Date(Date.UTC(2026, 9, jour, 12)));

describe('Reprise après 3 jours (calcul)', () => {
  it('pas de message si moins de 3 jours sans action', () => {
    expect(jourDeReprise(b(5, [fait(1), fait(2)]), 5)).toBeNull();      // jours 3 et 4 silencieux = 2
  });
  it('message à partir de 3 jours sans action, reprise au premier jour non enregistré', () => {
    expect(jourDeReprise(b(6, [fait(1), fait(2)]), 6)).toBe(3);         // jours 3, 4, 5 silencieux
  });
  it('une demande d’aide compte comme une action enregistrée', () => {
    expect(jourDeReprise(b(6, [fait(1), fait(4, 'non_commencee', true)]), 6)).toBeNull();
  });
  it('jamais après la fin du parcours', () => {
    expect(jourDeReprise(b(20, [fait(1)]), 20)).toBeNull();
  });
});

describe('Reprise après 3 jours (espace)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));   // jour 6
    localStorage.clear();
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [{ programme_id: P, nom: 'Accompagnement du livre — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-01', etat: 'active' }];
    tables['contents'] = contenus;
    tables['activities'] = activites;
    tables['activity_state'] = [fait(1), fait(2)];
    tables['goals'] = [];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('accueil bienveillant, bouton vers le jour 3, disparaît après une action enregistrée', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    const carte = await screen.findByRole('region', { name: 'Content de te revoir, Marie 🌱' });
    expect(carte).toHaveTextContent('l’action du jour 3');
    expect(carte).not.toHaveTextContent(/retard|foi/i);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre au jour 3' }));
    expect(await screen.findByText('Action 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "J'ai réalisé cette action" }));
    await screen.findByText(/Action réalisée/);
    expect(screen.queryByRole('region', { name: 'Content de te revoir, Marie 🌱' })).not.toBeInTheDocument();
  });
});

describe('Reprise : une action suffit à faire disparaître le message', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));   // jour 10, dernière action au jour 2
    localStorage.clear();
    tables['activity_state'] = [fait(1), fait(2)];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('après avoir repris le jour 3, le message ne revient pas pendant la visite', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByRole('region', { name: 'Content de te revoir, Marie 🌱' });
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre au jour 3' }));
    fireEvent.click(await screen.findByRole('button', { name: "J'ai réalisé cette action" }));
    await screen.findByText(/Action réalisée/);
    expect(screen.queryByRole('region', { name: 'Content de te revoir, Marie 🌱' })).not.toBeInTheDocument();
  });
});
