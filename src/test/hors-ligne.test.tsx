import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let reseau = true;
const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const res = () => reseau ? { data: tables[table] ?? [], error: null } : { data: null, error: { message: 'Failed to fetch' } };
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve(reseau ? { data: (tables[table] ?? [])[0] ?? null, error: null } : res());
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(res()).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: () => Promise.resolve(reseau ? { data: null, error: null } : { data: null, error: { message: 'Failed to fetch' } }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';
import { effacerEspaces } from '@/lib/hors-ligne';

const P = 'PROSPECT_LIVRE_7J_FR_V1';
const ouvrir = () => render(<MemoryRouter><Espace /></MemoryRouter>);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  reseau = true;
  localStorage.clear();
  tables['participants'] = [{ prenom: 'Marie' }];
  tables['programmes'] = [{ programme_id: P, nom: 'Découverte du livre — 7 jours', duree_jours: 7 }];
  tables['enrollments'] = [{ enrollment_id: 'E7', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' }];
  tables['contents'] = Array.from({ length: 7 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte du jour ${k + 1}`, reference_livre: null }));
  tables['activities'] = [{ activity_id: 'A2', content_id: 'C2', type_activite: 'action', consigne: 'Lis un chapitre.', obligatoire: true }];
  tables['activity_state'] = [];
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Espace hors connexion', () => {
  it('sans réseau, la dernière copie reste lisible et l’action du jour peut être notée sur l’appareil (décision du 29/10/2026)', async () => {
    const premier = ouvrir();
    expect(await screen.findByRole('button', { name: "J'ai réalisé cette action" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lire et agir' }));
    expect(await screen.findByText('Texte du jour 2')).toBeInTheDocument();
    premier.unmount();

    reseau = false;
    ouvrir();
    expect(await screen.findByText(/Tu n’as pas de connexion. Tes brouillons restent sur cet appareil./)).toBeInTheDocument();
    expect(screen.getByText('Tu peux noter ton action : elle reste sur cet appareil et sera envoyée au retour du réseau.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai besoin d'aide" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lire et agir' }));
    expect(await screen.findByText('Texte du jour 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "J'ai réalisé cette action" })).toBeInTheDocument();
  });

  it('sans réseau et sans copie : message d’erreur habituel', async () => {
    reseau = false;
    ouvrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger ta journée');
  });

  it('la déconnexion efface la copie de l’appareil', async () => {
    const r = ouvrir();
    await screen.findByText('Jour 2 sur 7');
    r.unmount();
    expect(Object.keys(localStorage).some(k => k.startsWith('seneve:espace:'))).toBe(true);
    effacerEspaces();
    expect(Object.keys(localStorage).some(k => k.startsWith('seneve:espace:'))).toBe(false);
  });
});
