import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ panne: false, tables: {} as Record<string, unknown[]> }));
vi.mock('@/lib/habitudes-configuration', () => ({ habitudesActivees: () => false }));
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const k of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[k] = () => b;
  const r = () => m.panne ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ data: m.tables[table] ?? [], error: null });
  b['maybeSingle'] = () => m.panne ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ data: (m.tables[table] ?? [])[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => r().then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: {} } } } }) },
    rpc: () => m.panne ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ data: 'P1', error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Progres } from '@/routes/progres';
import { effacerEspaces } from '@/lib/hors-ligne';
import { lireCopieProgres, semaineEnCours, type ParcoursCopie } from '@/lib/progres-copie';

const P = 'PROSPECT_LIVRE_7J_FR_V1';
const page = () => render(<MemoryRouter initialEntries={['/progres']}><Routes><Route path="/progres" element={<Progres />} /></Routes></MemoryRouter>);
const debut = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

beforeEach(() => {
  localStorage.clear(); m.panne = false;
  m.tables = {
    participants: [{ langue: 'fr', prenom: 'Marie' }],
    enrollments: [{ enrollment_id: 'E1', programme_id: P, version: 1, langue: 'fr', date_debut: debut, etat: 'active' }],
    journal_entries: [{ entry_id: 'J1' }],
    programmes: [{ programme_id: P, nom: 'Découverte', duree_jours: 7 }],
    contents: Array.from({ length: 7 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, langue: 'fr', jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}` })),
    activities: Array.from({ length: 7 }, (_, k) => ({ activity_id: `A${k + 1}`, content_id: `C${k + 1}`, type_activite: 'action', consigne: `Action privée ${k + 1}`, obligatoire: true })),
    activity_state: [{ enrollment_id: 'E1', activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: null }, { enrollment_id: 'E1', activity_id: 'A2', etat: 'partielle', aide_demandee: false, realisee_le: null }],
  };
});
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

describe('Progrès hors connexion (maquette Stitch n° 4, décision du 28/10/2026)', () => {
  it('garde une copie réduite : chiffres et états, sans consigne ni journal', async () => {
    page();
    await screen.findAllByRole('tab');
    const copie = lireCopieProgres('U1');
    expect(copie?.parcours[0]).toMatchObject({ enrollment_id: 'E1', realisees: 1 });
    const brut = localStorage.getItem('seneve:progres:v1:U1') ?? '';
    expect(brut).not.toContain('Action privée');
    expect(brut).not.toContain('Thème');
    expect(brut).not.toContain('J1');
  });
  it('sans réseau, affiche la dernière copie en lecture seule', async () => {
    page(); await screen.findAllByRole('tab'); cleanup();
    m.panne = true; Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    page();
    expect(await screen.findByText(/Reconnecte-toi pour voir tes progrès à jour\./)).toBeInTheDocument();
    expect(screen.getByText('Actions réalisées')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Jour 1 : réalisée')).toBeInTheDocument();
    expect(screen.getByText('Jour 2 : en partie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
  it('sans réseau et sans copie, le dit clairement', async () => {
    m.panne = true; Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    page();
    expect(await screen.findByText('Aucune copie de tes progrès n’est disponible sur cet appareil.')).toBeInTheDocument();
  });
  it('la déconnexion efface la copie', async () => {
    page(); await screen.findAllByRole('tab');
    expect(lireCopieProgres('U1')).not.toBeNull();
    effacerEspaces();
    expect(lireCopieProgres('U1')).toBeNull();
  });
  it('la semaine en cours suit les jours de parcours ouverts', () => {
    const p: ParcoursCopie = { enrollment_id: 'E', nom: 'X', langue: 'fr', realisees: 0, joursOuverts: 9, duree: 30, jours: Array.from({ length: 30 }, (_, k) => ({ jour: k + 1, ouvert: k < 9, etat: null })) };
    expect(semaineEnCours(p).map(j => j.jour)).toEqual([8, 9, 10, 11, 12, 13, 14]);
  });
});
