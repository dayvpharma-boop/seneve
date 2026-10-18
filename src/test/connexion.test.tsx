import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const appels: string[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: () => { appels.push('signUp'); return Promise.resolve({ data: { user: null, session: null }, error: null }); },
      signInWithPassword: () => { appels.push('signIn'); return Promise.resolve({ error: { message: 'Invalid login credentials' } }); },
      resetPasswordForEmail: () => Promise.resolve({ error: null }),
    },
  },
  siteUrl: (p: string) => p,
}));

import { Connexion } from '@/routes/connexion';
const ouvrir = () => render(<MemoryRouter><Connexion /></MemoryRouter>);
afterEach(() => { cleanup(); appels.length = 0; });

// Connexion dans le style de l'écran « Aujourd'hui » (15/10/2026).
describe('Connexion', () => {
  it('création de compte : rappel « même adresse que pour l’achat » et aide sur le mot de passe', () => {
    ouvrir();
    expect(screen.getByRole('tab', { name: 'Créer un compte' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/même adresse e-mail que pour l’achat/)).toBeInTheDocument();
    expect(screen.getByLabelText('Mot de passe')).toHaveAccessibleDescription('Au moins 8 caractères.');
  });

  it('« Afficher » montre le mot de passe, « Masquer » le cache', () => {
    ouvrir();
    const champ = screen.getByLabelText('Mot de passe');
    expect(champ).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(champ).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }));
    expect(champ).toHaveAttribute('type', 'password');
  });

  it('se connecter : pas de prénom ni de rappel d’achat, « Mot de passe oublié ? » proposé', () => {
    ouvrir();
    fireEvent.click(screen.getByRole('tab', { name: 'Se connecter' }));
    expect(screen.queryByLabelText('Ton prénom')).not.toBeInTheDocument();
    expect(screen.queryByText(/même adresse e-mail que pour l’achat/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mot de passe oublié ?' })).toBeInTheDocument();
  });

  it('mot de passe trop court : message clair, rien n’est envoyé', () => {
    ouvrir();
    fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Marie' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marie@example.org' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'court' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Créer un compte', hidden: false }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Le mot de passe doit contenir au moins 8 caractères.');
    expect(appels).toHaveLength(0);
  });
});

describe('Connexion en anglais (?lang=en)', () => {
  const ouvrirEn = () => render(<MemoryRouter initialEntries={['/connexion?lang=en']}><Connexion /></MemoryRouter>);
  it('textes en anglais, rappel d’achat et âge minimum', () => {
    ouvrirEn();
    expect(screen.getByRole('heading', { level: 1, name: 'Your space' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Create an account' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/same email address as for your purchase/)).toBeInTheDocument();
    expect(screen.getByText(/at least 18 years old/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Français' })).toHaveAttribute('href', '/connexion');
    expect(document.documentElement.lang).toBe('en');
  });
  it('mot de passe trop court : message en anglais, rien n’est envoyé', () => {
    ouvrirEn();
    fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'Mary' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mary@example.org' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.submit(screen.getByLabelText('Password').closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('The password must contain at least 8 characters.');
    expect(appels).toHaveLength(0);
  });
  it('se connecter : « Forgot your password? » proposé', () => {
    ouvrirEn();
    fireEvent.click(screen.getByRole('tab', { name: 'Sign in' }));
    expect(screen.getByRole('button', { name: 'Forgot your password?' })).toBeInTheDocument();
  });
});
