import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { compteJardin, stadeJardin } from '@/lib/jardin';
import { JardinCard } from '@/components/JardinCard';
import type { Bilan } from '@/lib/progres';

afterEach(cleanup);

describe('Stade du jardin', () => {
  it('graine tant qu’aucune action n’est réalisée', () => {
    expect(stadeJardin(0, 7)).toBe(0);
    expect(stadeJardin(0, 0)).toBe(0);
  });
  it('une première action fait sortir une pousse', () => {
    expect(stadeJardin(1, 7)).toBe(1);
    expect(stadeJardin(1, 90)).toBe(1);
  });
  it('grandit avec les actions, sans jamais devenir arbre avant la dernière', () => {
    expect(stadeJardin(4, 7)).toBe(3);
    expect(stadeJardin(6, 7)).toBe(4);
    expect(stadeJardin(89, 90)).toBe(4);
  });
  it('arbre quand toutes les actions du parcours sont réalisées', () => {
    expect(stadeJardin(7, 7)).toBe(5);
  });
  it('ne recule jamais quand le nombre d’actions réalisées augmente', () => {
    let avant = 0;
    for (let n = 0; n <= 30; n++) { const s = stadeJardin(n, 30); expect(s).toBeGreaterThanOrEqual(avant); avant = s; }
  });
});

describe('Comptage', () => {
  it('seules les actions réalisées comptent ; les jours sans action ne sont pas prévus', () => {
    const b = { jours: [
      { etat: 'realisee' }, { etat: 'partielle' }, { etat: 'preparee' }, { etat: 'non_commencee' }, { etat: null },
    ] } as unknown as Bilan;
    expect(compteJardin(b)).toEqual({ realisees: 1, total: 4 });
  });
});

describe('Carte', () => {
  it('affiche le message, le compte et la promesse de ne jamais faner', () => {
    render(<JardinCard realisees={3} total={7} langue="fr" />);
    expect(screen.getByRole('region', { name: 'Ton sénevé' })).toBeInTheDocument();
    expect(screen.getByText('3 actions réalisées sur 7')).toBeInTheDocument();
    expect(screen.getByText(/ne fane jamais/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Une jeune pousse avec des feuilles' })).toBeInTheDocument();
  });
  it('en anglais', () => {
    render(<JardinCard realisees={7} total={7} langue="en" />);
    expect(screen.getByText('Your mustard seed has become a tree.')).toBeInTheDocument();
    expect(screen.getByText('7 of 7 actions completed')).toBeInTheDocument();
  });
});
