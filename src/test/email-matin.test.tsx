import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let etat: { actif: boolean; concerne: boolean; email: string | null } = { actif: false, concerne: true, email: 'marie@exemple.org' };
let echec = false;
const appels: { name: string; args: unknown }[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: { p_actif?: boolean }) => {
      appels.push({ name, args });
      if (name === 'email_matin_choisir') {
        if (echec) return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } });
        etat = { ...etat, actif: Boolean(args?.p_actif) };
      }
      return Promise.resolve({ data: etat, error: null });
    },
  },
  siteUrl: (p: string) => p,
}));

import { EmailMatinCard } from '@/components/EmailMatinCard';

beforeEach(() => { etat = { actif: false, concerne: true, email: 'marie@exemple.org' }; echec = false; appels.length = 0; });
afterEach(() => cleanup());

describe('Carte E-mail du matin', () => {
  it('désactivée par défaut : la personne choisit elle-même', async () => {
    render(<EmailMatinCard langue="fr" />);
    const caseACocher = await screen.findByRole('checkbox', { name: /recevoir un e-mail chaque matin/ });
    expect(caseACocher).not.toBeChecked();
    expect(screen.getByText('Adresse : marie@exemple.org')).toBeInTheDocument();
    fireEvent.click(caseACocher);
    await waitFor(() => expect(appels).toContainEqual({ name: 'email_matin_choisir', args: { p_actif: true } }));
    expect(await screen.findByText(/Activé/)).toBeInTheDocument();
  });

  it('activée : on peut l’arrêter', async () => {
    etat = { ...etat, actif: true };
    render(<EmailMatinCard langue="fr" />);
    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() => expect(appels).toContainEqual({ name: 'email_matin_choisir', args: { p_actif: false } }));
    expect(await screen.findByText(/Désactivé/)).toBeInTheDocument();
  });

  it('parcours suivi sur WhatsApp seulement : carte cachée', async () => {
    etat = { ...etat, concerne: false };
    const { container } = render(<EmailMatinCard langue="fr" />);
    await waitFor(() => expect(appels).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });

  it('échec : message clair, choix inchangé', async () => {
    echec = true;
    render(<EmailMatinCard langue="en" />);
    fireEvent.click(await screen.findByRole('checkbox'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your choice was not saved');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
