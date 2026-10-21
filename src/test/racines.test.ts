import { describe, expect, it } from 'vitest';
import { categorie, compute } from '@/lib/racines';
const answers = (totals: number[]) => totals.flatMap(t => { const n = Math.floor(t / 3); return [n, n, t - 2 * n]; });
describe('Calcul du prototype', () => {
  it('ne calcule pas les réponses incomplètes', () => { expect(compute(Array(21).fill(null))).toBeNull(); });
  it('additionne les trois réponses de chaque racine et conserve les égalités', () => {
    const r = compute(answers([15,15,3,3,9,9,6]));
    expect(r?.t).toEqual([15,15,3,3,9,9,6]);
    expect(r?.fortes).toEqual([0,1]);
    expect(r?.faibles).toEqual([2,3]);
    expect(r?.same).toBe(false);
    expect(r).not.toHaveProperty('proche');
  });
  it('reconnaît les sept racines égales', () => { expect(compute(Array(21).fill(3))?.same).toBe(true); });
});
describe('Catégories', () => {
  it.each([
    [3, 'Racine à développer'], [6, 'Racine à développer'],
    [7, 'Racine à consolider'], [11, 'Racine à consolider'],
    [12, 'Point d’appui à entretenir'], [15, 'Point d’appui à entretenir'],
  ])('total %i → %s', (total, label) => { expect(categorie(total)).toBe(label); });
});
