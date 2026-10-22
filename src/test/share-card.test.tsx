import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawCard, shareAddress, strengthKind, type CardContent } from '@/lib/carte-partage';

vi.mock('@/lib/carte-partage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/carte-partage')>();
  return { ...actual, renderCard: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))) };
});
import { renderCard } from '@/lib/carte-partage';
import { Index } from '@/routes/index';

/** Faux pinceau : garde tout le texte écrit sur l'image. */
function fakeContext() {
  const written: string[] = [];
  const noop = () => {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, key) {
      if (key === 'fillText') return (text: string) => { written.push(text); };
      if (key === 'measureText') return (text: string) => ({ width: text.length * 20 });
      if (key in target) return target[key as string];
      return noop;
    },
    set(target, key, value) { target[key as string] = value; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, written };
}
const content: CardContent = {
  brand: 'SÉNEVÉ', title: 'Le Test des 7 Racines', book: 'D’après « Arrête de mendier des miracles »',
  strength: { label: 'Mon point d’appui', name: 'Dîme et offrande' },
  start: { label: 'Je commence par', name: 'Liberté face à l’argent' },
  question: 'Et toi, quelle est ta racine ?', address: 'exemple.org/seneve/p',
};

describe('Image à partager — contenu', () => {
  it.each([[15, 'appui'], [12, 'appui'], [11, 'solide'], [7, 'solide'], [6, null], [3, null]])('total %i → %s', (total, kind) => {
    expect(strengthKind(total)).toBe(kind);
  });

  it('affiche l’adresse courte /p et garde la langue anglaise', () => {
    expect(shareAddress('exemple.org', '/seneve/', 'fr')).toBe('exemple.org/seneve/p');
    expect(shareAddress('exemple.org', '/', 'en')).toBe('exemple.org/p?lang=en');
  });

  it.each(['vertical', 'carre'] as const)('format %s : les deux racines, l’invitation, l’adresse, et aucune note', (format) => {
    const { ctx, written } = fakeContext();
    drawCard(ctx, format, content);
    const all = written.join(' ');
    expect(all).toContain('Dîme et offrande');
    expect(all).toContain('Liberté face à l’argent');
    expect(all).toContain('Et toi, quelle est ta racine ?');
    expect(all).toContain('exemple.org/seneve/p');
    expect(all).not.toMatch(/\d+\s*\/\s*15/);
  });
});

// Réponses de 1 à 5, trois par racine.
function finish(totals: number[]) {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  for (const total of totals) {
    const n = Math.floor(total / 3), r = total % 3;
    for (const [j, v] of [n, n + Number(r > 0), n + Number(r > 1)].entries()) {
      // FR V4 : la première affirmation de chaque racine compte à l'envers (6 - réponse) ; on clique donc 6 - valeur voulue.
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${j === 0 ? 6 - v : v} sur 5`) }));
      { const fin = screen.queryByRole('button', { name: /^(Voir mon résultat|See my result)$/i }); if (fin) fireEvent.click(fin); }
      act(() => vi.advanceTimersByTime(400));
    }
  }
  ouvrirPartage();
}
// L'image de partage est repliée : on ouvre la section comme le ferait la personne.
function ouvrirPartage() {
  act(() => { const d = document.querySelector('details.partage-repli') as HTMLDetailsElement | null; if (d && !d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } });
}
const lastContent = () => vi.mocked(renderCard).mock.calls.at(-1)?.[1];
const flush = () => act(async () => { for (let n = 0; n < 5; n++) await Promise.resolve(); });

describe('Image à partager — page de résultat', () => {
  it('est repliée par défaut et ne se dessine qu’à l’ouverture', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    // FR V4 : la première affirmation de chaque racine compte à l'envers (6 - réponse) ; on clique donc 6 - valeur voulue.
    for (const v of [1,5,5, 2,4,4, 4,2,2, 3,3,3, 2,4,3, 5,2,1, 3,4,3]) { fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${v} sur 5`) })); act(() => vi.advanceTimersByTime(400)); }
    fireEvent.click(screen.getByRole('button', { name: 'Voir mon résultat' }));
    const repli = document.querySelector('details.partage-repli') as HTMLDetailsElement;
    expect(repli.open).toBe(false);
    expect(screen.getByText('Partager mon résultat en image')).toBeVisible();
    expect(renderCard).not.toHaveBeenCalled();
    ouvrirPartage();
    expect(screen.getByText('Partager')).toBeInTheDocument();
    cleanup();
  });

  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:apercu');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('prépare automatiquement l’aperçu local du résultat', async () => {
    render(<Index />);
    finish([7, 13, 8, 4, 13, 13, 7]);
    expect(screen.getByText('Partager')).toBeVisible();
    await flush();
    expect(renderCard).toHaveBeenCalled();
  });

  it('montre la racine de départ et permet de masquer le point d’appui', async () => {
    render(<Index />);
    finish([7, 15, 8, 4, 13, 12, 7]);
    await flush();
    expect(lastContent()?.strength).toEqual({ label: 'Mon point d’appui', name: 'Dîme et offrande' });
    expect(lastContent()?.start?.name).toBe("Liberté face à l'argent");
    expect(screen.getByRole('img', { name: 'Aperçu de ton image' })).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Afficher ma racine d’appui' }));
    await flush();
    expect(lastContent()?.start).toEqual({ label: 'Je commence par', name: 'Liberté face à l\'argent' });
    expect(lastContent()?.strength).toBeUndefined();
  });

  it('en cas d’égalité en haut, la personne choisit la racine à montrer', async () => {
    render(<Index />);
    finish([7, 13, 8, 4, 13, 13, 7]);
    await flush();
    expect(screen.getByText('Plusieurs racines sont aussi solides. Choisis celle à montrer :')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Fidélité dans les petites choses' }));
    await flush();
    expect(lastContent()?.strength?.name).toBe('Fidélité dans les petites choses');
  });

  it('change de format', async () => {
    render(<Index />);
    finish([7, 15, 8, 4, 13, 12, 7]);
    await flush();
    expect(vi.mocked(renderCard).mock.calls.at(-1)?.[0]).toBe('vertical');
    fireEvent.click(screen.getByRole('button', { name: /^Carré/ }));
    await flush();
    expect(vi.mocked(renderCard).mock.calls.at(-1)?.[0]).toBe('carre');
  });

  it('sans aucun point d’appui, l’image montre la racine par laquelle on commence', async () => {
    render(<Index />);
    finish([6, 5, 4, 3, 6, 5, 6]);
    await flush();
    expect(lastContent()?.strength).toBeUndefined();
    expect(lastContent()?.start?.name).toBe('Liberté face à l\'argent');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('Image noir et or',()=>{it('n’inclut aucun score et affiche les deux noms choisis',()=>{const {ctx,written}=fakeContext();drawCard(ctx,'vertical',{...content,design:'editorial'});const all=written.join(' ');expect(all).toContain('Liberté face à l’argent');expect(all).toContain('Dîme et offrande');expect(all).not.toMatch(/\d+\s*\/\s*15/);});});
