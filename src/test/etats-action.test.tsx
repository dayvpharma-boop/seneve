import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, unknown[]> = {};
const appels: { etat: string; id: string }[] = [];
let reponse: (etat: string) => { data: unknown; error: unknown } = () => ({ data: null, error: null });
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'limit']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: Record<string, string>) => {
      if (name !== 'record_progress') return Promise.resolve({ data: null, error: null });
      appels.push({ etat: args['p_etat']!, id: args['p_client_event_id']! });
      return Promise.resolve(reponse(args['p_etat']!));
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';

const P = 'PROSPECT_LIVRE_7J_FR_V1';
const ouvrir = () => render(<MemoryRouter><Espace /></MemoryRouter>);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  appels.length = 0;
  reponse = () => ({ data: null, error: null });
  tables['participants'] = [{ prenom: 'Marie' }];
  tables['programmes'] = [{ programme_id: P, nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 }];
  tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
  tables['contents'] = Array.from({ length: 7 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: 'Texte', reference_livre: null }));
  tables['activities'] = [{ activity_id: 'A2', content_id: 'C2', type_activite: 'action', consigne: 'Lis un chapitre.', obligatoire: true }];
  tables['activity_state'] = [];
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Choix sous l’action du jour', () => {
  it('quatre choix proposés tant que rien n’est enregistré', async () => {
    ouvrir();
    expect(await screen.findByRole('button', { name: "J'ai réalisé cette action" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Je l'ai préparée" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Je l'ai faite en partie" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai besoin d'aide" })).toBeInTheDocument();
  });

  it('« préparée » : enregistré, pas compté comme réalisé, les autres choix restent', async () => {
    reponse = () => ({ data: { etat: 'preparee', aide_demandee: false }, error: null });
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: "Je l'ai préparée" }));
    expect(await screen.findByText(/tu l’as préparée. Elle n’est pas encore comptée comme réalisée/)).toBeInTheDocument();
    expect(appels).toEqual([expect.objectContaining({ etat: 'preparee' })]);
    expect(screen.queryByRole('button', { name: "Je l'ai préparée" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Action réalisée/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai réalisé cette action" })).toBeEnabled();
    expect(screen.getByRole('button', { name: "Je l'ai faite en partie" })).toBeEnabled();
  });

  it('« préparée » après une action déjà faite en partie : l’état plus avancé est gardé', async () => {
    tables['activity_state'] = [{ enrollment_id: 'E7', activity_id: 'A2', etat: 'partielle', aide_demandee: false, realisee_le: null }];
    ouvrir();
    expect(await screen.findByText(/tu l’as faite en partie/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Je l'ai préparée" })).not.toBeInTheDocument();
  });

  it('« en partie » : enregistré, l’action reste à terminer', async () => {
    reponse = () => ({ data: { etat: 'partielle', aide_demandee: false }, error: null });
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: "Je l'ai faite en partie" }));
    expect(await screen.findByText(/tu l’as faite en partie/)).toBeInTheDocument();
    expect(appels).toEqual([expect.objectContaining({ etat: 'partielle' })]);
    expect(screen.queryByRole('button', { name: "Je l'ai faite en partie" })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai réalisé cette action" })).toBeEnabled();
  });

  it('« besoin d’aide » : demande transmise à l’équipe, avec lien pour la suivre', async () => {
    reponse = () => ({ data: { etat: 'non_commencee', aide_demandee: true }, error: null });
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: "J'ai besoin d'aide" }));
    expect(await screen.findByText(/transmise à l’équipe d’accompagnement/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suivre ma demande' })).toHaveAttribute('href', '/aide?inscription=E7');
    expect(screen.getByRole('link', { name: 'Demander au coach' })).toHaveAttribute('href', '/coach');
  });

  it('échec puis nouvel essai : même identifiant, donc pas de doublon', async () => {
    reponse = () => ({ data: null, error: { message: 'Failed to fetch' } });
    ouvrir();
    const bouton = await screen.findByRole('button', { name: "Je l'ai faite en partie" });
    fireEvent.click(bouton);
    expect(await screen.findByRole('alert')).toHaveTextContent('Non enregistré');
    reponse = () => ({ data: { etat: 'partielle', aide_demandee: false }, error: null });
    fireEvent.click(screen.getByRole('button', { name: "Je l'ai faite en partie" }));
    await waitFor(() => expect(appels).toHaveLength(2));
    expect(appels[0]!.id).toBe(appels[1]!.id);
  });

  it('action déjà réalisée : plus aucun bouton', async () => {
    tables['activity_state'] = [{ enrollment_id: 'E7', activity_id: 'A2', etat: 'realisee', aide_demandee: true, realisee_le: '2026-10-12T08:00:00Z' }];
    ouvrir();
    expect(await screen.findByText(/Action réalisée le 12 octobre 2026/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai besoin d'aide" })).not.toBeInTheDocument();
  });

  it('état en partie et aide déjà enregistrés : affichés au retour', async () => {
    tables['activity_state'] = [{ enrollment_id: 'E7', activity_id: 'A2', etat: 'partielle', aide_demandee: true, realisee_le: null }];
    ouvrir();
    expect(await screen.findByText(/tu l’as faite en partie/)).toBeInTheDocument();
    expect(screen.getByText(/transmise à l’équipe/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai besoin d'aide" })).not.toBeInTheDocument();
  });
});

describe('Parcours terminé', () => {
  it('message de fin, journées relisibles, actions fermées', async () => {
    vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'terminee' }];
    ouvrir();
    expect(await screen.findByText(/Ce parcours est terminé : les actions sont fermées/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tout déplier' }));
    fireEvent.click(screen.getByRole('link', { name: /^Jour 2 ·/ }));
    expect(await screen.findByText('Lis un chapitre.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai réalisé cette action" })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai besoin d'aide" })).not.toBeInTheDocument();
  });
});

