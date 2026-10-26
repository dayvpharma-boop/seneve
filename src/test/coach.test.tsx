import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const hd=vi.hoisted(()=>({actif:false}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>hd.actif}));

const tables: Record<string, unknown[]> = {};
const rpcResults: Record<string, { data: unknown; error: { message: string } | null }> = {};
const rpcs: { name: string; args: unknown }[] = [];
function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
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
  hd.actif=false;
  for (const k of Object.keys(tables)) delete tables[k];
  for (const k of Object.keys(rpcResults)) delete rpcResults[k];
  rpcs.length = 0;
  tables['participants'] = [{ langue: 'fr' }];
  tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
  tables['programmes'] = [{ programme_id: 'PROSPECT_LIVRE_7J_FR_V1', duree_jours: 7 }];
  tables['coach_messages'] = [];
  rpcResults['coach_quota'] = { data: { quota: 5, restants: 5 }, error: null };
  rpcResults['coach_eligible_enrollments']={data:['E1'],error:null};
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

describe('Coach : parcours choisi', () => {
  it('suit le parcours ouvert depuis l’espace et permet d’en changer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    tables['enrollments'] = [
      { enrollment_id: 'E1', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', langue: 'fr', date_debut: '2026-10-11', etat: 'active' },
      { enrollment_id: 'E2', programme_id: 'ACHETEUR_FORMATION30_30J_FR_V1', langue: 'fr', date_debut: '2026-10-13', etat: 'active' },
    ];
    tables['programmes'] = [
      { programme_id: 'PROSPECT_LIVRE_7J_FR_V1', nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 },
      { programme_id: 'ACHETEUR_FORMATION30_30J_FR_V1', nom: 'Formation 30 jours', duree_jours: 30 },
    ];
    rpcResults['coach_ask'] = { data: { message_id: 'M9', etat: 'en_attente' }, error: null };
    render(<MemoryRouter initialEntries={['/coach?inscription=E1']}><Routes><Route path="/coach" element={<Coach />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('tab', { name: 'Découverte du livre — 7 jours' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.change(screen.getByPlaceholderText('Ta question…'), { target: { value: 'Une question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(rpcs.find(r => r.name === 'coach_ask')?.args).toMatchObject({ p_enrollment_id: 'E1' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Formation 30 jours' }));
    expect(screen.getByRole('tab', { name: 'Formation 30 jours' })).toHaveAttribute('aria-selected', 'true');
    vi.useRealTimers();
  });
  // Demande du 24/10/2026 : les messages s'accumulaient ; les échanges précédents sont repliés.
  it('replie les échanges précédents et garde le dernier échange ouvert', async () => {
    tables['coach_messages'] = [
      msg({ message_id: 'Q1', texte: 'Première question', cree_le: '2026-10-13T10:00:00Z' }),
      msg({ message_id: 'R1', role: 'coach', etat: 'enregistre', texte: 'Première réponse', cree_le: '2026-10-13T10:01:00Z' }),
      msg({ message_id: 'Q2', texte: 'Deuxième question', cree_le: '2026-10-13T11:00:00Z' }),
      msg({ message_id: 'R2', role: 'coach', etat: 'enregistre', texte: 'Deuxième réponse', cree_le: '2026-10-13T11:01:00Z' }),
    ];
    page();
    expect(await screen.findByText('Deuxième réponse')).toBeVisible();
    expect(screen.getByText('Deuxième question')).toBeVisible();
    const replis = screen.getByText('Messages précédents (2)').closest('details')!;
    expect(replis.open).toBe(false);
    expect(replis).toContainElement(screen.getByText('Première réponse'));
    fireEvent.click(screen.getByText('Messages précédents (2)'));
    expect(replis.open).toBe(true);
  });
  it('rien n’est replié quand il n’y a qu’un échange', async () => {
    tables['coach_messages'] = [msg({}), msg({ message_id: 'R', role: 'coach', etat: 'enregistre', texte: 'Réponse' })];
    page();
    expect(await screen.findByText('Réponse')).toBeVisible();
    expect(screen.queryByText(/Messages précédents/)).not.toBeInTheDocument();
  });
});

it('un parcours Habitudes & Défis seul ne propose aucun formulaire de coach',async()=>{
 hd.actif=true;
 tables['enrollments']=[{enrollment_id:'HD1',programme_id:'HD_FR',langue:'fr',date_debut:'2026-10-26',etat:'active'}];
 tables['hd_programme_links']=[{programme_id:'HD_FR'}];
 rpcResults['coach_quota']={data:{quota:0,restants:0},error:null};
 rpcResults['coach_eligible_enrollments']={data:[],error:null};
 page();await screen.findByText(/Le coach t’accompagne pendant un parcours actif/);expect(screen.queryByRole('textbox')).toBeNull();expect(rpcs.some(x=>x.name==='coach_ask')).toBe(false);expect(fetch).not.toHaveBeenCalled();
});
it('le coach conserve les autres programmes quand Habitudes & Défis est aussi inscrit',async()=>{
 hd.actif=true;tables['enrollments']!.push({enrollment_id:'HD1',programme_id:'HD_FR',langue:'fr',date_debut:'2026-10-26',etat:'active'});
 tables['hd_programme_links']=[{programme_id:'HD_FR'}];page();await screen.findByRole('textbox');expect(screen.queryByRole('tab',{name:'HD_FR'})).toBeNull();expect(fetch).not.toHaveBeenCalled();
});

it('un mois HD payant autorisé par le serveur ouvre le formulaire de coach',async()=>{
 hd.actif=true;tables['enrollments']=[{enrollment_id:'HD2',programme_id:'HD_FR',langue:'fr',date_debut:'2026-10-26',etat:'active'}];
 rpcResults['coach_eligible_enrollments']={data:['HD2'],error:null};
 page();await screen.findByRole('textbox');expect(rpcs.some(x=>x.name==='coach_ask')).toBe(false);expect(fetch).not.toHaveBeenCalled();
});
