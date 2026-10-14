import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bilan, semaineDuJour, semaines } from '@/lib/progres';

const tables: Record<string, unknown[]> = {};
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) b[m] = () => b;
  b['maybeSingle'] = () => Promise.resolve({ data: (tables[table] ?? [])[0] ?? null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok, ko);
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

const P = 'ACHETEUR_LIVRE_14J_FR_V1';
const contenus = Array.from({ length: 14 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte ${k + 1}`, reference_livre: null }));
// Actions les jours 1 à 6 et 8 à 14 (pas d'action le jour 7).
const activites = contenus.filter(c => c.jour !== 7).map(c => ({ activity_id: `A${c.jour}`, content_id: c.content_id, type_activite: 'action', consigne: `Action ${c.jour}`, obligatoire: true }));
const etats = [
  { enrollment_id: 'E1', activity_id: 'A1', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-01T10:00:00Z' },
  { enrollment_id: 'E1', activity_id: 'A2', etat: 'realisee', aide_demandee: false, realisee_le: '2026-10-02T10:00:00Z' },
  { enrollment_id: 'E1', activity_id: 'A3', etat: 'partielle', aide_demandee: true, realisee_le: null },
];

describe('Bilan de fin de semaine (calcul)', () => {
  it('compte seulement les actions enregistrées, semaine par semaine', () => {
    const b = bilan('2026-10-01', 14, contenus, activites, etats, new Date('2026-10-07T12:00:00Z'));
    const w = semaines(b);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ numero: 1, de: 1, a: 7, complete: true, applicables: 6, realisees: 2, partielles: 1, aides: 1 });
  });
  it('visible le 7e jour et le lendemain, pas avant', () => {
    const b6 = bilan('2026-10-01', 14, contenus, activites, etats, new Date('2026-10-06T12:00:00Z'));
    expect(semaineDuJour(b6, 6)).toBeNull();
    const b8 = bilan('2026-10-01', 14, contenus, activites, etats, new Date('2026-10-08T12:00:00Z'));
    expect(semaineDuJour(b8, 8)?.numero).toBe(1);
    const b9 = bilan('2026-10-01', 14, contenus, activites, etats, new Date('2026-10-09T12:00:00Z'));
    expect(semaineDuJour(b9, 9)).toBeNull();
  });
  it('semaine sans action : non évaluée', () => {
    const b = bilan('2026-10-01', 7, contenus.slice(0, 7), [], [], new Date('2026-10-07T12:00:00Z'));
    expect(semaines(b)[0]).toMatchObject({ applicables: 0 });
  });
});

describe('Bilan de fin de semaine (espace)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    localStorage.clear();
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [{ programme_id: P, nom: 'Accompagnement du livre — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-01', etat: 'active' }];
    tables['contents'] = contenus;
    tables['activities'] = activites;
    tables['activity_state'] = etats;
    tables['goals'] = [{ goal_id: 'G1', texte: 'Mettre de l’ordre dans mes finances', racine: 4, confirme_le: '2026-10-01' }];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('le jour 7 affiche « Ta semaine 1 en bref » avec les chiffres enregistrés et l’objectif', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    const carte = await screen.findByRole('region', { name: 'Ta semaine 1 en bref' });
    expect(carte).toHaveTextContent('Actions réalisées : 2 sur 6');
    expect(carte).toHaveTextContent('Faites en partie : 1');
    expect(carte).toHaveTextContent('Aide demandée : 1');
    expect(await screen.findByText('Ton objectif : « Mettre de l’ordre dans mes finances »')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Écrire mon bilan' })).toHaveAttribute('href', '/journal');
  });
});
