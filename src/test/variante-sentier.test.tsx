import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { readFileSync } from 'node:fs';

// Lecture directe : dans les tests, un import de feuille de style revient vide.
const css = readFileSync(`${process.cwd()}/src/styles.css`, 'utf8');

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

  it('garde l’échelle et le titre du livre groupés sur une ligne (espaces insécables)', () => {
    render(<Index />);
    expect(document.querySelector('.home-intro')?.textContent).toContain('« Arrête de mendier des miracles »');
    expect(document.querySelector('.home-note')?.textContent).toContain('de 1 (pas du tout) à 5 (tout à fait)');
  });

  it('n’allume pas un chiffre au toucher : l’effet de survol est réservé à la souris', () => {
    const hoverRules = css.split('\n').filter(line => line.includes('.scale-button:hover'));
    expect(hoverRules.length).toBeGreaterThan(0);
    for (const line of hoverRules) expect(line.startsWith('@media (hover:hover) and (pointer:fine)')).toBe(true);
  });

  it('montre les mêmes repères en anglais', () => {
    render(<Index language="en" />);
    for (const label of ['No account', '21 questions', 'You can go back']) expect(screen.getByText(label)).toBeVisible();
  });

  it('remplit une part de progression par racine, question par question', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText('Choisis un chiffre : la question suivante s’affiche aussitôt.')).toBeVisible();
    let w = widths();
    expect(w).toHaveLength(7);
    expect(w[0]).toBeCloseTo(100 / 3);
    expect(w.slice(1).every(x => x === 0)).toBe(true);
    for (let k = 0; k < 3; k++) {
      fireEvent.click(screen.getByRole('button', { name: /^3 sur 5/ }));
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => vi.advanceTimersByTime(400));
    }
    expect(screen.getByText('Question 4 sur 21')).toBeVisible();
    expect(screen.getByText('Racine 2 sur 7')).toBeVisible();
    w = widths();
    expect(w[0]).toBe(100);
    expect(w[1]).toBeCloseTo(100 / 3);
    expect(w[2]).toBe(0);
  });
});
