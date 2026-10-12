import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { categorie, compute } from '@/lib/racines';
import { languageFrom, texts, whatsappUrls } from '@/lib/test-texts';

function finish(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  for (const total of totals) {
    const n = Math.floor(total / 3), remainder = total % 3;
    for (const answer of [n, n + Number(remainder > 0), n + Number(remainder > 1)]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${answer} out of 5`) }));
      act(() => vi.advanceTimersByTime(160));
    }
  }
}
describe('English test with unchanged rules', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('defaults to French and accepts only the explicit English language', () => {
    expect(languageFrom(undefined)).toBe('fr');
    expect(languageFrom('fr')).toBe('fr');
    expect(languageFrom('en')).toBe('en');
    expect(languageFrom('de')).toBe('fr');
  });
  it.each([[3,'Root to develop'],[6,'Root to develop'],[7,'Root to strengthen'],[11,'Root to strengthen'],[12,'Strength to maintain'],[15,'Strength to maintain']])('category at %i', (total, category) => {
    expect(categorie(Number(total), 'en')).toBe(category);
  });
  it('runs all 21 questions in order, requires a choice and updates the action', () => {
    render(<Index language="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    texts.en.questions.forEach((question, i) => {
      expect(document.querySelector('#qtext')?.textContent).toBe(question);
      expect(screen.getByText(`Question ${i + 1} of 21`)).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: '1 out of 5 (never)' }));
      act(() => vi.advanceTimersByTime(160));
    });
    expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(texts.en.roots.map(root => root.n));
    screen.getAllByRole('radio').forEach(radio => expect(radio).toHaveAttribute('aria-checked', 'false'));
    expect(screen.queryByText('Your first action')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continue on WhatsApp' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Compassion and Tzedakah' }));
    expect(screen.getByText('Visit a widow, an orphan, or a lonely person in your circle.')).toBeVisible();
    expect(screen.getByText('Book, Appendix 1, Day 17 · Compassion and Tzedakah')).toBeVisible();
    const link = screen.getByRole('link', { name: 'Continue on WhatsApp' });
    expect(new URL(link.getAttribute('href') ?? '').searchParams.get('text')).toBe('Hello, I have just taken the 7 Roots Test. I would like to discover the free 7-day journey.');
    const result = document.querySelector('#s-result');
    if (!(result instanceof HTMLElement)) throw new Error('Result missing');
    const visible = result.textContent ?? '';
    for (const frenchRoot of texts.fr.roots) expect(visible).not.toContain(frenchRoot.n);
    expect(visible).not.toMatch(/Ta première action|Selon tes réponses|Livre, annexe|Continuer sur WhatsApp|Racine à/);
    fireEvent.click(screen.getByRole('radio', { name: 'Work and Integrity' }));
    expect(screen.getByText(texts.en.roots[2]?.a ?? '')).toBeVisible();
    expect(screen.queryByText(texts.en.roots[4]?.a ?? '')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Take the test again' }));
    finish(Array(7).fill(3));
    expect(screen.queryByText('Your first action')).not.toBeInTheDocument();
  });
  it.each([
    [[3,3,3,3,3,3,3],7], [[9,9,9,9,9,9,9],7],
    [[15,15,15,15,15,15,15],7], [[14,15,15,15,15,15,15],7],
    [[15,12,6,12,9,6,12],2], [[15,15,9,12,6,9,12],0],
  ])('preserves selection rules for %j', (totals, count) => {
    render(<Index language="en" />);
    finish(totals);
    expect(screen.queryAllByRole('radio')).toHaveLength(count);
    const rows = screen.getAllByRole('listitem');
    rows.forEach((row, i) => expect(within(row).getByText(`${totals[i]} / 15`)).toBeVisible());
    expect(screen.queryByText('Your first action') !== null).toBe(count === 0);
    expect(compute(totals.flatMap(total => { const n = Math.floor(total/3); return [n,n,total-2*n]; }))?.t).toEqual(totals);
  });
  it('uses fixed distinct WhatsApp messages without participant data', () => {
    expect(new URL(whatsappUrls.en).searchParams.get('text')).toBe('Hello, I have just taken the 7 Roots Test. I would like to discover the free 7-day journey.');
    expect(new URL(whatsappUrls.fr).searchParams.get('text')).toBe('Bonjour, je viens de faire le Test des 7 Racines. Je souhaite découvrir le parcours gratuit de 7 jours.');
  });
});
