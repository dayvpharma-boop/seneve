import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { Index } from '@/routes/index';
import { TEST_VERSIONS } from '@/lib/test-texts';

beforeEach(() => { rpc.mockReset(); });
afterEach(cleanup);

it('affiche l’échelle « Cela me ressemble… » de la V4 sans changer les points proposés', () => {
  render(<Index />);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  expect(screen.getByText('Cela me ressemble…')).toBeVisible();
  for (const [k, label] of ['pas du tout', 'un peu', 'à moitié', 'beaucoup', 'tout à fait'].entries()) {
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
  // FR V5 validée le 23/10/2026 ; l'anglais reste en V3 jusqu'à sa traduction.
  expect(TEST_VERSIONS[langue]).toBe(langue === 'fr' ? 5 : 3);
});

it('ne réattribue pas une V2 à une ancienne version si le serveur refuse', async () => {
  const { submitResult } = await vi.importActual<typeof import('@/lib/suivi-test')>('@/lib/suivi-test');
  rpc.mockResolvedValue({ data: null, error: { message: 'Version indisponible' } });
  expect(await submitResult(Array(21).fill(3), null, 'fr')).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(1);
});

it.each([
  ['en', 1, 'I consult God before making important professional decisions.'],
  ['en', 6, 'Do I work with the same quality when my boss is not there?'],
  ['en', 12, 'I check on a lonely person or someone in difficulty and offer help suited to my means.'],
] as const)('questions décidées le 19/10/2026 (%s, question %i + 1)', async (langue, index, texte) => {
  const { texts } = await import('@/lib/test-texts');
  expect(texts[langue].questions[index]).toBe(texte);
});

// FR V5, validée par Dr Justin Tshims le 23/10/2026 : 21 questions, toutes dans le même sens.
it('FR V5 : 21 questions, aucune comptée à l’envers', async () => {
  const { texts } = await import('@/lib/test-texts');
  const { compute } = await import('@/lib/racines');
  expect(texts.fr.questions).toHaveLength(21);
  expect(texts.fr.questions[0]).toBe('Je commence chaque journée par un temps de prière avant toute autre activité.');
  expect(texts.fr.questions[20]).toBe('Avant une décision importante, je demande conseil à des personnes sages et compétentes.');
  expect(texts.fr.reversed).toEqual([]);
  // « Tout à fait » partout : chaque racine vaut 15.
  const reponses = Array(21).fill(5);
  expect(compute(reponses, texts.fr.reversed)?.t).toEqual(Array(7).fill(15));
  expect(compute(reponses, texts.en.reversed)?.t).toEqual(Array(7).fill(15));
});

it('FR : phrase-seuil avant la racine, sans question du manteau (retirée le 24/10/2026)', () => {
  vi.useFakeTimers();
  render(<Index />);
  expect(screen.getByText(/Qui est vraiment premier dans ta vie/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  expect(screen.getByText(/Le vrai chrétien ne met pas Dieu dans son agenda/)).toBeVisible();
  for (let k = 0; k < 21; k++) {
    fireEvent.click(screen.getByRole('button', { name: /^3 sur 5/ }));
    act(() => { vi.advanceTimersByTime(400); });
  }
  expect(screen.queryByText(/manteau de mendiant/)).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Voir mon résultat' }));
  expect(screen.queryByText(/Le manteau que tu veux jeter/)).not.toBeInTheDocument();
  vi.useRealTimers();
});
