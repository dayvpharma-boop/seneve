import { afterEach, expect, it, vi } from 'vitest';
import { LIVRES, RECHERCHE_EN_PARALLELE, rechercher } from '@/lib/bible';

// Fichier séparé : les livres déjà chargés par bible.test.tsx restent en mémoire et fausseraient le décompte.
afterEach(() => { vi.unstubAllGlobals(); });

function fauxReseau() {
  const etat = { enCours: 0, maximum: 0, appels: 0 };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    etat.appels++; etat.enCours++; etat.maximum = Math.max(etat.maximum, etat.enCours);
    await new Promise(r => setTimeout(r, 2));
    etat.enCours--;
    const code = /([0-9A-Z]{3})\.json$/.exec(String(url))![1];
    const verset = code === 'GEN' || code === 'JOH' ? 'Au commencement était la Parole.' : 'Remplissage.';
    return new Response(JSON.stringify([[verset]]), { status: 200 });
  }));
  return etat;
}

it('télécharge plusieurs livres à la fois et garde les résultats dans l’ordre de la Bible', async () => {
  const reseau = fauxReseau();
  const avancement: number[] = [];
  const resultats = await rechercher('lsg', 'commencement', n => avancement.push(n), () => false);
  expect(reseau.maximum).toBeGreaterThan(1);
  expect(reseau.maximum).toBeLessThanOrEqual(RECHERCHE_EN_PARALLELE);
  expect(reseau.appels).toBe(LIVRES.length);
  expect(resultats.map(r => r.livre.code)).toEqual(['GEN', 'JOH']);
  expect(avancement).toEqual(LIVRES.map((_, i) => i + 1));
});

it('une recherche abandonnée ne télécharge pas toute la Bible', async () => {
  const reseau = fauxReseau();
  let lus = 0;
  await rechercher('web', 'commencement', n => { lus = n; }, () => lus >= 1);
  expect(lus).toBe(1);
  expect(reseau.appels).toBeLessThanOrEqual(RECHERCHE_EN_PARALLELE + 1);
});
