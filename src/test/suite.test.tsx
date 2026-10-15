import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offresSuivantes, prixAffiche, programmesSuivants, type Offre } from '@/lib/suite';

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

const o = (offre_id: string, produit: string, type_offre: string, programme_id: string, prix: number, lien: string | null = null): Offre =>
  ({ offre_id, produit, type_offre, langue: 'fr', programme_id, prix, devise: 'USD', lien_achat: lien });
const CATALOGUE = [
  o('LIVRE_PDF_FR', 'Arrête de mendier des miracles', 'PDF', 'ACHETEUR_LIVRE_14J_FR_V1', 2.99),
  o('FORMATION_30J_FR', 'Formation 30 jours', 'Formation', 'ACHETEUR_FORMATION30_30J_FR_V1', 39, 'https://exemple.chariow.com/formation-30'),
  o('ACCOMPAGNEMENT_30J_FR', 'Accompagnement personnel 30 jours', 'Accompagnement personnel', 'ACHETEUR_ACCOMP30_30J_FR_V1', 99),
  o('FORMATION_90J_FR', 'Formation 90 jours', 'Formation', 'ACHETEUR_FORMATION90_90J_FR_V1', 89),
];

describe('Et après ? (calcul)', () => {
  it('suit le chemin du cahier des charges', () => {
    expect(programmesSuivants('PROSPECT_LIVRE_7J_FR_V1')).toEqual(['ACHETEUR_LIVRE_14J_FR_V1']);
    expect(programmesSuivants('ACHETEUR_LIVRE_14J_EN_V1')).toEqual(['ACHETEUR_FORMATION30_30J_EN_V1', 'ACHETEUR_ACCOMP30_30J_EN_V1']);
    expect(programmesSuivants('ACHETEUR_ACCOMP30_30J_FR_V1')).toEqual(['ACHETEUR_FORMATION90_90J_FR_V1', 'ACHETEUR_ACCOMP90_90J_FR_V1']);
    expect(programmesSuivants('ACHETEUR_FORMATION90_90J_FR_V1')).toEqual([]);
  });
  it('ne propose pas ce que la personne a déjà', () => {
    const r = offresSuivantes('ACHETEUR_LIVRE_14J_FR_V1', CATALOGUE, ['ACHETEUR_FORMATION30_30J_FR_V1']);
    expect(r.map(x => x.offre_id)).toEqual(['ACCOMPAGNEMENT_30J_FR']);
  });
  it('affiche le prix du catalogue tel quel', () => {
    expect(prixAffiche(CATALOGUE[0]!, 'fr')).toBe('2,99 USD');
    expect(prixAffiche(CATALOGUE[1]!, 'fr')).toBe('39 USD');
    expect(prixAffiche(CATALOGUE[1]!, 'en')).toBe('USD 39');
  });
});

describe('Et après ? (espace)', () => {
  const P = 'ACHETEUR_LIVRE_14J_FR_V1';
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    localStorage.clear();
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [{ programme_id: P, nom: 'Accompagnement du livre — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'E1', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-01', etat: 'active' }];
    tables['contents'] = Array.from({ length: 14 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte ${k + 1}`, reference_livre: null }));
    tables['activities'] = [];
    tables['activity_state'] = [];
    tables['goals'] = [];
    tables['offers'] = CATALOGUE;
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('le dernier jour : offres suivantes, prix du catalogue, bouton seulement si un lien existe', async () => {
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));   // jour 14
    render(<MemoryRouter><Espace /></MemoryRouter>);
    const carte = await screen.findByRole('region', { name: 'Et après ?' });
    expect(carte).toHaveTextContent('Formation 30 jours — 39 USD');
    expect(carte).toHaveTextContent('Accompagnement personnel 30 jours — 99 USD');
    expect(carte).not.toHaveTextContent('Formation 90 jours');
    expect(within(carte).getByRole('link', { name: 'Voir l’offre' })).toHaveAttribute('href', 'https://exemple.chariow.com/formation-30');
    expect(carte).toHaveTextContent('Lien d’achat bientôt disponible.');
    expect(carte).toHaveTextContent('Aucun achat n’est obligatoire.');
  });

  it('pas de carte avant le dernier jour', async () => {
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'));   // jour 10
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect((await screen.findAllByText('Thème 10')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: 'Et après ?' })).not.toBeInTheDocument();
  });
});
