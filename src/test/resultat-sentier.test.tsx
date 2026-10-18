import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { R } from '@/lib/racines';

// Écran du résultat, ordre « Sentier » validé par Dr Justin le 14/10/2026.
function finishQuiz(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const total of totals) {
    const value = Math.floor(total / 3);
    const remainder = total % 3;
    for (const answer of [value, value + Number(remainder > 0), value + Number(remainder > 1)]) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${answer} sur 5`) }));
      act(() => { vi.advanceTimersByTime(160); });
    }
  }
}
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const cardOf = (text: string) => screen.getByText(text).closest('.card') as HTMLElement;

describe('Résultat « Sentier »', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('montre d’abord la racine proposée, l’action et WhatsApp, puis les 7 racines, puis le partage', () => {
    render(<Index />);
    finishQuiz([11, 7, 13, 9, 6, 12, 10]);
    const hero = cardOf('Nous te proposons de commencer par');
    const action = cardOf('Ta première action');
    const whatsapp = cardOf('Aller plus loin');
    const roots = cardOf('Tes 7 racines');
    const share = cardOf('Partager');
    expect(within(hero).getByRole('heading', { name: R[4]?.n ?? '' })).toBeVisible();
    expect(within(hero).getByText('Racine à développer')).toHaveClass('cat-chip');
    expect(follows(hero, action) && follows(action, whatsapp) && follows(whatsapp, roots) && follows(roots, share)).toBe(true);
    // Le résultat mène aussi à l'espace du site, sous WhatsApp (15/10/2026).
    const espace = within(whatsapp).getByRole('link', { name: 'Créer mon espace' });
    expect(espace).toHaveAttribute('href', `${import.meta.env.BASE_URL}connexion`);
    expect(follows(within(whatsapp).getByRole('link', { name: 'Continuer sur WhatsApp' }), espace)).toBe(true);
    // Même encadré doré que l'action du jour de l'espace.
    expect(action.querySelector('.action-box .action')).not.toBeNull();
  });

  it('dessine une barre par racine, proportionnelle au score, et met en avant la racine proposée', () => {
    render(<Index />);
    const totals = [11, 7, 13, 9, 6, 12, 10];
    finishQuiz(totals);
    const rows = within(cardOf('Tes 7 racines')).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    rows.forEach((row, k) => {
      expect(within(row).getByText(`${totals[k]} / 15`)).toBeVisible();
      const bar = row.querySelector('.root-bar') as HTMLElement;
      expect(bar).toHaveAttribute('aria-hidden', 'true');
      expect(parseFloat((bar.querySelector('i') as HTMLElement).style.width)).toBeCloseTo(((totals[k] ?? 0) / 15) * 100);
      expect(row.classList.contains('is-start')).toBe(k === 4);
    });
  });

  it('en cas d’égalité, la liste reste visible et la racine choisie est mise en avant après le choix', () => {
    render(<Index />);
    finishQuiz([15, 12, 6, 12, 9, 6, 12]);
    const rows = () => within(cardOf('Tes 7 racines')).getAllByRole('listitem');
    expect(rows().some(row => row.classList.contains('is-start'))).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: 'Fidélité dans les petites choses' }));
    expect(rows().map(row => row.classList.contains('is-start'))).toEqual([false, false, false, false, false, true, false]);
  });

  it('affiche le titre de la liste en anglais', () => {
    render(<Index language="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    for (let k = 0; k < 21; k++) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${k < 3 ? 1 : 4} out of 5`) }));
      act(() => { vi.advanceTimersByTime(160); });
    }
    expect(screen.getByText('Your 7 roots')).toBeVisible();
    expect(screen.queryByText('Tes 7 racines')).not.toBeInTheDocument();
    // Depuis le 18/10/2026, la page de connexion existe en anglais : le résultat anglais y mène.
    expect(screen.getByRole('link', { name: 'Create my space' })).toHaveAttribute('href', `${import.meta.env.BASE_URL}connexion?lang=en`);
  });
});
