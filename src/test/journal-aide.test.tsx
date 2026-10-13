import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fausse base : lectures par table, et enregistrement de chaque écriture et appel de fonction.
const tables: Record<string, unknown[]> = {};
const writes: { table: string; op: string; value: unknown }[] = [];
const rpcs: { name: string; args: Record<string, unknown> }[] = [];
let rpcError: { message: string } | null = null;
let insertErrors: ({ code: string; message: string } | null)[] = [];

function builder(table: string) {
  const rows = () => tables[table] ?? [];
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: rows()[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(ok, ko);
  b['insert'] = (value: unknown) => { writes.push({ table, op: 'insert', value }); return Promise.resolve({ error: insertErrors.shift() ?? null }); };
  b['update'] = (value: unknown) => { writes.push({ table, op: 'update', value }); return { eq: () => Promise.resolve({ error: null }) }; };
  b['delete'] = () => { writes.push({ table, op: 'delete', value: null }); return { eq: () => Promise.resolve({ error: null }) }; };
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcs.push({ name, args });
      if (name === 'ensure_participant') return Promise.resolve({ data: 'P1', error: null });
      if (name === 'request_help' && rpcError) return Promise.resolve({ data: null, error: rpcError });
      return Promise.resolve({ data: { etat: 'recue' }, error: null });
    },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Journal } from '@/routes/journal';
import { Aide } from '@/routes/aide';
import { peutAnnuler, texteValide } from '@/lib/journal';

function at(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/journal" element={<Journal />} /><Route path="/aide" element={<Aide />} /><Route path="/espace" element={<p>espace</p>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  writes.length = 0; rpcs.length = 0; rpcError = null; insertErrors = [];
  window.localStorage.clear();
  tables['participants'] = [{ prenom: 'Marie', langue: 'fr' }];
  tables['journal_entries'] = [];
  tables['help_requests'] = [];
  tables['enrollments'] = [];
});
afterEach(() => cleanup());

describe('règles', () => {
  it('texte vide ou trop long refusé', () => {
    expect(texteValide('   ', 10)).toBeNull();
    expect(texteValide('a'.repeat(11), 10)).toBeNull();
    expect(texteValide('  bonjour ', 10)).toBe('bonjour');
  });
  it('annulation possible tant que la demande n’est pas close', () => {
    expect(peutAnnuler('recue')).toBe(true);
    expect(peutAnnuler('attente_participant')).toBe(true);
    expect(peutAnnuler('resolue')).toBe(false);
    expect(peutAnnuler('annulee')).toBe(false);
  });
});

describe('Mon journal', () => {
  it('note privée par défaut : le coach IA n’y a pas accès sans accord', async () => {
    at('/journal');
    expect(await screen.findByText(/toi seul peux le lire/)).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: /Le coach IA peut lire cette note/ });
    expect(box).not.toBeChecked();
    fireEvent.change(screen.getByPlaceholderText(/Ce que tu as compris/), { target: { value: '  Ma note  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    const w = writes.find(x => x.op === 'insert')!.value as Record<string, unknown>;
    expect(w).toMatchObject({ participant_id: 'P1', texte: 'Ma note', usage_ia_autorise: false, enrollment_id: null, activity_id: null });
  });

  it('nouvelle tentative après échec : même identifiant, aucune note en double', async () => {
    insertErrors = [{ code: '08006', message: 'network' }, null];
    at('/journal');
    fireEvent.change(await screen.findByPlaceholderText(/Ce que tu as compris/), { target: { value: 'Note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText(/Non enregistrée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    const ids = writes.filter(x => x.op === 'insert').map(x => (x.value as { entry_id: string }).entry_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
  });

  it('réponse à la question du jour : la note est liée à l’activité', async () => {
    tables['activities'] = [{ consigne: 'Qu’as-tu appris ?' }];
    at('/journal?inscription=E1&activite=A1');
    expect(await screen.findByText('Qu’as-tu appris ?')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Ce que tu as compris/), { target: { value: 'Réponse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    await screen.findByText('Note enregistrée.');
    expect(writes[0]!.value).toMatchObject({ enrollment_id: 'E1', activity_id: 'A1' });
  });

  it('le brouillon reste sur l’appareil tant qu’il n’est pas enregistré', async () => {
    at('/journal');
    fireEvent.change(await screen.findByPlaceholderText(/Ce que tu as compris/), { target: { value: 'en cours' } });
    expect(screen.getByText(/Brouillon conservé sur cet appareil/)).toBeInTheDocument();
    cleanup();
    at('/journal');
    expect(await screen.findByDisplayValue('en cours')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });

  it('l’accès du coach IA se change note par note ; suppression après confirmation', async () => {
    tables['journal_entries'] = [{ entry_id: 'N1', texte: 'Ancienne note', usage_ia_autorise: false, cree_le: '2026-10-12T08:00:00Z', modifie_le: '2026-10-12T08:00:00Z', activity_id: null }];
    at('/journal');
    expect(await screen.findByText('Privée, même pour le coach IA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Autoriser le coach IA' }));
    await waitFor(() => expect(writes).toContainEqual({ table: 'journal_entries', op: 'update', value: { usage_ia_autorise: true } }));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(writes.some(x => x.op === 'delete')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    await waitFor(() => expect(writes.some(x => x.op === 'delete')).toBe(true));
  });
});

describe('Besoin d’aide', () => {
  it('message de sécurité visible, sans délai de réponse promis', async () => {
    at('/aide');
    expect(await screen.findByText(/contacte les services d’urgence/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+\s*(h|heures|minutes|jours)\b/i);
  });

  it('seules les notes cochées sont jointes ; nouvel envoi = même identifiant', async () => {
    tables['journal_entries'] = [
      { entry_id: 'N1', texte: 'Note un', cree_le: '2026-10-12T08:00:00Z' },
      { entry_id: 'N2', texte: 'Note deux', cree_le: '2026-10-11T08:00:00Z' },
    ];
    rpcError = { message: 'Failed to fetch' };
    at('/aide');
    fireEvent.change(await screen.findByPlaceholderText(/Par exemple/), { target: { value: 'Je bloque' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Note deux/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText(/Demande non envoyée/)).toBeInTheDocument();
    rpcError = null;
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText(/Demande envoyée/)).toBeInTheDocument();
    const calls = rpcs.filter(x => x.name === 'request_help');
    expect(calls).toHaveLength(2);
    expect(calls[0]!.args['p_client_request_id']).toBe(calls[1]!.args['p_client_request_id']);
    expect(calls[1]!.args).toMatchObject({ p_motif: 'Je bloque', p_entry_ids: ['N2'], p_enrollment_id: null });
  });

  it('suivi des demandes : état, réponse et annulation', async () => {
    tables['help_requests'] = [
      { request_id: 'R1', motif: 'Première', etat: 'resolue', reponse: 'Voici une piste.', extraits_partages: null, cree_le: '2026-10-10T08:00:00Z' },
      { request_id: 'R2', motif: 'Seconde', etat: 'recue', reponse: null, extraits_partages: null, cree_le: '2026-10-12T08:00:00Z' },
    ];
    at('/aide');
    expect(await screen.findByText('Résolue')).toBeInTheDocument();
    expect(screen.getByText('Voici une piste.')).toBeInTheDocument();
    const cancels = screen.getAllByRole('button', { name: 'Annuler cette demande' });
    expect(cancels).toHaveLength(1);
    fireEvent.click(cancels[0]!);
    await waitFor(() => expect(rpcs).toContainEqual({ name: 'cancel_help_request', args: { p_request_id: 'R2' } }));
  });

  it('participant anglophone : page en anglais', async () => {
    tables['participants'] = [{ prenom: 'Mary', langue: 'en' }];
    at('/aide');
    expect(await screen.findByRole('heading', { name: 'Need help?' })).toBeInTheDocument();
  });
});
