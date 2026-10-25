import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fausse base : chaque table renvoie les lignes fournies, quelle que soit la chaîne de filtres.
const tables: Record<string, unknown[]> = {};
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
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';

const content = (programme_id: string, jour: number) => ({
  content_id: `${programme_id}-${jour}`, programme_id, version: 1, jour, numero_message: 1,
  theme: `Thème ${programme_id} ${jour}`, explication: null, texte_officiel: `Texte ${jour}`, reference_livre: null,
});

describe('Espace avec plusieurs parcours', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    tables['participants'] = [{ prenom: 'Marie' }];
    tables['programmes'] = [
      { programme_id: 'PROSPECT_LIVRE_7J_FR_V1', nom: 'Découverte du livre en français — 7 jours', duree_jours: 7 },
      { programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', nom: 'Accompagnement du livre en français — 14 jours', duree_jours: 14 },
    ];
    tables['enrollments'] = [
      { enrollment_id: 'E14', programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-19', etat: 'active' },
      { enrollment_id: 'E7', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' },
    ];
    tables['contents'] = [
      ...Array.from({ length: 7 }, (_, k) => content('PROSPECT_LIVRE_7J_FR_V1', k + 1)),
      ...Array.from({ length: 14 }, (_, k) => content('ACHETEUR_LIVRE_14J_FR_V1', k + 1)),
    ];
    tables['activities'] = [];
    tables['activity_state'] = [];
    tables['channel_links'] = [];
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('affiche d’abord le parcours en cours, puis la date de début du 14 jours', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 2 sur 7')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Découverte du livre — 7 jours' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Parler au coach' })).toHaveAttribute('href', '/coach?inscription=E7');
    expect(screen.queryByRole('link', { name: 'Demander de l’aide' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Accompagnement du livre — 14 jours' }));
    expect(screen.getByText(/Ton parcours commence le lundi 19 octobre/)).toBeInTheDocument();
    expect(screen.queryByText(/Thème ACHETEUR/)).not.toBeInTheDocument();
  });

  it('onglets des parcours sur une seule ligne qu’on fait glisser', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByRole('tablist', { name: 'Mes parcours' })).toHaveClass('prog-tabs');
    const css = readFileSync(`${process.cwd()}/src/styles.css`, 'utf8');
    expect(css).toMatch(/\.prog-tabs \{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto/);
    expect(css).toMatch(/\.prog-tab \{[^}]*white-space:nowrap/);
  });

  it('parcours anglais : libellés en anglais', async () => {
    tables['programmes'] = [{ programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', nom: 'Accompagnement du livre en anglais — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'EN', programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', version: 1, langue: 'en', date_debut: '2026-10-11', etat: 'active' }];
    tables['contents'] = Array.from({ length: 14 }, (_, k) => content('ACHETEUR_LIVRE_14J_EN_V1', k + 1));
    tables['activities'] = [{ activity_id: 'A2', content_id: 'ACHETEUR_LIVRE_14J_EN_V1-2', type_activite: 'action', consigne: 'Read chapter 1.', obligatoire: true }];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Day 2 of 14')).toBeInTheDocument();
    expect(screen.getByText('Day 3 opens tomorrow.')).toBeInTheDocument();
    expect(screen.getByText('Your action for today')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'I completed this action' })).toBeInTheDocument();
    // Barre du haut, salutation et titre de l'onglet suivent le parcours affiché (test du 23/10/2026).
    expect(screen.getByRole('heading', { level: 1, name: /^Hello\b/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profil?lang=en');
    expect(document.title).toBe('My space — SÉNEVÉ');
    // Coach permanent dans les deux langues (décision du 25/10/2026).
    expect(screen.getByRole('link', { name: 'Talk to the coach' })).toHaveAttribute('href', '/coach?inscription=EN');
  });

  it('plusieurs parcours anglais : onglets en anglais (inventaire FR/EN du 25/10/2026)', async () => {
    tables['programmes'] = [
      { programme_id: 'PROSPECT_LIVRE_7J_EN_V1', nom: 'Discovery — 7 days', duree_jours: 7 },
      { programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', nom: 'Book Companion — 14 days', duree_jours: 14 },
    ];
    tables['enrollments'] = [
      { enrollment_id: 'EN14', programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', version: 1, langue: 'en', date_debut: '2026-10-19', etat: 'active' },
      { enrollment_id: 'EN7', programme_id: 'PROSPECT_LIVRE_7J_EN_V1', version: 1, langue: 'en', date_debut: '2026-10-11', etat: 'active' },
    ];
    tables['contents'] = [
      ...Array.from({ length: 7 }, (_, k) => content('PROSPECT_LIVRE_7J_EN_V1', k + 1)),
      ...Array.from({ length: 14 }, (_, k) => content('ACHETEUR_LIVRE_14J_EN_V1', k + 1)),
    ];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    const onglets = await screen.findByRole('tablist', { name: 'My journeys' });
    expect(onglets).toHaveTextContent('Day 2 in progress');
    expect(onglets).toHaveTextContent('Upcoming');
    expect(onglets).not.toHaveTextContent(/À venir|en cours|Terminé|En pause/);
  });

  it('parcours anglais pas commencé : date en anglais', async () => {
    tables['programmes'] = [{ programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', nom: 'Accompagnement du livre en anglais — 14 jours', duree_jours: 14 }];
    tables['enrollments'] = [{ enrollment_id: 'EN', programme_id: 'ACHETEUR_LIVRE_14J_EN_V1', version: 1, langue: 'en', date_debut: '2026-11-03', etat: 'active' }];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText(/Your journey starts on Tuesday 3 November/)).toBeInTheDocument();
  });

  it('14 jours commencé : 14 pastilles et durée lue dans le programme', async () => {
    tables['enrollments'] = [{ enrollment_id: 'E14', programme_id: 'ACHETEUR_LIVRE_14J_FR_V1', version: 1, langue: 'fr', date_debut: '2026-10-10', etat: 'active' }];
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByText('Jour 3 sur 14')).toBeInTheDocument();
    expect(screen.getByText('Thème ACHETEUR_LIVRE_14J_FR_V1 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voir tous les jours' }));
    expect(screen.getByRole('button', { name: 'Jour 14, pas encore ouvert' })).toBeDisabled();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });
});
