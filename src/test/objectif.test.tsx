import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, unknown[]> = {};
const rpcs: { name: string; args: unknown }[] = [];
let rpcError: { message: string } | null = null;
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => { rpcs.push({ name, args }); return Promise.resolve({ data: { goal_id: 'G1' }, error: rpcError }); },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { GoalCard } from '@/components/GoalCard';
import { memoriserRacineTest, nomsRacines, objectifValide, racineTest } from '@/lib/objectif';

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  rpcs.length = 0; rpcError = null;
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('règles', () => {
  it('longueur de l’objectif', () => {
    expect(objectifValide('abc')).toBeNull();
    expect(objectifValide('a'.repeat(301))).toBeNull();
    expect(objectifValide('  Lire chaque matin  ')).toBe('Lire chaque matin');
  });
  it('les 7 racines du test, en français et en anglais', () => {
    expect(nomsRacines('fr')).toHaveLength(7);
    expect(nomsRacines('fr')[0]).toBe('Priorité au Royaume');
    expect(nomsRacines('en')[6]).toBe('Discernment');
  });
  it('la racine du test reste sur l’appareil', () => {
    expect(racineTest()).toBeNull();
    memoriserRacineTest(5);
    expect(racineTest()).toBe(5);
    memoriserRacineTest(9);
    expect(racineTest()).toBe(5);
  });
});

describe('Carte Mon objectif', () => {
  it('sans objectif : le participant le formule et le confirme lui-même', async () => {
    render(<GoalCard langue="fr" />);
    expect(await screen.findByText(/C’est toi qui le formules/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Mon objectif')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir mon objectif' }));
    const bouton = screen.getByRole('button', { name: 'Confirmer mon objectif' });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mon objectif'), { target: { value: '  Lire 15 minutes chaque matin  ' } });
    fireEvent.change(screen.getByLabelText(/Racine liée/), { target: { value: '6' } });
    fireEvent.click(bouton);
    await waitFor(() => expect(rpcs).toContainEqual({ name: 'goal_set', args: { p_texte: 'Lire 15 minutes chaque matin', p_racine: 6 } }));
  });

  it('racine du test proposée, jamais imposée', async () => {
    memoriserRacineTest(2);
    render(<GoalCard langue="fr" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choisir mon objectif' }));
    expect(await screen.findByText(/tu as retenu : Travail et intégrité/)).toBeInTheDocument();
    expect((screen.getByLabelText(/Racine liée/) as HTMLSelectElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'La choisir' }));
    expect((screen.getByLabelText(/Racine liée/) as HTMLSelectElement).value).toBe('3');
  });

  it('objectif confirmé : affiché, modifiable', async () => {
    tables['goals'] = [{ goal_id: 'G1', texte: 'Prier avant mon téléphone', racine: 1, confirme_le: '2026-10-13T14:00:00Z' }];
    render(<GoalCard langue="fr" />);
    expect(await screen.findByText('Prier avant mon téléphone')).toBeInTheDocument();
    expect(screen.getByText('Priorité au Royaume')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier mon objectif' }));
    expect(screen.getByLabelText('Mon objectif')).toHaveValue('Prier avant mon téléphone');
    expect(screen.getByText(/L’ancien objectif reste dans ton historique/)).toBeInTheDocument();
  });

  it('échec d’enregistrement : message clair', async () => {
    rpcError = { message: 'Failed to fetch' };
    render(<GoalCard langue="en" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose my goal' }));
    fireEvent.change(await screen.findByLabelText('My goal'), { target: { value: 'Read every morning' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm my goal' }));
    expect(await screen.findByText(/Goal not saved/)).toBeInTheDocument();
  });
});
