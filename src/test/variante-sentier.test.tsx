import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';

// Variante 1 « Sentier » retenue par Dr Justin le 14/10/2026 pour l'accueil et les questions du test.
function widths(): number[] {
  return Array.from(document.querySelectorAll('.segments .segment i')).map(el => parseFloat((el as HTMLElement).style.width));
}

describe('Variante 1 « Sentier » du Test des 7 Racines', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('montre les trois repères rassurants sur l’accueil, en français', () => {
    render(<Index />);
    for (const label of ['Sans compte', '21 questions', 'Retour possible']) expect(screen.getByText(label)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeVisible();
  });

  it('montre les mêmes repères en anglais', () => {
    render(<Index language="en" />);
    for (const label of ['No account', '21 questions', 'You can go back']) expect(screen.getByText(label)).toBeVisible();
  });

  it('remplit une part de progression par racine, question par question', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText('Touche un chiffre : la question suivante s’affiche.')).toBeVisible();
    let w = widths();
    expect(w).toHaveLength(7);
    expect(w[0]).toBeCloseTo(100 / 3);
    expect(w.slice(1).every(x => x === 0)).toBe(true);
    for (let k = 0; k < 3; k++) {
      fireEvent.click(screen.getByRole('button', { name: /^3 sur 5/ }));
      act(() => vi.advanceTimersByTime(160));
    }
    expect(screen.getByText('Question 4 sur 21')).toBeVisible();
    expect(screen.getByText('Racine 2 sur 7')).toBeVisible();
    w = widths();
    expect(w[0]).toBe(100);
    expect(w[1]).toBeCloseTo(100 / 3);
    expect(w[2]).toBe(0);
  });
});
