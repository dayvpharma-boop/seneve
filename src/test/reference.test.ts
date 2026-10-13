import { describe, expect, it } from 'vitest';
import { referenceAffichee } from '@/lib/espace-textes';

describe('référence sous le texte du jour', () => {
  it('suivi du livre : inchangé', () => {
    expect(referenceAffichee('Chapitre 1 — Page imprimée 9', 'fr')).toBe('Dans le livre : Chapitre 1 — Page imprimée 9');
  });
  it('formation : carnet et livre écrits en clair', () => {
    expect(referenceAffichee('C : Comment utiliser ce carnet ; Jour 1 ; Mon engagement. L : Matthieu 6:33 cité p. 9 ; Introduction p. 4-5', 'fr'))
      .toBe('Sources : Carnet de bord : Comment utiliser ce carnet ; Jour 1 ; Mon engagement — Livre : Matthieu 6:33 cité p. 9 ; Introduction p. 4-5');
  });
  it('carnet seul', () => {
    expect(referenceAffichee('C : Jour 7, Bilan de la semaine 1', 'fr')).toBe('Sources : Carnet de bord : Jour 7, Bilan de la semaine 1');
  });
  it('accompagnement : guide aussi', () => {
    expect(referenceAffichee('C : Jour 7, Bilan de la semaine 1 ; Séance 1 avec Dr Justin. G : Fréquence, séance 1', 'fr'))
      .toBe('Sources : Carnet de bord : Jour 7, Bilan de la semaine 1 ; Séance 1 avec Dr Justin — Guide de l’accompagnement : Fréquence, séance 1');
  });
  it('anglais', () => {
    expect(referenceAffichee('C : Day 1. L : Matthew 6:33 p. 9', 'en')).toBe('Sources: Journal: Day 1 — Book: Matthew 6:33 p. 9');
  });
});

import { nomParcours } from '@/lib/espace-textes';
describe('nom des parcours', () => {
  it('livre en anglais', () => expect(nomParcours('Accompagnement du livre en anglais — 14 jours', 'en', 14)).toBe('Book companion — 14 days'));
  it('formation en anglais', () => expect(nomParcours('30-Day Training', 'en', 30)).toBe('30-Day Training'));
  it('français inchangé', () => expect(nomParcours('Accompagnement du livre en français — 14 jours', 'fr', 14)).toBe('Accompagnement du livre — 14 jours'));
});
