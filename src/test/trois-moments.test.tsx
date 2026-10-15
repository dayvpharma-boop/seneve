import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { heureKinshasa, momentVisible } from '@/lib/espace';
import { bilan } from '@/lib/progres';

const PROG = 'ACHETEUR_LIVRE_14J_FR_V1';
const THEMES: Record<number, string> = { 1: 'Enseignement', 2: 'La perle du jour', 3: 'Prière et pensée du soir' };
const content = (programme_id: string, jour: number, numero: number) => ({
  content_id: `${programme_id}-${jour}-${numero}`, programme_id, version: 2, jour, numero_message: numero,
  theme: `${THEMES[numero]} ${jour}`, explication: null, texte_officiel: `{prenom} — texte du jour ${jour}, moment ${numero}.`,
  reference_livre: numero === 1 ? null : `Ch. 1 (p. ${10 + numero})`,
});
// Le message 2 est volontairement placé avant le message 1 : l'ordre reçu ne doit rien changer.
const deuxJours = (programme_id: string) => [1, 2].flatMap(j => [content(programme_id, j, 2), content(programme_id, j, 1), content(programme_id, j, 3)]);

function base(heures: string[] | null, langue = 'fr', programme_id = PROG) {
  tables['participants'] = [{ prenom: 'Marie' }];
  tables['programmes'] = [{ programme_id, nom: 'Accompagnement du livre en français — 14 jours', duree_jours: 14, heures_messages: heures }];
  tables['enrollments'] = [{ enrollment_id: 'E14', programme_id, version: 2, langue, date_debut: '2026-10-13', etat: 'active' }];
  tables['contents'] = deuxJours(programme_id);
  tables['activities'] = [1, 2].map(j => ({ activity_id: `A${j}`, content_id: `${programme_id}-${j}-1`, type_activite: 'action', consigne: `Action du jour ${j}`, obligatoire: true }));
  tables['activity_state'] = [];
  tables['channel_links'] = [];
}

const ouvrir = (url = '/espace') => render(<MemoryRouter initialEntries={[url]}><Espace /></MemoryRouter>);

describe('Trois moments par jour dans l’espace', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('jour en cours, 10 h à Kinshasa : seul le message du matin est ouvert', async () => {
    vi.setSystemTime(new Date('2026-10-14T09:00:00Z')); // 10 h à Kinshasa, jour 2
    base(['08:00', '13:00', '19:00']);
    ouvrir();
    expect(await screen.findByText('Jour 2 sur 14')).toBeInTheDocument();
    expect(screen.getByText('Action du jour 2')).toBeInTheDocument();
    expect(screen.getByText('La perle du jour 2')).toBeInTheDocument();
    expect(screen.getByText('Ce moment s’ouvre à 13 h (heure de Kinshasa).')).toBeInTheDocument();
    expect(screen.getByText('Ce moment s’ouvre à 19 h (heure de Kinshasa).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lire et agir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lire' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lire et agir' }));
    expect(await screen.findByText('Marie — texte du jour 2, moment 1.')).toBeInTheDocument();
  });

  it('lien direct vers la perle du jour avant 13 h : fermée', async () => {
    vi.setSystemTime(new Date('2026-10-14T09:00:00Z'));
    base(['08:00', '13:00', '19:00']);
    ouvrir('/espace?jour=2&moment=2');
    expect(await screen.findByText('Ce moment s’ouvre à 13 h (heure de Kinshasa).')).toBeInTheDocument();
    expect(screen.queryByText('Marie — texte du jour 2, moment 2.')).not.toBeInTheDocument();
  });

  it('13 h 30 : la perle du jour est ouverte, le moment du soir reste fermé', async () => {
    vi.setSystemTime(new Date('2026-10-14T12:30:00Z'));
    base(['08:00', '13:00', '19:00']);
    ouvrir();
    expect(await screen.findByText('13 h · Midi')).toBeInTheDocument();
    expect(screen.getByText('Ce moment s’ouvre à 19 h (heure de Kinshasa).')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lire' }));
    expect(await screen.findByText('Marie — texte du jour 2, moment 2.')).toBeInTheDocument();
    expect(screen.getByText('Dans le livre : Ch. 1 (p. 12)')).toBeInTheDocument();
  });

  it('jour précédent : les trois moments sont lisibles', async () => {
    vi.setSystemTime(new Date('2026-10-14T09:00:00Z'));
    base(['08:00', '13:00', '19:00']);
    ouvrir();
    await screen.findByText('Jour 2 sur 14');
    fireEvent.click(screen.getByRole('button', { name: 'Voir tous les jours' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jour 1' }));
    expect(screen.queryByText(/Ce moment s’ouvre/)).not.toBeInTheDocument();
    const lire = screen.getAllByRole('button', { name: 'Lire' });
    expect(lire).toHaveLength(2);
    fireEvent.click(lire[1]!);
    expect(await screen.findByText('Marie — texte du jour 1, moment 3.')).toBeInTheDocument();
  });

  it('sans horaires publiés : tous les moments du jour sont ouverts', async () => {
    vi.setSystemTime(new Date('2026-10-14T06:00:00Z'));
    base(null);
    ouvrir();
    expect(await screen.findByText('Moment 2')).toBeInTheDocument();
    expect(screen.getByText('Moment 3')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Lire' })).toHaveLength(2);
    expect(screen.queryByText(/Ce moment s’ouvre/)).not.toBeInTheDocument();
  });

  it('parcours anglais : libellés en anglais', async () => {
    vi.setSystemTime(new Date('2026-10-14T09:00:00Z'));
    base(['08:00', '13:00', '19:00'], 'en', 'ACHETEUR_LIVRE_14J_EN_V1');
    ouvrir();
    expect(await screen.findByText('Day 2 of 14')).toBeInTheDocument();
    expect(screen.getByText('This moment opens at 13:00 (Kinshasa time).')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Read and act' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('un seul message par jour (programme publié avant) : une seule grande carte', async () => {
    vi.setSystemTime(new Date('2026-10-14T09:00:00Z'));
    base(null);
    tables['contents'] = [1, 2].map(j => ({ ...content(PROG, j, 1), version: 2 }));
    ouvrir();
    expect(await screen.findByRole('button', { name: 'Lire et agir' })).toBeInTheDocument();
    expect(document.querySelector('.moment-rail')).toHaveClass('is-seul');
    expect(screen.queryByText(/Moment 1|Moment 2|13 h|Ce moment s’ouvre/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lire et agir' }));
    expect(await screen.findByText('Marie — texte du jour 2, moment 1.')).toBeInTheDocument();
  });
});

describe('Règles des moments', () => {
  it('heure de Kinshasa (UTC+1)', () => {
    expect(heureKinshasa(new Date('2026-10-14T11:59:00Z'))).toBe('12:59');
    expect(heureKinshasa(new Date('2026-10-14T23:30:00Z'))).toBe('00:30');
  });

  it('visibilité selon le jour et l’horaire', () => {
    const midi = new Date('2026-10-14T11:00:00Z'); // 12 h à Kinshasa
    expect(momentVisible('13:00', 2, 2, false, midi)).toBe(false);
    expect(momentVisible('12:00', 2, 2, false, midi)).toBe(true);
    expect(momentVisible('13:00', 1, 2, false, midi)).toBe(true);
    expect(momentVisible('13:00', 2, 2, true, midi)).toBe(true);
    expect(momentVisible(null, 2, 2, false, midi)).toBe(true);
    expect(momentVisible('13h', 2, 2, false, midi)).toBe(true);
  });

  it('bilan : une seule action par jour, thème du message 1', () => {
    const contenus = deuxJours(PROG);
    const activites = [1, 2].map(j => ({ activity_id: `A${j}`, content_id: `${PROG}-${j}-1`, type_activite: 'action' }));
    const etats = [{ activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-13T10:00:00Z' }];
    const b = bilan('2026-10-13', 14, contenus, activites, etats, new Date('2026-10-14T09:00:00Z'));
    expect(b.actionsOuvertes).toBe(2);
    expect(b.realisees).toBe(1);
    expect(b.jours[0]?.theme).toBe('Enseignement 1');
  });
});
