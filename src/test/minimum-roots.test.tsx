import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { R } from '@/lib/racines';

function finishQuiz(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const total of totals) {
    const value = Math.floor(total / 3);
    const remainder = total % 3;
    for (const [j, answer] of [value, value + Number(remainder > 0), value + Number(remainder > 1)].entries()) {
      // FR V5 (23/10/2026) : aucune question comptée à l'envers ; on clique la valeur voulue.
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${answer} sur 5`) }));
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => { vi.advanceTimersByTime(400); });
    }
  }
}

describe('Minimum dans le nouveau résultat', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('minimum partagé : uniquement les deux choix, action mise à jour', () => {
    render(<Index />);
    const totals = [15,12,6,12,9,6,12];
    finishQuiz(totals);
    expect(screen.getByText('Plusieurs racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.')).toBeVisible();
    const radios = screen.getAllByRole('radio');
    expect(radios.map(radio => radio.getAttribute('aria-label'))).toEqual(['Travail et intégrité', 'Fidélité dans les petites choses']);
    radios.forEach(radio => expect(radio).toHaveAttribute('aria-checked', 'false'));
    expect(screen.queryByText('Ta première action')).not.toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    rows.forEach((row, k) => expect(within(row).getByText(`${totals[k]} / 15`)).toBeVisible());
    fireEvent.click(screen.getByRole('radio', { name: 'Fidélité dans les petites choses' }));
    expect(screen.getByText(R[5]?.a ?? '')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: 'Travail et intégrité' }));
    expect(screen.getByText(R[2]?.a ?? '')).toBeVisible();
    expect(screen.queryByText(R[5]?.a ?? '')).not.toBeInTheDocument();
  });

  it('conserve la navigation clavier et remet le choix à zéro', () => {
    render(<Index />);
    finishQuiz([15,12,6,12,9,6,12]);
    const work = screen.getByRole('radio', { name: 'Travail et intégrité' });
    const fidelity = screen.getByRole('radio', { name: 'Fidélité dans les petites choses' });
    fireEvent.keyDown(work, { key: 'ArrowRight' });
    expect(fidelity).toHaveAttribute('aria-checked', 'true');
    expect(fidelity).toHaveFocus();
    fireEvent.keyDown(fidelity, { key: 'ArrowRight' });
    expect(work).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(work, { key: 'End' });
    expect(fidelity).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(fidelity, { key: 'Home' });
    expect(work).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le test' }));
    finishQuiz([15,12,6,12,9,6,12]);
    screen.getAllByRole('radio').forEach(radio => expect(radio).toHaveAttribute('aria-checked', 'false'));
    expect(screen.queryByText('Ta première action')).not.toBeInTheDocument();
  });

  it.each([
    [[15,15,9,12,6,9,12], 'Compassion et Tsedaka', 'Racine à développer', 4],
    [[15,12,12,14,11,12,15], 'Compassion et Tsedaka', 'Racine à consolider', 4],
  ] as const)('minimum unique %j : proposition catégorisée et action directe', (totals, name, category, k) => {
    render(<Index />);
    finishQuiz([...totals]);
    const heading = screen.getByRole('heading', { name });
    const card = heading.parentElement;
    if (!card) throw new Error('Carte de proposition absente');
    expect(within(card).getByText('Nous te proposons de commencer par')).toBeVisible();
    expect(within(card).getByText(category)).toBeVisible();
    expect(screen.getByText(R[k]?.a ?? '')).toBeVisible();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(document.querySelector('#s-result')?.textContent).not.toMatch(/forte/i);
  });
});
