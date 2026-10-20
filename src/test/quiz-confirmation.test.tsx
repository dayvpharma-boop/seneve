import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { submitResult } from '@/lib/suivi-test';

const confirmer = () => screen.getByRole('button', { name: /^(Confirmer et suivant|Confirm and next)$/i });
const repondre = (n: number) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${n} sur 5`) }));

describe('Choisir puis confirmer chaque réponse', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it.each(['fr', 'en'] as const)('attend un choix puis une confirmation explicite (%s)', language => {
    render(<Index language={language} />);
    fireEvent.click(screen.getByRole('button', { name: language === 'fr' ? 'Commencer' : 'Start' }));
    expect(confirmer()).toBeVisible();
    expect(confirmer()).toBeDisabled();
    fireEvent.click(confirmer());
    const premiere = language === 'fr' ? 'Question 1 sur 21' : 'Question 1 of 21';
    expect(screen.getByText(premiere)).toBeVisible();
    const choix = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n} ${language === 'fr' ? 'sur' : 'out of'} 5`) });
    fireEvent.click(choix(2));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(premiere)).toBeVisible();
    expect(choix(2)).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(choix(4));
    expect(choix(2)).toHaveAttribute('aria-pressed', 'false');
    expect(choix(4)).toHaveAttribute('aria-pressed', 'true');
    expect(confirmer()).toBeEnabled();
    fireEvent.click(confirmer());
    expect(screen.getByText(language === 'fr' ? 'Question 2 sur 21' : 'Question 2 of 21')).toBeVisible();
    expect(confirmer()).toBeDisabled();
    expect(submitResult).not.toHaveBeenCalled();
  });

  it('compte les questions de la racine en cours, puis recommence à trois', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    for (const reste of [3, 2, 1]) {
      expect(screen.getByText(`${reste} question${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''}`)).toBeVisible();
      repondre(3);
      fireEvent.click(confirmer());
    }
    expect(screen.getByText('Question 4 sur 21')).toBeVisible();
    expect(screen.getByText('3 questions restantes')).toHaveAttribute('aria-label', '3 questions restantes dans cette racine');
    expect(screen.getByRole('heading', { name: 'Dîme et offrande' })).toBeVisible();
  });

  it('permet de revenir et de corriger une réponse sans perdre les choix suivants', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    repondre(3);
    fireEvent.click(confirmer());
    repondre(2);
    fireEvent.click(screen.getByRole('button', { name: '← Question précédente' }));
    expect(screen.getByRole('button', { name: /^3 sur 5/ })).toHaveAttribute('aria-pressed', 'true');
    repondre(5);
    fireEvent.click(confirmer());
    expect(screen.getByText('Question 2 sur 21')).toBeVisible();
    expect(screen.getByRole('button', { name: /^2 sur 5/ })).toHaveAttribute('aria-pressed', 'true');
    expect(confirmer()).toBeEnabled();
    fireEvent.click(confirmer());
    expect(screen.getByText('Question 3 sur 21')).toBeVisible();
    expect(confirmer()).toBeDisabled();
  });

  it('calcule et enregistre le résultat seulement après la confirmation de la 21e réponse', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    for (let n = 0; n < 20; n++) { repondre(1); fireEvent.click(confirmer()); }
    repondre(1);
    expect(screen.getByText('Question 21 sur 21')).toBeVisible();
    expect(submitResult).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: "Tes racines aujourd'hui" })).not.toBeInTheDocument();
    fireEvent.click(confirmer());
    expect(screen.getByRole('heading', { name: "Tes racines aujourd'hui" })).toBeVisible();
    expect(submitResult).toHaveBeenCalledTimes(1);
    expect(submitResult).toHaveBeenCalledWith(Array(21).fill(1), null, 'fr');
  });

  it('explique l’enregistrement anonyme et donne accès à la confidentialité', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByText(/Tes réponses restent confidentielles.*statistiques anonymes/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute('href', `${import.meta.env.BASE_URL}confidentialite`);
    expect(document.querySelector('.quiz-confidentialite')?.textContent).not.toContain('sur ton appareil');
  });
});
