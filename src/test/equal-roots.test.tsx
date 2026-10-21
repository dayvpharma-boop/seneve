import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { R } from '@/lib/racines';

function finishQuiz(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const total of totals) {
    const value = Math.floor(total / 3);
    const remainder = total % 3;
    for (const answer of [value, value + Number(remainder > 0), value + Number(remainder > 1)]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${answer} sur 5`) }));
      fireEvent.click(screen.getByRole('button', { name: /^(Confirmer et suivant|Confirm and next)$/i }));
      act(() => { vi.advanceTimersByTime(160); });
    }
  }
}
const result = () => document.querySelector('#s-result') as HTMLElement;
const action = () => within(result()).queryByText('Ta première action');

describe('Nouveau résultat et choix libres', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it.each([
    [3, 'Les sept racines sont à développer selon tes réponses. Choisis celle par laquelle tu souhaites commencer.', 'Racine à développer'],
    [6, 'Les sept racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.', 'Racine à développer'],
    [9, 'Les sept racines sont au même niveau selon tes réponses. Choisis celle par laquelle tu souhaites commencer.', 'Racine à consolider'],
    [15, 'Les sept racines sont des points d’appui selon tes réponses. Choisis celle que tu souhaites approfondir.', 'Point d’appui à entretenir'],
  ])('total %i : sept choix sans présélection et catégories exactes', (total, message, category) => {
    render(<Index />);
    finishQuiz(Array(7).fill(total));
    expect(within(result()).getByText(message)).toBeVisible();
    const expand=screen.queryByRole('button',{name:'Voir les 4 autres racines disponibles'});
    if(expand)fireEvent.click(expand);
    const radios = screen.getAllByRole('radio');
    expect(radios.map(radio => radio.getAttribute('aria-label'))).toEqual(R.map(root => root.n));
    for (const radio of radios) expect(radio).toHaveAttribute('aria-checked', 'false');
    expect(action()).not.toBeInTheDocument();
    const rows = within(result()).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    rows.forEach((row, k) => {
      expect(within(row).getByText(R[k]?.n ?? '')).toBeVisible();
      expect(within(row).getByText(`${total} / 15`)).toBeVisible();
      expect(within(row).getByText(category)).toBeVisible();
    });
    expect(result().textContent).not.toMatch(/forte/i);
    expect(within(result()).getByText('Ce résultat repose sur tes réponses du moment. Il propose une orientation pédagogique ; il ne mesure ni ta foi ni ta valeur personnelle.')).toBeVisible();
  });

  it('toutes les réponses à 1 : sélection, changement et remise à zéro', () => {
    render(<Index />);
    finishQuiz(Array(7).fill(3));
    fireEvent.click(screen.getByRole('radio', { name: 'Compassion et Tsedaka' }));
    expect(screen.getByText(R[4]?.a ?? '')).toBeVisible();
    expect(screen.getByText('Livre, annexe 1, jour 17 · Compassion et Tsedaka')).toBeVisible();
    fireEvent.click(screen.getByRole('radio', { name: 'Priorité au Royaume' }));
    expect(screen.getByText(R[0]?.a ?? '')).toBeVisible();
    expect(screen.queryByText(R[4]?.a ?? '')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le test' }));
    finishQuiz(Array(7).fill(3));
    expect(action()).not.toBeInTheDocument();
    screen.getAllByRole('radio').forEach(radio => expect(radio).toHaveAttribute('aria-checked', 'false'));
  });

  it('14 et six 15 : libre choix sans proposition prioritaire', () => {
    render(<Index />);
    finishQuiz([14,15,15,15,15,15,15]);
    expect(screen.getByText('Les sept racines sont des points d’appui selon tes réponses. Choisis celle que tu souhaites approfondir.')).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button',{name:'Voir les 4 autres racines disponibles'}));
    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.queryByText('Nous te proposons de commencer par')).not.toBeInTheDocument();
    expect(action()).not.toBeInTheDocument();
    expect(within(result()).getAllByText('Point d’appui à entretenir')).toHaveLength(7);
  });
});
