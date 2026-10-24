import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { Index } from '@/routes/index';
import { TEST_VERSIONS } from '@/lib/test-texts';

beforeEach(() => { rpc.mockReset(); });
afterEach(cleanup);

// V6 (24/10/2026) : même échelle en français et en anglais, Jamais…Toujours / Never…Always.
it('V6 FR : échelle « Choisis ta réponse », de Jamais à Toujours', () => {
  render(<Index />);
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  expect(screen.getByText('Choisis ta réponse')).toBeVisible();
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
  // V6 identique en français et en anglais (24/10/2026).
  expect(TEST_VERSIONS[langue]).toBe(6);
});

it('ne réattribue pas une V2 à une ancienne version si le serveur refuse', async () => {
  const { submitResult } = await vi.importActual<typeof import('@/lib/suivi-test')>('@/lib/suivi-test');
  rpc.mockResolvedValue({ data: null, error: { message: 'Version indisponible' } });
  expect(await submitResult(Array(21).fill(3), null, 'fr')).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(1);
});

it('EN V6 : mêmes questions, mêmes phrases du livre et mêmes premiers pas que le français', async () => {
  const { texts } = await import('@/lib/test-texts');
  expect(texts.en.questions).toHaveLength(21);
  expect(texts.en.questions[1]).toBe('I consult God before making important decisions.');
  expect(texts.en.questions[5]).toBe('I believe that God can protect and multiply my resources.');
  expect(texts.en.questions[20]).toBe('Before an important decision, I seek counsel from wise and competent people.');
  expect(texts.en.reversed).toEqual(texts.fr.reversed);
  expect(texts.en.roots.map(r => r.j)).toEqual(texts.fr.roots.map(r => r.j));
  expect(texts.en.roots.map(r => r.c)).toEqual(texts.fr.roots.map(r => r.c));
  for (const k of [0, 1, 2, 3, 4, 5, 6]) {
    expect(texts.en.roots[k]?.s).toBeTruthy();
    expect(texts.en.roots[k]?.o).toBeTruthy();
  }
  expect(texts.en.opening?.text).toBe('Who is truly first in your life? Do not answer too quickly.');
  expect(texts.en.answerOptions).toEqual(['Never', 'Rarely', 'Sometimes', 'Often', 'Always']);
  expect(texts.fr.answerOptions).toEqual(['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours']);
});

it('EN V6 : phrase-seuil avant la racine et question d’ouverture, comme en français', () => {
  render(<Index language="en" />);
  expect(screen.getByText(/Who is truly first in your life/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(screen.getByText(/The true Christian does not put God into his schedule/)).toBeVisible();
  expect(screen.getByText('Question 1', { selector: '.tag' })).toBeVisible();
  expect(screen.getByText('Choose your answer')).toBeVisible();
});

// FR V5, validée par Dr Justin Tshims le 23/10/2026 : 21 questions, toutes dans le même sens.
it('FR V5 puis V6 : 21 questions, aucune comptée à l’envers', async () => {
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
