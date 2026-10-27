import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, Record<string, unknown>[]> = {};
let metadata: Record<string, string> = { prenom: 'Marie' };
let erreurDemarrage = false;
const appels: string[] = [];
function inscrire(langue: string, etat = 'active', jour = '2026-10-25') {
  const programme_id = `PROSPECT_LIVRE_7J_${langue.toUpperCase()}_V1`;
  tables.enrollments = [{ enrollment_id: 'E7', programme_id, version: 1, langue, date_debut: jour, etat }];
  tables.programmes = [{ programme_id, nom: 'Découverte', duree_jours: 7 }];
  tables.contents = Array.from({ length: 7 }, (_, i) => ({ content_id: `C${i + 1}`, programme_id, version: 1, jour: i + 1, numero_message: 1, theme: `Pas ${i + 1}`, texte_officiel: `Lecture du jour ${i + 1}.` }));
}
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
  b.maybeSingle = () => Promise.resolve({ data: tables[table]?.[0] ?? null, error: null });
  b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: metadata } } } }) },
    from: (table: string) => builder(table),
    rpc: (name: string, args?: { p_langue: string }) => {
      appels.push(name);
      if (name === 'start_discovery') {
        if (erreurDemarrage) return Promise.resolve({ error: { message: 'Indisponible' } });
        inscrire(args!.p_langue);
      }
      return Promise.resolve({ data: null, error: null });
    },
  },
  siteUrl: (p: string) => p,
}));
import { Espace } from '@/routes/espace';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T12:00:00Z'));
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.lang = 'fr';
  for (const k of Object.keys(tables)) delete tables[k];
  tables.participants = [{ prenom: 'Marie' }];
  metadata = { prenom: 'Marie' }; appels.length = 0; erreurDemarrage = false;
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Premier accès : Découverte sans clic supplémentaire', () => {
  it('ouvre le jour 1 français après la création du participant et la vérification des achats', async () => {
    render(<MemoryRouter initialEntries={['/espace']}><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 1 sur 7')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Commencer ma Découverte' })).not.toBeInTheDocument();
    expect(appels.indexOf('ensure_participant')).toBeLessThan(appels.indexOf('start_discovery'));
    expect(appels.indexOf('claim_my_purchases')).toBeLessThan(appels.indexOf('start_discovery'));
    expect(appels.filter(n => n === 'start_discovery')).toHaveLength(1);
  });
  it('respecte la langue anglaise du compte après confirmation par e-mail', async () => {
    metadata.langue = 'en';
    render(<MemoryRouter initialEntries={['/espace']}><Espace /></MemoryRouter>);
    expect(await screen.findByText('Day 1 of 7')).toBeInTheDocument();
    expect(tables.enrollments?.[0]?.langue).toBe('en');
  });
  it('respecte la langue choisie sur la page de connexion', async () => {
    render(<MemoryRouter initialEntries={['/espace?lang=en']}><Espace /></MemoryRouter>);
    expect(await screen.findByText('Day 1 of 7')).toBeInTheDocument();
  });
  it('ne redémarre pas une découverte existante et garde son jour atteint', async () => {
    inscrire('fr', 'active', '2026-10-23');
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 3 sur 7')).toBeInTheDocument();
    expect(appels).not.toContain('start_discovery');
  });
  it('ne réinscrit pas automatiquement une personne ayant arrêté son parcours', async () => {
    inscrire('fr', 'annulee');
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Commencer ma Découverte' });
    expect(appels).not.toContain('start_discovery');
  });
  it('affiche une erreur réessayable si le démarrage échoue', async () => {
    erreurDemarrage = true;
    render(<MemoryRouter><Espace /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Impossible de charger ta journée pour le moment.'));
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});

