import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { texts } from '@/lib/test-texts';

// Wording the author retired from the French home screen: it must not survive anywhere.
const retired = /racine forte|racine à fortifier/i;
const approved = ['tes sept racines avec leur score ;', 'la racine par laquelle commencer ;', 'une première action simple.'];

function answerAll(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const total of totals) {
    const n = Math.floor(total / 3), remainder = total % 3;
    for (const answer of [n, n + Number(remainder > 0), n + Number(remainder > 1)]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${answer} sur 5`) }));
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => vi.advanceTimersByTime(160));
    }
  }
}

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return [];
}

describe('French home screen wording approved by the author', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows the three approved discovery lines', () => {
    render(<Index />);
    expect(screen.getByText('À la fin, tu découvres :')).toBeVisible();
    expect(within(screen.getByRole('list', { name: 'À la fin, tu découvres :' })).getAllByRole('listitem').map(item => item.textContent)).toEqual(approved);
  });

  it.each([
    [Array(7).fill(3)], [[15, 12, 6, 12, 9, 6, 12]], [[15, 15, 9, 12, 6, 9, 12]], [Array(7).fill(15)],
  ])('keeps the retired wording out of every state for %j', (totals) => {
    render(<Index />);
    expect(document.body.textContent ?? '').not.toMatch(retired);
    answerAll(totals);
    expect(document.body.textContent ?? '').not.toMatch(retired);
    const radios = screen.queryAllByRole('radio');
    if (radios.length) {
      fireEvent.click(radios[0] as HTMLElement);
      expect(document.body.textContent ?? '').not.toMatch(retired);
    }
  });

  it('keeps the retired wording out of both language dictionaries', () => {
    for (const language of ['fr', 'en'] as const) {
      const values = stringsIn(texts[language]);
      expect(values.length).toBeGreaterThan(0);
      values.forEach(value => expect(value).not.toMatch(retired));
    }
  });
});
