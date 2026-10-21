import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: api.reset, updateUser: api.update } },
  siteUrl: (p: string) => `https://seneve.example/seneve/${p}`,
}));
import { ForgotPassword } from '@/routes/mot-de-passe-oublie';
import { NewPassword } from '@/routes/nouveau-mot-de-passe';
import { Connexion } from '@/routes/connexion';

beforeEach(() => { api.reset.mockReset(); api.update.mockReset(); });
afterEach(cleanup);
const forgot = () => render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
const nouveau = () => render(<MemoryRouter><NewPassword /></MemoryRouter>);

describe('Récupération par e-mail', () => {
  it('confirme seulement après la réponse réussie du service et garde le bon retour', async () => {
    let terminer!: (v: { error: null }) => void;
    api.reset.mockReturnValue(new Promise(resolve => { terminer = resolve; }));
    forgot();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marie@example.org' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Recevoir le lien' }).closest('form')!);
    expect(screen.queryByText('Consulte ta boîte de réception')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoi en cours…' })).toBeDisabled();
    terminer({ error: null });
    expect(await screen.findByText('Consulte ta boîte de réception')).toBeInTheDocument();
    expect(api.reset).toHaveBeenCalledWith('marie@example.org', { redirectTo: 'https://seneve.example/seneve/nouveau-mot-de-passe' });
    expect(screen.getByText(/Si un compte existe/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Retour à la connexion' })[0]).toHaveAttribute('href', '/connexion?mode=signin');
  });

  it('affiche l’échec réseau sans accusé d’envoi', async () => {
    api.reset.mockRejectedValue(new Error('network'));
    forgot();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marie@example.org' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Recevoir le lien' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur réseau');
    expect(screen.queryByText('Consulte ta boîte de réception')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('marie@example.org');
  });

  it('le renvoi passe aussi par le service, avec une erreur visible si le renvoi échoue', async () => {
    api.reset.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'rate limit' } });
    forgot();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marie@example.org' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Recevoir le lien' }).closest('form')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Renvoyer l’e-mail' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives');
    expect(api.reset).toHaveBeenCalledTimes(2);
  });

  it('depuis la connexion, ouvre le formulaire avec l’e-mail saisi sans l’ajouter à l’URL', async () => {
    render(<MemoryRouter initialEntries={['/connexion?mode=signin']}><Routes><Route path="/connexion" element={<Connexion />} /><Route path="/mot-de-passe-oublie" element={<ForgotPassword />} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'marie@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));
    expect(await screen.findByRole('heading', { name: 'Mot de passe oublié' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('marie@example.org');
    expect(api.reset).not.toHaveBeenCalled();
  });
});

describe('Nouveau mot de passe', () => {
  it.each(['', 'autre-test-456'])('refuse une confirmation absente ou différente (%s), puis permet de corriger', async confirmation => {
    api.update.mockResolvedValue({ error: null });
    nouveau();
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: confirmation } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('Les deux mots de passe ne correspondent pas.');
    expect(screen.getByLabelText('Confirmer le nouveau mot de passe')).toHaveFocus();
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer' }).closest('form')!);
    expect(await screen.findByText('Ton mot de passe a été modifié.')).toBeInTheDocument();
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('refuse un mot de passe trop court sans appel au service', () => {
    nouveau();
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'court' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer' }).closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent('au moins 8 caractères');
    expect(api.update).not.toHaveBeenCalled();
  });

  it('un lien expiré ne montre pas de faux succès et propose de redemander un lien', async () => {
    api.update.mockResolvedValue({ error: { message: 'Auth session missing' } });
    nouveau();
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Le lien a expiré');
    expect(screen.queryByText('Ton mot de passe a été modifié.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toHaveAttribute('href', '/mot-de-passe-oublie');
  });

  it('enregistre, efface le champ puis confirme après succès', async () => {
    let terminer!: (v: { error: null }) => void;
    api.update.mockReturnValue(new Promise(resolve => { terminer = resolve; }));
    nouveau();
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.change(screen.getByLabelText('Confirmer le nouveau mot de passe'), { target: { value: 'exemple-test-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(screen.getByLabelText('Nouveau mot de passe')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Enregistrer' }).closest('form')!);
    expect(screen.queryByText('Ton mot de passe a été modifié.')).not.toBeInTheDocument();
    expect(api.update).toHaveBeenCalledWith({ password: 'exemple-test-123' });
    terminer({ error: null });
    expect(await screen.findByText('Ton mot de passe a été modifié.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeInTheDocument();
  });

  it('la récupération en anglais conserve la langue du lien de retour', async () => {
    api.reset.mockResolvedValue({ error: null });
    render(<MemoryRouter initialEntries={['/mot-de-passe-oublie?lang=en']}><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'mary@example.org' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Receive the link' }).closest('form')!);
    await waitFor(() => expect(api.reset).toHaveBeenCalledWith('mary@example.org', { redirectTo: 'https://seneve.example/seneve/nouveau-mot-de-passe?lang=en' }));
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
  });
});
