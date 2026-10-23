import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ appels: [] as { name: string; args: Record<string, unknown> }[], erreur: null as null | { message: string } }));
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (name: string, args: Record<string, unknown>) => { m.appels.push({ name, args }); return Promise.resolve({ data: m.erreur ? null : { supprime: true }, error: m.erreur }); } },
}));

import { SuppressionCompte } from '@/components/SuppressionCompte';

beforeEach(() => { m.appels.length = 0; m.erreur = null; });
afterEach(cleanup);

it('la suppression demande de retaper l’adresse, puis supprime', async () => {
  const fait = vi.fn(() => Promise.resolve());
  render(<SuppressionCompte email="marie@example.invalid" onSupprime={fait} />);
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer ce compte' }));
  expect(screen.getByText('Supprimer définitivement ce compte ?')).toBeInTheDocument();
  expect(screen.getByText(/Les achats restent pour la comptabilité, sans nom ni e-mail/)).toBeInTheDocument();
  const bouton = screen.getByRole('button', { name: 'Supprimer définitivement' });
  const champ = screen.getByLabelText(/tape l’adresse e-mail de la personne/);
  expect(champ).toHaveFocus();
  fireEvent.change(champ, { target: { value: 'autre@example.invalid' } });
  expect(bouton).toBeDisabled();
  fireEvent.change(champ, { target: { value: ' Marie@Example.invalid ' } });
  expect(bouton).toBeEnabled();
  fireEvent.click(bouton);
  await waitFor(() => expect(fait).toHaveBeenCalled());
  expect(m.appels[0]?.name).toBe('staff_supprimer_compte');
  expect(m.appels[0]?.args['p_email']).toBe('marie@example.invalid');
  expect(String(m.appels[0]?.args['p_confirmation']).trim().toLowerCase()).toBe('marie@example.invalid');
});

it('« Annuler » ne supprime rien ; un refus de la base est affiché', async () => {
  render(<SuppressionCompte email="marie@example.invalid" onSupprime={() => Promise.resolve()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer ce compte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(screen.getByRole('button', { name: 'Supprimer ce compte' })).toBeInTheDocument();
  expect(m.appels).toHaveLength(0);
  m.erreur = { message: 'Ce compte fait partie de l’équipe : retire d’abord son rôle.' };
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer ce compte' }));
  fireEvent.change(screen.getByLabelText(/tape l’adresse e-mail/), { target: { value: 'marie@example.invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('fait partie de l’équipe');
});
