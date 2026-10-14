import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Espace participant, disposition « Sentier » validée par Dr Justin le 15/10/2026.
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
  reference_livre: null,
});
function base(duree = 14) {
  tables['participants'] = [{ prenom: 'Marie' }];
  tables['programmes'] = [{ programme_id: PROG, nom: 'Accompagnement du livre en français — 14 jours', duree_jours: duree, heures_messages: ['08:00', '13:00', '19:00'] }];
  tables['enrollments'] = [{ enrollment_id: 'E14', programme_id: PROG, version: 2, langue: 'fr', date_debut: '2026-10-13', etat: 'active' }];
  tables['contents'] = [1, 2].flatMap(j => [1, 2, 3].map(n => content(j, n)));
  tables['activities'] = [1, 2].map(j => ({ activity_id: `A${j}`, content_id: `C-${j}-1`, type_activite: 'action', consigne: `Action du jour ${j}`, obligatoire: true }));
  tables['activity_state'] = [];
  tables['channel_links'] = [];
  tables['goals'] = [];
}
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Espace « Sentier »', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-14T13:30:00Z')); base(); }); // jour 2, 14 h 30 à Kinshasa
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('texte du jour sans l’en-tête WhatsApp, puis action, autres moments, outils, réglages et « Se déconnecter » en bas', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    const texte = await screen.findByText('Texte du jour 2.');
    expect(screen.queryByText(/Bonjour Marie 🌱 Jour 2\/14/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Bonjour Marie' })).toBeInTheDocument();
    const action = screen.getByText('Action du jour 2');
    const moments = screen.getByText('Les autres moments du jour');
    const journal = screen.getByRole('link', { name: 'Ouvrir mon journal' });
    const reglages = screen.getByRole('region', { name: 'Mes réglages' });
    const sortie = screen.getByRole('button', { name: 'Se déconnecter' });
    expect(follows(texte, action) && follows(action, moments) && follows(moments, journal) && follows(journal, reglages) && follows(reglages, sortie)).toBe(true);
    expect(screen.getByText('8 h')).toHaveClass('time-chip');
  });

  it('progression en parts : une par jour, le jour du calendrier en doré', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByText('Jour 2 sur 14');
    const parts = Array.from(document.querySelectorAll('.today-segments .segment'));
    expect(parts).toHaveLength(14);
    expect(parts.map(p => (p.querySelector('i') as HTMLElement).style.width)).toEqual(['100%', '100%', ...Array(12).fill('0%')]);
    expect(parts.map(p => p.classList.contains('is-today'))).toEqual([false, true, ...Array(12).fill(false)]);
  });

  it('au-delà de 21 jours : une barre continue au lieu des parts', async () => {
    base(30);
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByText('Jour 2 sur 30');
    expect(document.querySelector('.today-segments')).toBeNull();
    expect(parseFloat((document.querySelector('.today-bar i') as HTMLElement).style.width)).toBeCloseTo((2 / 30) * 100);
  });

  it('jour précédent / suivant, et grille de tous les jours repliée par défaut', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByText('Texte du jour 2.');
    expect(screen.getByRole('button', { name: 'Jour suivant : jour 3' })).toBeDisabled();
    const voir = screen.getByRole('button', { name: 'Voir tous les jours' });
    expect(voir).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Jour 14, pas encore ouvert' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jour précédent : jour 1' }));
    expect(screen.getByText('Texte du jour 1.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jour précédent/ })).not.toBeInTheDocument();

    fireEvent.click(voir);
    expect(voir).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Jour 14, pas encore ouvert' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Jour 2' }));
    expect(screen.getByText('Texte du jour 2.')).toBeInTheDocument();
    expect(voir).toHaveAttribute('aria-expanded', 'false');
  });

  it('moment pas encore ouvert : une seule ligne avec l’heure et le thème', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByText('Texte du jour 2.');
    const soir = screen.getByRole('article', { name: '19 h — Thème 2.3' });
    expect(soir).toHaveClass('moment-closed');
    expect(soir).toHaveTextContent('Ce moment s’ouvre à 19 h (heure de Kinshasa).');
    expect(screen.getByRole('article', { name: '13 h — Thème 2.2' })).toHaveTextContent('Marie — moment 2 du jour 2.');
  });

  it('objectif : un bouton qui ouvre le formulaire à la demande', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Choisir mon objectif' }));
    expect(screen.getByRole('button', { name: 'Confirmer mon objectif' })).toBeInTheDocument();
  });
});
