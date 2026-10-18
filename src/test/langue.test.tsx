import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Espace en anglais (demande du 18/10/2026 : tous les menus et pages du participant en français et en anglais).
const etat = { langueFiche: 'en' as string | undefined, metaLangue: undefined as string | undefined };
const appels: { quoi: string; args: unknown }[] = [];
function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'not']) b[m] = () => b;
  b['update'] = (v: unknown) => { appels.push({ quoi: `update:${table}`, args: v }); return b; };
  b['maybeSingle'] = () => Promise.resolve({ data: table === 'participants' ? { prenom: 'Marie', langue: etat.langueFiche } : null, error: null });
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok, ko);
  return b;
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie', langue: etat.metaLangue } } } } }),
      signOut: () => Promise.resolve({}),
      updateUser: (v: unknown) => { appels.push({ quoi: 'updateUser', args: v }); return Promise.resolve({ data: {}, error: null }); },
    },
    rpc: (name: string, args: unknown) => { appels.push({ quoi: name, args }); return Promise.resolve({ data: null, error: null }); },
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));

import { Espace } from '@/routes/espace';
import { Confidentialite } from '@/routes/confidentialite';
import { NewPassword } from '@/routes/nouveau-mot-de-passe';
import { langueDesMenus } from '@/lib/langue';

afterEach(() => { cleanup(); appels.length = 0; etat.langueFiche = 'en'; etat.metaLangue = undefined; try { localStorage.clear(); } catch { /* */ } });

describe('Langue des menus', () => {
  it('choix du compte d’abord, puis parcours tous en anglais, puis fiche', () => {
    expect(langueDesMenus('fr', ['en'], 'en')).toBe('fr');
    expect(langueDesMenus(undefined, ['en', 'en'], 'fr')).toBe('en');
    expect(langueDesMenus(undefined, ['en', 'fr'], 'fr')).toBe('fr');
    expect(langueDesMenus(undefined, [], 'en')).toBe('en');
    expect(langueDesMenus('xx', [], undefined)).toBe('fr');
  });

  it('accueil de l’espace en anglais, avec la Découverte en anglais d’abord', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello Marie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commencer en français' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/confidentialite?lang=en');
    expect(screen.getByRole('link', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.title).toBe('My space — SÉNEVÉ');
    expect(document.documentElement.lang).toBe('en');
  });

  it('le choix « Français » est gardé dans le compte et sur la fiche', async () => {
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Français' }));
    await waitFor(() => expect(appels).toContainEqual({ quoi: 'updateUser', args: { data: { langue: 'fr' } } }));
    expect(appels).toContainEqual({ quoi: 'update:participants', args: { langue: 'fr' } });
  });

  it('inscription faite en anglais : la fiche passe en anglais', async () => {
    etat.langueFiche = 'fr'; etat.metaLangue = 'en';
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello Marie' })).toBeInTheDocument();
    expect(appels).toContainEqual({ quoi: 'update:participants', args: { langue: 'en' } });
  });

  it('français par défaut, sans écriture inutile', async () => {
    etat.langueFiche = 'fr';
    render(<MemoryRouter><Espace /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Bonjour Marie' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
    expect(appels.some(a => a.quoi === 'update:participants')).toBe(false);
  });
});

describe('Pages publiques en anglais', () => {
  it('politique de confidentialité (?lang=en), traduction signalée', () => {
    render(<MemoryRouter initialEntries={['/confidentialite?lang=en']}><Confidentialite /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByText(/the French version applies/)).toBeInTheDocument();
    expect(screen.getByText(/The coach is an artificial intelligence, not a person/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Français' })).toHaveAttribute('href', '/confidentialite');
    expect(document.title).toBe('Privacy — SÉNEVÉ');
  });

  it('nouveau mot de passe (?lang=en)', () => {
    render(<MemoryRouter initialEntries={['/nouveau-mot-de-passe?lang=en']}><NewPassword /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'New password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
