import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Index } from '@/routes/index';
import { submitResult } from '@/lib/suivi-test';

// Décision du 22/10/2026 : choisir une réponse passe aussitôt à la question suivante ;
// un seul bouton « Voir mon résultat » apparaît quand les 21 réponses sont choisies.
const voirResultat = () => screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i });
const repondre = (n: number) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${n} sur 5`) }));

describe('Choisir une réponse passe à la question suivante', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it.each(['fr', 'en'] as const)('un choix affiche la question suivante, sans bouton à confirmer (%s)', language => {
    render(<Index language={language} />);
    fireEvent.click(screen.getByRole('button', { name: language === 'fr' ? 'Commencer' : 'Start' }));
    expect(screen.queryByRole('button', { name: /Confirmer et suivant|Confirm and next/i })).toBeNull();
    expect(voirResultat()).toBeNull();
    const choix = (n: number) => screen.getByRole('button', { name: new RegExp(`^${n} ${language === 'fr' ? 'sur' : 'out of'} 5`) });
    fireEvent.click(choix(4));
    expect(screen.getByText(language === 'fr' ? 'Question 2 sur 21' : 'Question 2 of 21')).toBeVisible();
    expect(voirResultat()).toBeNull();
    expect(submitResult).not.toHaveBeenCalled();
  });

  it('compte les questions de la racine en cours, puis recommence à trois', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    for (const reste of [3, 2, 1]) {
      expect(screen.getByText(`${reste} question${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''}`)).toBeVisible();
      repondre(3);
    }
    expect(screen.getByText('Question 4 sur 21')).toBeVisible();
    expect(screen.getByText('3 questions restantes')).toHaveAttribute('aria-label', '3 questions restantes dans cette racine');
    expect(screen.getByRole('heading', { name: 'Dîme et offrande' })).toBeVisible();
  });

  it('permet de revenir et de corriger une réponse sans perdre les choix suivants', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    repondre(3);
    repondre(2);
    fireEvent.click(screen.getByRole('button', { name: '← Question précédente' }));
    fireEvent.click(screen.getByRole('button', { name: '← Question précédente' }));
    expect(screen.getByRole('button', { name: /^3 sur 5/ })).toHaveAttribute('aria-pressed', 'true');
    repondre(5);
    expect(screen.getByText('Question 2 sur 21')).toBeVisible();
    expect(screen.getByRole('button', { name: /^2 sur 5/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('montre « Voir mon résultat » seulement après la 21e réponse, puis enregistre une seule fois', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    for (let n = 0; n < 20; n++) repondre(1);
    expect(screen.getByText('Question 21 sur 21')).toBeVisible();
    expect(voirResultat()).toBeNull();
    repondre(1);
    expect(screen.getByText('Question 21 sur 21')).toBeVisible();
    expect(submitResult).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: "Tes racines aujourd'hui" })).not.toBeInTheDocument();
    fireEvent.click(voirResultat()!);
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
