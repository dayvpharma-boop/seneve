import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Espace participant, écran « Aujourd'hui » validé par Dr Justin le 15/10/2026
// (fusion de la référence Dribbble et de son essai Stitch) : tuiles des jours, moments illustrés, action dorée,
// questions du journal, page d'un moment et barre du bas.
// Fausse base : chaque table renvoie les lignes fournies, quelle que soit la chaîne de filtres.
const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';

const PROG = 'ACHETEUR_LIVRE_14J_FR_V1';
const content = (jour: number, numero: number) => ({
  content_id: `C-${jour}-${numero}`, programme_id: PROG, version: 2, jour, numero_message: numero,
  theme: `Thème ${jour}.${numero}`, explication: null,
  texte_officiel: numero === 1 ? `Bonjour {prenom} 🌱 Jour ${jour}/14 — Texte du jour ${jour}.` : `{prenom} — moment ${numero} du jour ${jour}.`,
  reference_livre: numero === 1 ? `Page imprimée ${jour}` : null,
});
function base(duree = 14) {
  tables['participants'] = [{ prenom: 'Marie' }];
  tables['programmes'] = [{ programme_id: PROG, nom: 'Accompagnement du livre en français — 14 jours', duree_jours: duree, heures_messages: ['08:00', '13:00', '19:00'] }];
  tables['enrollments'] = [{ enrollment_id: 'E14', programme_id: PROG, version: 2, langue: 'fr', date_debut: '2026-10-13', etat: 'active' }];
  tables['contents'] = [1, 2].flatMap(j => [1, 2, 3].map(n => content(j, n)));
  tables['activities'] = [1, 2].flatMap(j => [
    { activity_id: `A${j}`, content_id: `C-${j}-1`, type_activite: 'action', consigne: `Action du jour ${j}`, obligatoire: true },
    { activity_id: `Q${j}`, content_id: `C-${j}-1`, type_activite: 'question', consigne: `Question du jour ${j} ?`, obligatoire: false },
  ]);
  tables['activity_state'] = [];
  tables['channel_links'] = [];
  tables['goals'] = [];
}
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const ouvrir = (url = '/espace') => render(<MemoryRouter initialEntries={[url]}><Espace /></MemoryRouter>);

describe('Espace — écran « Aujourd’hui »', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-14T13:30:00Z')); base(); }); // jour 2, 14 h 30 à Kinshasa
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('ordre de la page : salutation, tuiles, ta journée, action, journal, réglages, « Se déconnecter »', async () => {
    ouvrir();
    const titre = await screen.findByRole('heading', { level: 1, name: 'Bonjour Marie' });
    const tuile = screen.getByRole('button', { name: 'Jour 2, aujourd’hui' });
    const journee = screen.getByRole('heading', { name: 'Ta journée' });
    const action = screen.getByRole('heading', { name: 'Ton action du jour' });
    const journal = screen.getByRole('heading', { name: 'Écrire dans mon journal' });
    const reglages = screen.getByRole('region', { name: 'Mes réglages' });
    const sortie = screen.getByRole('button', { name: 'Se déconnecter' });
    expect([titre, tuile, journee, action, journal, reglages, sortie].every((x, k, l) => k === 0 || follows(l[k - 1]!, x))).toBe(true);
    // Le texte du jour se lit sur la page du moment, pas sur l'accueil.
    expect(screen.queryByText('Texte du jour 2.')).not.toBeInTheDocument();
    expect(screen.getByText('Action du jour 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai réalisé cette action" })).toHaveClass('btn-or');
  });

  it('tuiles de la semaine : jour du calendrier en doré, jours suivants fermés, nom du jour', async () => {
    tables['activity_state'] = [{ enrollment_id: 'E14', activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-13T10:00:00Z' }];
    ouvrir();
    const auj = await screen.findByRole('button', { name: 'Jour 2, aujourd’hui' });
    expect(auj).toHaveClass('is-today');
    expect(auj).toHaveAttribute('aria-pressed', 'true');
    expect(auj).toHaveTextContent('mer.');
    expect(screen.getByRole('button', { name: 'Jour 1, action réalisée' })).toHaveClass('is-done');
    expect(screen.getByRole('button', { name: 'Jour 3, pas encore ouvert' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Jour 7, pas encore ouvert' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jour 8, pas encore ouvert' })).not.toBeInTheDocument();
    expect(screen.getByText('Jour 2 sur 14')).toBeInTheDocument();
    expect(screen.getByText('Le jour 3 s\'ouvre demain.')).toBeInTheDocument();
  });

  it('« Voir tous les jours » : les 14 tuiles, puis retour à la semaine après un choix', async () => {
    ouvrir();
    const voir = await screen.findByRole('button', { name: 'Voir tous les jours' });
    expect(voir).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(voir);
    expect(voir).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Jour 14, pas encore ouvert' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Jour 1' }));
    expect(screen.getByRole('heading', { name: 'Jour 1' })).toBeInTheDocument();
    expect(voir).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Jour 14, pas encore ouvert' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour 1' })).toHaveClass('is-selected');
  });

  it('moments du jour : 8 h et 13 h ouverts, 19 h fermé avec son heure', async () => {
    ouvrir();
    const matin = await screen.findByRole('article', { name: '8 h — Thème 2.1' });
    expect(within(matin).getByText('8 h · Matin')).toHaveClass('time-chip');
    expect(within(matin).getByRole('button', { name: 'Lire et agir' })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: '13 h — Thème 2.2' })).getByRole('button', { name: 'Lire' })).toBeInTheDocument();
    const soir = screen.getByRole('article', { name: '19 h — Thème 2.3' });
    expect(soir).toHaveClass('is-closed');
    expect(soir).toHaveTextContent('Ce moment s’ouvre à 19 h (heure de Kinshasa).');
    expect(within(soir).queryByRole('button')).not.toBeInTheDocument();
  });

  it('« Lire et agir » : page du moment avec date, texte sans l’en-tête WhatsApp, source, action et question ; « Retour »', async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Lire et agir' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Thème 2.1' })).toBeInTheDocument();
    expect(screen.getByText('Mercredi 14 octobre · 8 h')).toBeInTheDocument();
    expect(screen.getByText('Texte du jour 2.')).toBeInTheDocument();
    expect(screen.queryByText(/Bonjour Marie 🌱/)).not.toBeInTheDocument();
    expect(screen.getByText('Dans le livre : Page imprimée 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai réalisé cette action" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Écrire ma réflexion' })).toHaveAttribute('href', '/journal?inscription=E14&activite=Q2');
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByRole('heading', { name: 'Ta journée' })).toBeInTheDocument();
  });

  it('« Lire » à 13 h : la perle du jour s’ouvre sur sa propre page', async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Lire' }));
    expect(await screen.findByText('Marie — moment 2 du jour 2.')).toBeInTheDocument();
    expect(screen.getByText('Mercredi 14 octobre · 13 h')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai réalisé cette action" })).not.toBeInTheDocument();
  });

  it('lien direct vers un moment pas encore ouvert : message d’attente, pas de texte', async () => {
    ouvrir('/espace?parcours=E14&jour=2&moment=3');
    expect(await screen.findByText('Ce moment s’ouvre à 19 h (heure de Kinshasa).')).toBeInTheDocument();
    expect(screen.queryByText('Marie — moment 3 du jour 2.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(await screen.findByRole('heading', { name: 'Ta journée' })).toBeInTheDocument();
  });

  it('lien direct vers un jour passé : le moment du soir se lit', async () => {
    ouvrir('/espace?parcours=E14&jour=1&moment=3');
    expect(await screen.findByText('Marie — moment 3 du jour 1.')).toBeInTheDocument();
    expect(screen.getByText('Mardi 13 octobre · 19 h')).toBeInTheDocument();
  });

  it('questions du journal : aujourd’hui puis hier, chacune vers le journal', async () => {
    ouvrir();
    const section = (await screen.findByRole('heading', { name: 'Écrire dans mon journal' })).closest('section')!;
    expect(within(section).getByText('Jour 2 · aujourd’hui')).toBeInTheDocument();
    expect(within(section).getByText('Jour 1 · hier')).toBeInTheDocument();
    const liens = within(section).getAllByRole('link', { name: 'Écrire ma réflexion' });
    expect(liens.map(l => l.getAttribute('href'))).toEqual(['/journal?inscription=E14&activite=Q2', '/journal?inscription=E14&activite=Q1']);
    expect(liens[0]).toHaveAccessibleDescription('Question du jour 2 ?');
  });

  it('barre du bas : Aujourd’hui (page actuelle), Parcours, Écrire, Journal, Aide', async () => {
    ouvrir();
    const nav = await screen.findByRole('navigation', { name: 'Navigation principale' });
    const liens = within(nav).getAllByRole('link');
    expect(liens.map(l => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Aujourd’hui', '/espace'], ['Parcours', '/progres'], ['Écrire', '/journal?ecrire=1'], ['Journal', '/journal'], ['Aide', '/aide'],
    ]);
    expect(within(nav).getByRole('link', { name: 'Aujourd’hui' })).toHaveAttribute('aria-current', 'page');
  });

  it('au-delà de 7 jours : les tuiles montrent la semaine du jour affiché', async () => {
    base(30);
    vi.setSystemTime(new Date('2026-10-22T13:30:00Z')); // jour 10
    tables['contents'] = Array.from({ length: 10 }, (_, k) => content(k + 1, 1));
    ouvrir();
    expect(await screen.findByText('Jour 10 sur 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour 8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jour 14, pas encore ouvert' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Jour 7' })).not.toBeInTheDocument();
  });

  it('objectif : un bouton qui ouvre le formulaire à la demande', async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Choisir mon objectif' }));
    expect(screen.getByRole('button', { name: 'Confirmer mon objectif' })).toBeInTheDocument();
  });
});
