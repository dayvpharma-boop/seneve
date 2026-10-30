import { describe, expect, it } from 'vitest';
import { compteMemorise, effacerMemoire, garderEnMemoire, lireEnMemoire, memoireFraiche, memoriserCompte, modifierEnMemoire } from '@/lib/memoire-pages';
import { effacerEspaces } from '@/lib/hors-ligne';

describe('Mémoire des pages pendant la visite (30/10/2026)', () => {
  it('chaque compte a sa propre mémoire', () => {
    garderEnMemoire('espace', 'U1', { a: 1 });
    expect(lireEnMemoire('espace', 'U1')?.donnees).toEqual({ a: 1 });
    expect(lireEnMemoire('espace', 'U2')).toBeNull();
    expect(lireEnMemoire('progres', 'U1')).toBeNull();
  });

  it('une action notée modifie la mémoire sans la rajeunir', () => {
    garderEnMemoire('espace', 'U1', { n: 1 }, 1000);
    modifierEnMemoire<{ n: number }>('espace', 'U1', d => ({ n: d.n + 1 }));
    expect(lireEnMemoire('espace', 'U1')).toEqual({ le: 1000, donnees: { n: 2 } });
  });

  it('30 minutes au plus, et même journée', () => {
    const t = new Date('2026-10-30T10:00:00').getTime();
    expect(memoireFraiche(t, t + 29 * 60000)).toBe(true);
    expect(memoireFraiche(t, t + 30 * 60000)).toBe(false);
    const soir = new Date('2026-10-30T23:50:00').getTime();
    expect(memoireFraiche(soir, soir + 15 * 60000)).toBe(false);
  });

  it('la déconnexion efface la mémoire et le compte retenu', () => {
    garderEnMemoire('progres', 'U1', {});
    memoriserCompte('U1');
    effacerEspaces();
    expect(lireEnMemoire('progres', 'U1')).toBeNull();
    expect(compteMemorise()).toBeUndefined();
    effacerMemoire();
  });
});
