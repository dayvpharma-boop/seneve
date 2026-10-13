import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fausse base : chaque fonction renvoie la valeur prévue ; tous les appels sont enregistrés.
const results: Record<string, { data: unknown; error: { message: string } | null }> = {};
const calls: { name: string; args: unknown }[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { user_metadata: {} } } } }) },
    rpc: (name: string, args: unknown) => { calls.push({ name, args }); return Promise.resolve(results[name] ?? { data: null, error: null }); },
  },
  siteUrl: (p: string) => p,
}));

import { Admin } from '@/routes/admin';
import { erreurAdmin, filtrer, lienWhatsApp, type StaffRequest } from '@/lib/admin';

const req = (over: Partial<StaffRequest>): StaffRequest => ({
  request_id: 'R1', cree_le: '2026-10-13T13:42:00Z', modifie_le: '2026-10-13T13:42:00.123456+00:00', etat: 'recue',
  motif: 'Je bloque sur le jour 3', extraits_partages: null, reponse: null, affecte_a: null, affecte_email: null,
  prenom: 'Marie', langue: 'fr', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', email: 'marie@exemple.invalid', whatsapp: '+243900000000', ...over,
});

function page() {
  return render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<Admin />} /><Route path="/connexion" element={<p>connexion</p>} /></Routes></MemoryRouter>);
}

beforeEach(() => {
  for (const k of Object.keys(results)) delete results[k];
  calls.length = 0;
});
afterEach(() => cleanup());

describe('règles', () => {
  it('tri des demandes par onglet', () => {
    const l = [req({ request_id: 'a', etat: 'recue' }), req({ request_id: 'b', etat: 'resolue' }), req({ request_id: 'c', etat: 'annulee' }), req({ request_id: 'd', etat: 'attente_participant' })];
    expect(filtrer(l, 'a_traiter').map(r => r.request_id)).toEqual(['a', 'd']);
    expect(filtrer(l, 'resolues').map(r => r.request_id)).toEqual(['b']);
    expect(filtrer(l, 'annulees').map(r => r.request_id)).toEqual(['c']);
  });
  it('lien WhatsApp et messages d’erreur', () => {
    expect(lienWhatsApp('+243 900 000 000')).toBe('https://wa.me/243900000000');
    expect(erreurAdmin('ERROR: Cette demande a été modifiée entre-temps. Recharge la page.')).toBe('Cette demande a été modifiée entre-temps. Recharge la page.');
    expect(erreurAdmin('Failed to fetch')).toMatch(/Vérifie ta connexion/);
  });
});

describe('Administration', () => {
  it('un participant sans rôle voit un accès réservé, sans aucune demande chargée', async () => {
    results['staff_me'] = { data: { roles: [], admin: false }, error: null };
    page();
    expect(await screen.findByText(/réservée à l’équipe/)).toBeInTheDocument();
    expect(calls.some(c => c.name === 'staff_list_help_requests')).toBe(false);
  });

  it('l’administrateur confie, change l’état et répond ; la version lue est transmise', async () => {
    results['staff_me'] = { data: { roles: ['administrateur'], admin: true }, error: null };
    results['staff_list_help_requests'] = { data: [req({})], error: null };
    results['staff_list_team'] = { data: [{ auth_user_id: 'U2', email: 'lucie@exemple.invalid', prenom: 'Lucie', roles: ['accompagnateur'] }], error: null };
    page();
    expect(await screen.findByText('Je bloque sur le jour 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+243900000000' })).toHaveAttribute('href', 'https://wa.me/243900000000');
    fireEvent.change(screen.getByLabelText(/^Confier à/), { target: { value: 'U2' } });
    expect(screen.getByText(/prévenue par e-mail qu’au passage à « Résolue »/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^État/), { target: { value: 'resolue' } });
    expect(screen.getByText(/recevra un e-mail avec ta réponse/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^État/), { target: { value: 'en_cours' } });
    fireEvent.change(screen.getByLabelText(/Réponse visible/), { target: { value: 'Voici une piste.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(calls.some(c => c.name === 'staff_update_help_request')).toBe(true));
    expect(calls.find(c => c.name === 'staff_update_help_request')!.args).toEqual({
      p_request_id: 'R1', p_modifie_le: '2026-10-13T13:42:00.123456+00:00', p_etat: 'en_cours', p_reponse: 'Voici une piste.', p_affecte_a: 'U2',
    });
  });

  it('modification concurrente : message clair', async () => {
    results['staff_me'] = { data: { roles: ['administrateur'], admin: true }, error: null };
    results['staff_list_help_requests'] = { data: [req({})], error: null };
    results['staff_list_team'] = { data: [], error: null };
    results['staff_update_help_request'] = { data: null, error: { message: 'Cette demande a été modifiée entre-temps. Recharge la page.' } };
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(/modifiée entre-temps/)).toBeInTheDocument();
  });

  it('l’accompagnateur ne voit ni l’affectation ni l’équipe', async () => {
    results['staff_me'] = { data: { roles: ['accompagnateur'], admin: false }, error: null };
    results['staff_list_help_requests'] = { data: [req({ etat: 'affectee', affecte_a: 'U2', affecte_email: 'lucie@exemple.invalid' })], error: null };
    page();
    expect(await screen.findByText(/qui te sont confiées/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Confier à/)).not.toBeInTheDocument();
    expect(screen.queryByText('Équipe')).not.toBeInTheDocument();
    expect(calls.some(c => c.name === 'staff_list_team')).toBe(false);
  });

  it('une demande annulée n’est plus modifiable', async () => {
    results['staff_me'] = { data: { roles: ['administrateur'], admin: true }, error: null };
    results['staff_list_help_requests'] = { data: [req({ etat: 'annulee' })], error: null };
    results['staff_list_team'] = { data: [], error: null };
    page();
    fireEvent.click(await screen.findByRole('tab', { name: 'Annulées (1)' }));
    expect(screen.getByText(/n’est plus modifiable/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
  });

  it('ajout d’un accompagnateur par e-mail', async () => {
    results['staff_me'] = { data: { roles: ['administrateur'], admin: true }, error: null };
    results['staff_list_help_requests'] = { data: [], error: null };
    results['staff_list_team'] = { data: [{ auth_user_id: 'U1', email: 'dayvpharma@gmail.com', prenom: 'Justin', roles: ['administrateur'] }], error: null };
    page();
    fireEvent.change(await screen.findByPlaceholderText('adresse e-mail du compte'), { target: { value: 'lucie@exemple.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Donner ce rôle' }));
    expect(await screen.findByText('Rôle donné à lucie@exemple.invalid.')).toBeInTheDocument();
    expect(calls).toContainEqual({ name: 'staff_set_role', args: { p_email: 'lucie@exemple.invalid', p_role: 'accompagnateur', p_actif: true } });
  });
});
