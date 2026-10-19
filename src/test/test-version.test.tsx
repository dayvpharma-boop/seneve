import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { Index } from '@/routes/index';
import { TEST_VERSIONS } from '@/lib/test-texts';

beforeEach(() => { rpc.mockReset(); });
afterEach(cleanup);

it('affiche les cinq fréquences sans changer les points proposés', () => {
  render(<Index />);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const [k, label] of ['jamais', 'rarement', 'parfois', 'souvent', 'toujours'].entries()) {
    expect(screen.getByRole('button', { name: `${k + 1} sur 5 (${label})` })).toBeEnabled();
    expect(screen.getByText(label, { exact: true, selector: '.scale-label' , normalizer: s => s.toLowerCase() })).toBeVisible();
  }
  expect(screen.getAllByRole('button', { name: /sur 5/ })).toHaveLength(5);
});

it.each(['fr', 'en'] as const)('enregistre sous la version réellement affichée : %s', async langue => {
  const { submitResult } = await vi.importActual<typeof import('@/lib/suivi-test')>('@/lib/suivi-test');
  rpc.mockResolvedValue({ data: { result_id: 'R1' }, error: null });
  expect(await submitResult(Array(21).fill(3), 'tt', langue)).toBe('R1');
  expect(rpc).toHaveBeenCalledWith('submit_test_result_versioned', {
    p_langue: langue, p_reponses: Array(21).fill(3), p_source: 'tt', p_version: TEST_VERSIONS[langue],
  });
  expect(TEST_VERSIONS[langue]).toBe(3);
});

it('ne réattribue pas une V2 à une ancienne version si le serveur refuse', async () => {
  const { submitResult } = await vi.importActual<typeof import('@/lib/suivi-test')>('@/lib/suivi-test');
  rpc.mockResolvedValue({ data: null, error: { message: 'Version indisponible' } });
  expect(await submitResult(Array(21).fill(3), null, 'fr')).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(1);
});

it.each([
  ['fr', 1, 'Je consulte Dieu avant de prendre des décisions professionnelles importantes.'],
  ['fr', 6, 'Est-ce que je travaille avec la même qualité quand mon patron n\'est pas là ?'],
  ['en', 1, 'I consult God before making important professional decisions.'],
  ['en', 6, 'Do I work with the same quality when my boss is not there?'],
  ['en', 12, 'I check on a lonely person or someone in difficulty and offer help suited to my means.'],
] as const)('questions décidées le 19/10/2026 (%s, question %i + 1)', async (langue, index, texte) => {
  const { texts } = await import('@/lib/test-texts');
  expect(texts[langue].questions[index]).toBe(texte);
});
