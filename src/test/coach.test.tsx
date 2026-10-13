import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tables: Record<string, unknown[]> = {};
const rpcResults: Record<string, { data: unknown; error: { message: string } | null }> = {};
const rpcs: { name: string; args: unknown }[] = [];
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
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { user_metadata: { prenom: 'Marie' } } } } }) },
    rpc: (name: string, args: unknown) => {
      rpcs.push({ name, args });
      if (name === 'ensure_participant') return Promise.resolve({ data: 'P1', error: null });
      return Promise.resolve(rpcResults[name] ?? { data: null, error: null });
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Coach } from '@/routes/coach';
import { enAttente, reveillerCoach, COACH_WEBHOOK, type CoachMessage } from '@/lib/coach';

const msg = (o: Partial<CoachMessage>): CoachMessage => ({ message_id: 'M1', role: 'participant', texte: 'Question', etat: 'repondu', cree_le: '2026-10-13T14:00:00Z', question_id: null, ...o });

function page() {
  return render(<MemoryRouter initialEntries={['/coach']}><Routes><Route path="/coach" element={<Coach />} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(rpcResults)) delete rpcResults[k];
  rpcs.length = 0;
  tables['participants'] = [{ langue: 'fr' }];
  tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
  tables['programmes'] = [{ programme_id: 'PROSPECT_LIVRE_7J_FR_V1', duree_jours: 7 }];
  tables['coach_messages'] = [];
  rpcResults['coach_quota'] = { data: { quota: 5, restants: 5 }, error: null };
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('règles', () => {
  it('une question sans réponse est en attente', () => {
    expect(enAttente([msg({ etat: 'en_traitement' })])).toBe(true);
    expect(enAttente([msg({ etat: 'repondu' }), msg({ role: 'coach', etat: 'enregistre' })])).toBe(false);
    expect(enAttente([msg({ etat: 'echec' })])).toBe(false);
  });
  it('le réveil de n8n n’envoie aucune donnée', () => {
    const f = vi.fn(() => Promise.resolve(new Response(null)));
    reveillerCoach(f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledWith(COACH_WEBHOOK, { method: 'POST', mode: 'no-cors', keepalive: true });
  });
});

describe('Coach', () => {
  it('avertissement IA, conservation et quota visibles', async () => {
    page();
    expect(await screen.findByText(/intelligence artificielle/)).toBeInTheDocument();
    expect(screen.getByText(/conservés jusqu’à ce que tu les effaces/)).toBeInTheDocument();
    expect(screen.getByText('5 messages sur 5 restants aujourd’hui.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demander de l’aide' })).toHaveAttribute('href', '/aide?inscription=E1');
  });

  it('envoi : même identifiant si on réessaie, puis réveil de n8n', async () => {
    rpcResults['coach_ask'] = { data: null, error: { message: 'Failed to fetch' } };
    page();
    fireEvent.change(await screen.findByPlaceholderText('Ta question…'), { target: { value: 'Que veut dire ce passage ?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText(/Message non envoyé/)).toBeInTheDocument();
    rpcResults['coach_ask'] = { data: { message_id: 'M9', etat: 'en_attente' }, error: null };
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(rpcs.filter(r => r.name === 'coach_ask')).toHaveLength(2));
    const [a, b] = rpcs.filter(r => r.name === 'coach_ask').map(r => r.args as Record<string, unknown>);
    expect(a!['p_client_message_id']).toBe(b!['p_client_message_id']);
    expect(b).toMatchObject({ p_enrollment_id: 'E1', p_texte: 'Que veut dire ce passage ?' });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('quota atteint : saisie bloquée, journée toujours accessible', async () => {
    rpcResults['coach_quota'] = { data: { quota: 5, restants: 0 }, error: null };
    page();
    expect(await screen.findByText(/Tu as utilisé tes messages du jour/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ta question…')).toBeDisabled();
  });

  it('réponse en attente et échec affichés clairement', async () => {
    tables['coach_messages'] = [
      msg({ message_id: 'A', etat: 'echec', texte: 'Première' }),
      msg({ message_id: 'B', etat: 'en_attente', texte: 'Seconde' }),
    ];
    page();
    expect(await screen.findByText('Le coach prépare sa réponse…')).toBeInTheDocument();
    expect(screen.getByText(/ne compte pas dans ta limite du jour/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  });

  it('effacer la conversation demande une confirmation', async () => {
    tables['coach_messages'] = [msg({}), msg({ message_id: 'R', role: 'coach', etat: 'enregistre', texte: 'Réponse' })];
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'Effacer toute la conversation' }));
    expect(rpcs.some(r => r.name === 'coach_clear')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, effacer' }));
    await waitFor(() => expect(rpcs.some(r => r.name === 'coach_clear')).toBe(true));
  });

  it('sans parcours actif : pas de saisie', async () => {
    tables['enrollments'] = [];
    page();
    expect(await screen.findByText(/pendant un parcours actif/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Ta question…')).not.toBeInTheDocument();
  });
});
