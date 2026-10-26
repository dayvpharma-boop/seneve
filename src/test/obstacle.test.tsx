import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bilan, serieObstacle } from '@/lib/progres';

const tables: Record<string, unknown[]> = {};
const appels: Record<string, unknown>[] = [];
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name === 'obstacle_repondre') { appels.push(args); return Promise.resolve({ data: { enregistre: true }, error: null }); }
      return Promise.resolve({ data: null, error: null });
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));
import { Espace } from '@/routes/espace';

const P = 'ACHETEUR_LIVRE_14J_FR_V1';
const contenus = Array.from({ length: 14 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte ${k + 1}`, reference_livre: null }));
const activites = contenus.map(c => ({ activity_id: `A${c.jour}`, content_id: c.content_id, type_activite: 'action', consigne: `Action ${c.jour}`, obligatoire: true }));
const st = (j: number, etat = 'realisee', aide = false) => ({ enrollment_id: 'E1', activity_id: `A${j}`, etat, aide_demandee: aide, realisee_le: etat === 'realisee' ? '2026-10-01T10:00:00Z' : null });
const b = (jour: number, etats: ReturnType<typeof st>[]) => bilan('2026-10-01', 14, contenus, activites, etats, new Date(Date.UTC(2026, 9, jour, 12)));

describe('Obstacle (calcul)', () => {
  it('2 actions passées non faites : question, clé de la série', () => {
    expect(serieObstacle(b(4, [st(1)]), 4)).toBe('2-3');
  });
  it('le jour en cours ne compte pas', () => {
    expect(serieObstacle(b(3, [st(1)]), 3)).toBeNull();
  });
  it('une action faite en partie ou une aide demandée : pas de question', () => {
    expect(serieObstacle(b(4, [st(1), st(3, 'partielle')]), 4)).toBeNull();
    expect(serieObstacle(b(4, [st(1), st(2, 'non_commencee', true)]), 4)).toBeNull();
  });
  it('une action « préparée » n’est pas réalisée', () => {
    expect(serieObstacle(b(4, [st(1), st(2, 'preparee')]), 4)).toBe('2-3');
  });
});

describe('Obstacle (espace)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-04T12:00:00Z'));   // jour 4 ; jours 2 et 3 sans action
    localStorage.clear(); appels.length = 0;
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [{ programme_id: P, nom: 'Accompagnement du livre — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-01', etat: 'active' }];
    tables['contents'] = contenus;
    tables['activities'] = activites;
    tables['activity_state'] = [st(1)];
    tables['goals'] = [];
    tables['obstacles'] = [];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('« pas compris » : réponse envoyée une fois, puis lien vers le coach', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Qu’est-ce qui t’a freiné ces derniers jours ?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Je n’ai pas bien compris l’action'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByRole('link', { name: 'Parler au coach' })).toHaveAttribute('href', '/coach?inscription=E1');
    expect(appels).toEqual([{ p_enrollment_id: 'E1', p_cle: '2-3', p_motif: 'compris' }]);
  });

  it('« situation personnelle » : lien vers la demande d’aide', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText('Une situation personnelle'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByRole('link', { name: 'Demander de l’aide' })).toHaveAttribute('href', '/aide?inscription=E1');
  });

  it('« Pas maintenant » : la question disparaît', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Pas maintenant' }));
    await vi.waitFor(() => expect(screen.queryByText('Qu’est-ce qui t’a freiné ces derniers jours ?')).not.toBeInTheDocument());
    expect(appels).toEqual([{ p_enrollment_id: 'E1', p_cle: '2-3', p_motif: 'plus_tard' }]);
  });

  it('déjà répondu pour cette série : pas de question', async () => {
    tables['obstacles'] = [{ cle: '2-3' }];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect((await screen.findAllByText('Thème 4')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Qu’est-ce qui t’a freiné ces derniers jours ?')).not.toBeInTheDocument();
  });
});
