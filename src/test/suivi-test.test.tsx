import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index, TestPage } from '@/routes/index';
import { chooseRoot, cleanSource, recordVisit, submitResult } from '@/lib/suivi-test';

// Réponses de 1 à 5, trois par racine, dans l'ordre des 21 questions.
function answerAll(values: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const v of values) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${v} sur 5`) }));
    { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
    act(() => vi.advanceTimersByTime(400));
  }
}
// Réponses FR V5 (23/10/2026) : aucune question comptée à l'envers.
// Totaux ajustés : uniqueMin → 15, 9, 4, 12, 14, 6, 9 (minimum unique) ; tie → 15, 3, 3, 12, 14, 6, 9 (égalité racines 2 et 3).
const uniqueMin = [5,5,5, 3,3,3, 1,2,1, 4,4,4, 5,4,5, 2,2,2, 3,3,3];
const tie = [5,5,5, 1,1,1, 1,1,1, 4,4,4, 5,4,5, 2,2,2, 3,3,3];

describe('Source lue dans l’adresse', () => {
  it.each([
    ['tt', 'tt'], [' TT ', 'tt'], ['whatsapp_statut', 'whatsapp_statut'], ['ig-reel', 'ig-reel'],
    ['', null], [null, null], ['<script>', null], ['a'.repeat(33), null], ['tik tok', null],
  ])('%s → %s', (value, expected) => { expect(cleanSource(value)).toBe(expected); });
});

describe('Suivi anonyme du test', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('compte une seule ouverture, avec la source de l’adresse', () => {
    render(<MemoryRouter initialEntries={['/?src=TT']}><Routes><Route path="/" element={<TestPage />} /></Routes></MemoryRouter>);
    expect(recordVisit).toHaveBeenCalledTimes(1);
    expect(recordVisit).toHaveBeenCalledWith('tt', 'fr');
  });

  it('l’adresse courte /p des images partagées compte la provenance « partage »', () => {
    render(<MemoryRouter initialEntries={['/p']}><Routes><Route path="/p" element={<TestPage defaultSource="partage" />} /></Routes></MemoryRouter>);
    expect(recordVisit).toHaveBeenCalledWith('partage', 'fr');
  });

  it('compte une visite en anglais quand on clique sur « English », une seule fois par langue', () => {
    render(<MemoryRouter initialEntries={['/?src=tt']}><Routes><Route path="/" element={<TestPage />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('link', { name: 'English' }));
    fireEvent.click(screen.getByRole('link', { name: 'Français' }));
    expect(recordVisit).toHaveBeenCalledTimes(2);
    expect(recordVisit).toHaveBeenNthCalledWith(1, 'tt', 'fr');
    expect(recordVisit).toHaveBeenNthCalledWith(2, 'tt', 'en');
  });

  it('garde la source quand on passe en anglais', () => {
    render(<MemoryRouter initialEntries={['/?src=tt']}><Routes><Route path="/" element={<TestPage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/?lang=en&src=tt');
  });

  it('n’enregistre rien avant la fin du test', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    for (let k = 0; k < 20; k++) {
      fireEvent.click(screen.getByRole('button', { name: /^3 sur 5/ }));
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => vi.advanceTimersByTime(400));
    }
    expect(submitResult).not.toHaveBeenCalled();
  });

  it('enregistre une seule fois les 21 réponses à la fin', () => {
    render(<Index source="tt" />);
    answerAll(uniqueMin);
    expect(submitResult).toHaveBeenCalledTimes(1);
    expect(submitResult).toHaveBeenCalledWith(uniqueMin, 'tt', 'fr');
  });

  it('enregistre un nouveau résultat quand on refait le test', () => {
    render(<Index />);
    answerAll(uniqueMin);
    fireEvent.click(screen.getByRole('button', { name: 'Refaire le test' }));
    answerAll(tie);
    expect(submitResult).toHaveBeenCalledTimes(2);
  });

  it('enregistre la racine choisie en cas d’égalité', async () => {
    render(<Index />);
    answerAll(tie);
    fireEvent.click(screen.getByRole('radio', { name: 'Travail et intégrité' }));
    await act(async () => { for (let n = 0; n < 5; n++) await Promise.resolve(); });
    expect(chooseRoot).toHaveBeenCalledWith('resultat-test', 2);
  });

  it('le test fonctionne même si l’enregistrement échoue', () => {
    vi.mocked(submitResult).mockResolvedValueOnce(null);
    render(<Index />);
    answerAll(uniqueMin);
    expect(screen.getByRole('heading', { name: "Tes racines aujourd'hui" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuer sur WhatsApp' })).toBeInTheDocument();
  });
});
