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
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => { vi.advanceTimersByTime(400); });
    }
  }
}

const PREFIX = 'https://wa.me/243844211119?text=';
const MESSAGE = 'Bonjour, je viens de faire le Test des 7 Racines. Je souhaite découvrir le parcours gratuit de 7 jours.';
const BODY = 'Reçois gratuitement le parcours Découverte de 7 jours sur WhatsApp. Tu écris toi-même le premier message et tu peux arrêter à tout moment en envoyant STOP.';
const NOTE = 'Ce résultat repose sur tes réponses du moment. Il propose une orientation pédagogique ; il ne mesure ni ta foi ni ta valeur personnelle.';

const card = () => screen.getByText('Aller plus loin').closest('.card') as HTMLElement;
const link = () => within(card()).getByRole('link', { name: 'Continuer sur WhatsApp' }) as HTMLAnchorElement;

describe('Carte « Aller plus loin »', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('l’invitation reste visible avant le choix d’une racine, sans la carte « Aller plus loin » (24/10/2026)', () => {
    render(<Index />);
    finishQuiz([15, 12, 6, 12, 9, 6, 12]);
    expect(screen.getByRole('button', { name: 'Envoyer l’invitation' })).toBeVisible();
    expect(screen.queryByText('Aller plus loin')).not.toBeInTheDocument();
    expect(screen.queryByText('Ta première action')).not.toBeInTheDocument();
  });

  it('le détail s’ouvre juste sous la racine choisie, avec « Continuer en créant un compte » (24/10/2026)', () => {
    render(<Index />);
    finishQuiz([15, 12, 6, 12, 9, 6, 12]);
    const choix = screen.getByRole('radio', { name: 'Fidélité dans les petites choses' });
    fireEvent.click(choix);
    const detail = choix.nextElementSibling as HTMLElement;
    expect(detail).toHaveClass('choix-detail');
    expect(within(detail).getByText('Ta première action')).toBeVisible();
    expect(within(detail).getByRole('link', { name: 'Continuer en créant un compte' })).toHaveAttribute('href', expect.stringMatching(/\/connexion$/));
  });

  it('absente tant qu’aucune action n’est affichée, puis placée entre l’action et la précision finale', () => {
    render(<Index />);
    finishQuiz([15, 12, 6, 12, 9, 6, 12]);
    expect(screen.queryByText('Aller plus loin')).not.toBeInTheDocument();
    expect(screen.queryByText(BODY)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Continuer sur WhatsApp' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Fidélité dans les petites choses' }));
    expect(screen.getByText('Aller plus loin')).toBeVisible();
    expect(within(card()).getByText(BODY)).toBeVisible();
    const actionCard = screen.getByText('Ta première action').closest('.card') as HTMLElement;
    const note = screen.getByText(NOTE);
    expect(actionCard.compareDocumentPosition(card()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card().compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('présente directement dans le cas du minimum unique, href exact et sans donnée personnelle', () => {
    render(<Index />);
    finishQuiz([15, 15, 9, 12, 6, 9, 12]);
    expect(screen.getByText('Aller plus loin')).toBeVisible();
    const anchor = link();
    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    const href = anchor.getAttribute('href') ?? '';
    expect(href.startsWith(PREFIX)).toBe(true);
    const decoded = decodeURIComponent(href.slice(PREFIX.length));
    expect(decoded).toBe(MESSAGE);
    for (const root of R) expect(decoded).not.toContain(root.n);
    for (const category of ['Racine à développer', 'Racine à consolider', 'Point d’appui à entretenir']) expect(decoded).not.toContain(category);
    expect(decoded).not.toMatch(/\d+\s*\/\s*15/);
  });
});
