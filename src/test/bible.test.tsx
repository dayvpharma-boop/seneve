import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BibleAccueil, BibleAnnotations, BibleLecture, BibleRecherche } from '@/routes/bible';
import { BarreNav } from '@/components/BarreNav';
import { LIVRES, analyserReference, annoter, lireAnnotations, morceauxSurlignes, motsRecherche, normaliser } from '@/lib/bible';
import { texts } from '@/lib/test-texts';

// Versets réels (Louis Segond 1910, fichier public/bible/lsg/MAT.json) ; les autres versets du faux livre sont du remplissage.
const MT_13_31 = 'Il leur proposa une autre parabole, et il dit: Le royaume des cieux est semblable à un grain de sénevé qu’un homme a pris et semé dans son champ.';
const MT_13_32 = 'C’est la plus petite de toutes les semences; mais, quand il a poussé, il est plus grand que les légumes et devient un arbre, de sorte que les oiseaux du ciel viennent habiter dans ses branches.';
// Matthew 25:40 (WEB, fichier public/bible/web/MAT.json) commence déjà par un guillemet d’ouverture.
const MT_25_40_WEB = '“The King will answer them, ‘Most certainly I tell you, because you did it to one of the least of these my brothers, you did it to me.’';
const MT_6_33 = 'Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.';
function faux(code: string, version = 'lsg') {
  const livre = LIVRES.find(l => l.code === code)!;
  return Array.from({ length: livre.chapitres }, (_, c) => Array.from({ length: 40 }, (_, v) => {
    if (code === 'MAT' && c === 12 && v === 30) return MT_13_31;
    if (code === 'MAT' && c === 12 && v === 31) return MT_13_32;
    if (code === 'MAT' && c === 5 && v === 32) return MT_6_33;
    if (version === 'web' && code === 'MAT' && c === 24 && v === 39) return MT_25_40_WEB;
    return `Remplissage ${code} ${c + 1}:${v + 1}.`;
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const m = /\/bible\/(lsg|web)\/([0-9A-Z]{3})\.json$/.exec(String(url));
    return m ? new Response(JSON.stringify(faux(m[2]!, m[1])), { status: 200 }) : new Response('', { status: 404 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function JournalRecu() { const l = useLocation(); return <><p>Page du journal</p><pre data-testid="citation">{l.state?.citationBiblique}</pre></>; }

function afficher(chemin: string) {
  return render(<MemoryRouter initialEntries={[chemin]}><Routes>
    <Route path="/bible" element={<BibleAccueil />} />
    <Route path="/bible/recherche" element={<BibleRecherche />} />
    <Route path="/bible/annotations" element={<BibleAnnotations />} />
    <Route path="/bible/:livre/:chapitre" element={<BibleLecture />} />
    <Route path="/journal" element={<JournalRecu />} />
  </Routes></MemoryRouter>);
}

describe('références et recherche', () => {
  it('reconnaît les références usuelles et refuse un chapitre qui n’existe pas', () => {
    const r = (s: string) => analyserReference(s);
    expect(r('Mt 6:33')).toMatchObject({ type: 'reference', ref: { chapitre: 6, verset: 33, livre: { code: 'MAT' } } });
    expect(r('Jean 3:16')).toMatchObject({ type: 'reference', ref: { livre: { code: 'JOH' } } });
    expect(r('1 Jean 4')).toMatchObject({ type: 'reference', ref: { livre: { code: '1JO' }, chapitre: 4 } });
    expect(r('Psaume 23')).toMatchObject({ type: 'reference', ref: { livre: { code: 'PSA' }, chapitre: 23 } });
    expect(r('Luc 16:10-13')).toMatchObject({ type: 'reference', ref: { livre: { code: 'LUK' }, verset: 10, fin: 13 } });
    expect(r('Matthieu 29:1')).toMatchObject({ type: 'chapitre-introuvable', chapitre: 29 });
    expect(r('Matthieu')).toMatchObject({ type: 'livre', livre: { code: 'MAT' } });
    expect(r('sénevé')).toEqual({ type: 'aucune' });
  });

  it('cherche sans tenir compte des accents et surligne les mots trouvés', () => {
    expect(normaliser('Sénevé’s')).toBe("seneve's");
    expect(normaliser(MT_13_31)).toHaveLength(MT_13_31.length);
    const morceaux = morceauxSurlignes(MT_13_31, motsRecherche('senevé'));
    expect(morceaux.filter(m => m.trouve).map(m => m.t)).toEqual(['sénevé']);
    expect(morceaux.map(m => m.t).join('')).toBe(MT_13_31);
  });

  it('contient les 66 livres et leurs 1189 chapitres', () => {
    expect(LIVRES).toHaveLength(66);
    expect(LIVRES.filter(l => l.testament === 'nt')).toHaveLength(27);
    expect(LIVRES.reduce((n, l) => n + l.chapitres, 0)).toBe(1189);
  });

  it('une annotation disparaît quand il ne reste ni couleur, ni note, ni marque-page', () => {
    const base = { livre: 'MAT', chapitre: 13, verset: 32, version: 'lsg' as const, extrait: MT_13_32 };
    annoter(base, { couleur: 'or' });
    annoter(base, { note: 'La foi commence petite.' });
    expect(lireAnnotations()['MAT.13.32']).toMatchObject({ couleur: 'or', note: 'La foi commence petite.' });
    annoter(base, { couleur: undefined });
    expect(lireAnnotations()['MAT.13.32']).toMatchObject({ note: 'La foi commence petite.' });
    annoter(base, { note: '' });
    expect(lireAnnotations()['MAT.13.32']).toBeUndefined();
  });
});

describe('écrans de la Bible', () => {
  it('l’accueil présente les sept vraies racines, sans racine inventée', async () => {
    afficher('/bible');
    for (const r of texts.fr.roots) expect(screen.getByText(r.n)).toBeInTheDocument();
    for (const inventee of ['Agir sans spectateurs', 'Repos dans la promesse', 'Enracinement', 'Obéissance de la foi']) expect(screen.queryByText(inventee)).toBeNull();
    expect(screen.queryByText('Référence à confirmer avec le livre')).toBeNull();
    for (const ref of ['2 Thessaloniciens 3:10 (LSG 1910)', '1 Timothée 6:10 (LSG 1910)', 'Matthieu 25:40 (LSG 1910)', 'Romains 8:14 (LSG 1910)', 'Luc 16:10-13 (LSG 1910)']) expect(screen.getByText(ref)).toBeInTheDocument();
    expect(screen.getByText('Matthieu 6:25-34 (LSG 1910)')).toBeInTheDocument();
    expect(screen.queryByText(/médité|%/)).toBeNull();
  });

  it('un verset qui a déjà son guillemet n’en reçoit pas un second', async () => {
    afficher('/bible?lang=en');
    const citation = await screen.findByText(t => t.startsWith('“The King will answer them'));
    expect(citation.textContent).toBe(`${MT_25_40_WEB}”`);
  });

  it('la barre du bas mène à la Bible et ne contient plus Aide', () => {
    render(<MemoryRouter initialEntries={['/bible']}><BarreNav langue="fr" maquette iconesJournee /></MemoryRouter>);
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    const liens = within(nav).getAllByRole('link').map(a => a.textContent);
    expect(liens).toEqual(['Aujourd’hui', 'Parcours', 'Bibliothèque', 'Bible', 'Journal']);
    expect(within(nav).getByRole('link', { name: 'Bible' })).toHaveAttribute('href', '/bible');
    expect(within(nav).getByRole('link', { name: 'Bible' })).toHaveAttribute('aria-current', 'page');
  });

  it('en anglais, la barre du bas garde l’anglais sur chaque page', () => {
    render(<MemoryRouter initialEntries={['/espace']}><BarreNav langue='en' maquette iconesJournee /></MemoryRouter>);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/espace?lang=en', '/progres?lang=en', '/bibliotheque?lang=en', '/bible?lang=en', '/journal?lang=en']);
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
  });

  it('lit un chapitre, surligne un verset et l’envoie dans le brouillon du journal', async () => {
    afficher('/bible/mat/13');
    expect(await screen.findByText(MT_13_31)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chapitre 13' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Verset 31' }));
    const feuille = screen.getByRole('dialog', { name: 'Matthieu 13:31' });
    fireEvent.click(within(feuille).getByRole('button', { name: 'Surligner en or clair' }));
    expect(lireAnnotations()['MAT.13.31']).toMatchObject({ couleur: 'or', extrait: MT_13_31, version: 'lsg' });
    fireEvent.click(within(feuille).getByRole('button', { name: /Écrire dans mon journal/ }));
    expect(screen.getByText('Page du journal')).toBeInTheDocument();
    const brouillon = screen.getByTestId('citation').textContent ?? '';
    expect(brouillon).toContain(MT_13_31);
    expect(brouillon).toContain('Matthieu 13:31 · Louis Segond 1910');
  });

  it('une note reste sur le téléphone et le dit honnêtement', async () => {
    afficher('/bible/mat/13');
    fireEvent.click(await screen.findByRole('button', { name: 'Verset 32' }));
    fireEvent.click(screen.getByRole('button', { name: /Annoter/ }));
    expect(screen.getByText('Ta note est enregistrée sur ce téléphone.')).toBeInTheDocument();
    expect(screen.queryByText(/strictement confidentiel|dans ton compte/i)).toBeNull();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Dieu donne la croissance.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(lireAnnotations()['MAT.13.32']?.note).toBe('Dieu donne la croissance.');
  });

  it('un chapitre qui n’existe pas affiche la référence introuvable', () => {
    afficher('/bible/mat/29');
    expect(screen.getByRole('heading', { name: 'Cette référence n’existe pas.' })).toBeInTheDocument();
    expect(screen.getByText('Le livre de Matthieu compte 28 chapitres.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aller au dernier chapitre/ })).toHaveAttribute('href', '/bible/mat/28');
  });

  it('la recherche trouve le grain de sénevé et signale une recherche sans résultat', async () => {
    afficher('/bible/recherche?q=sénevé');
    expect(await screen.findByRole('heading', { name: '1 résultat' }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('Matthieu 13:31')).toBeInTheDocument();
    expect(screen.getByText('sénevé', { selector: 'mark' })).toBeInTheDocument();
    cleanup();
    afficher('/bible/recherche?q=introuvablezz');
    expect(await screen.findByRole('heading', { name: 'Aucun résultat trouvé' }, { timeout: 4000 })).toBeInTheDocument();
  });

  it('une référence tapée dans la recherche propose d’y aller', () => {
    afficher('/bible/recherche?q=Mt 6:33');
    expect(screen.getByRole('link', { name: /Accéder/ })).toHaveAttribute('href', '/bible/mat/6?v=33');
  });

  it('les annotations vides expliquent où elles sont gardées', () => {
    afficher('/bible/annotations');
    expect(screen.getByRole('heading', { name: 'Aucun surlignage' })).toBeInTheDocument();
    expect(screen.getByText(/enregistrés sur ce téléphone uniquement/)).toBeInTheDocument();
  });
});
