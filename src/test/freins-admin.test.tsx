import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const results: Record<string, { data: unknown; error: { message: string } | null }> = {};
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (name: string) => Promise.resolve(results[name] ?? { data: null, error: null }) },
  siteUrl: (p: string) => p,
}));
import { FreinsAdmin } from '@/components/FreinsAdmin';

const f = (motif: string, prenom: string | null = null, email: string | null = null, whatsapp: string | null = null) =>
  ({ cree_le: '2026-10-16T09:00:00Z', motif, prenom, langue: 'fr', programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', email, whatsapp });

beforeEach(() => { for (const k of Object.keys(results)) delete results[k]; });
afterEach(() => cleanup());

describe('Administration : ce qui freine les participants', () => {
  it('administrateur : chiffres par motif et contacts pour « situation personnelle »', async () => {
    results['staff_list_obstacles'] = { data: [f('temps'), f('temps'), f('compris'), f('personnel', 'Marie', 'marie@exemple.invalid', '+243900000000')], error: null };
    render(<MemoryRouter><FreinsAdmin admin /></MemoryRouter>);
    const carte = await screen.findByRole('region', { name: 'Ce qui freine les participants' });
    expect(await within(carte).findByText(/Je n’ai pas eu le temps/)).toHaveTextContent('Je n’ai pas eu le temps : 2');
    expect(carte).toHaveTextContent('Je n’ai pas bien compris l’action : 1');
    expect(carte).toHaveTextContent('Une situation personnelle : 1');
    fireEvent.click(within(carte).getByText(/personnes qu’il peut être utile de contacter/));
    expect(within(carte).getByRole('link', { name: 'marie@exemple.invalid' })).toHaveAttribute('href', 'mailto:marie@exemple.invalid');
    expect(within(carte).getByRole('link', { name: 'WhatsApp' })).toBeInTheDocument();
  });

  it('accompagnateur : chiffres seulement, aucun nom', async () => {
    results['staff_list_obstacles'] = { data: [f('personnel')], error: null };
    render(<MemoryRouter><FreinsAdmin admin={false} /></MemoryRouter>);
    expect(await screen.findByText(/Une situation personnelle :/)).toBeInTheDocument();
    expect(screen.queryByText(/personnes qu’il peut être utile de contacter/)).not.toBeInTheDocument();
    expect(screen.getByText('Les noms et coordonnées sont visibles par l’administrateur.')).toBeInTheDocument();
  });

  it('aucune réponse', async () => {
    results['staff_list_obstacles'] = { data: [], error: null };
    render(<MemoryRouter><FreinsAdmin admin /></MemoryRouter>);
    expect(await screen.findByText('Aucune réponse pour le moment.')).toBeInTheDocument();
  });
});
