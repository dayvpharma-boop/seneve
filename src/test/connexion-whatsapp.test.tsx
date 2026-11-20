import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithOtp: api.send, verifyOtp: api.verify } } }));
import { ConnexionWhatsApp } from '@/components/ConnexionWhatsApp';
import { normaliserTelephone, connexionWhatsAppActivee } from '@/lib/connexion-whatsapp';

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs(); });
const ouvrir = (creation = true, onConnexion = vi.fn()) => {
  api.send.mockResolvedValue({ data: {}, error: null });
  render(<ConnexionWhatsApp creation={creation} langue="fr" enLigne onConnexion={onConnexion} />);
  if (creation) fireEvent.change(screen.getByLabelText('Ton prénom'), { target: { value: 'Marie' } });
  fireEvent.change(screen.getByLabelText('Numéro WhatsApp avec indicatif pays'), { target: { value: '+243 812 345 678' } });
  return onConnexion;
};

describe('Connexion WhatsApp', () => {
  it('reste masquée sans activation explicite après recette du fournisseur', () => {
    vi.stubEnv('VITE_WHATSAPP_AUTH_ENABLED', '');
    expect(connexionWhatsAppActivee()).toBe(false);
    vi.stubEnv('VITE_WHATSAPP_AUTH_ENABLED', 'true');
    expect(connexionWhatsAppActivee()).toBe(true);
  });

  it('exige un numéro international, sans deviner le pays', () => {
    expect(normaliserTelephone('0812345678')).toBeNull();
    expect(normaliserTelephone('+243 812 345 678')).toBe('+243812345678');
    expect(normaliserTelephone('00243 812 345 678')).toBe('+243812345678');
    expect(normaliserTelephone('+000012345')).toBeNull();
    expect(normaliserTelephone('+243abc812345678')).toBeNull();
  });

  it('demande un code WhatsApp sans créer de session ni naviguer', async () => {
    const suite = ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code WhatsApp' }));
    await screen.findByLabelText('Code de vérification');
    expect(api.send).toHaveBeenCalledWith({
      phone: '+243812345678',
      options: { channel: 'whatsapp', shouldCreateUser: true, data: { prenom: 'Marie', langue: 'fr' } },
    });
    expect(suite).not.toHaveBeenCalled();
    expect(api.verify).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Renvoyer dans/ })).toBeDisabled();
  });

  it('se connecter ne crée pas silencieusement un compte', async () => {
    ouvrir(false);
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code WhatsApp' }));
    await screen.findByLabelText('Code de vérification');
    expect(api.send.mock.calls[0]?.[0].options.shouldCreateUser).toBe(false);
  });

  it('un code incorrect ne donne aucun accès', async () => {
    api.verify.mockResolvedValue({ data: { session: null }, error: { message: 'invalid otp' } });
    const suite = ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code WhatsApp' }));
    fireEvent.change(await screen.findByLabelText('Code de vérification'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier et continuer' }));
    await screen.findByRole('alert');
    expect(suite).not.toHaveBeenCalled();
  });

  it('seule une session vérifiée ouvre la suite', async () => {
    api.verify.mockResolvedValue({ data: { session: { user: { id: 'verified-test' } } }, error: null });
    const suite = ouvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code WhatsApp' }));
    fireEvent.change(await screen.findByLabelText('Code de vérification'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier et continuer' }));
    await waitFor(() => expect(suite).toHaveBeenCalledTimes(1));
    expect(api.verify).toHaveBeenCalledWith({ phone: '+243812345678', token: '123456', type: 'sms' });
  });

  it('conserve le code hors connexion et bloque la vérification', async () => {
    api.send.mockResolvedValue({ data: {}, error: null });
    const suite = vi.fn();
    const vue = render(<ConnexionWhatsApp creation={false} langue="fr" enLigne onConnexion={suite} />);
    fireEvent.change(screen.getByLabelText('Numéro WhatsApp avec indicatif pays'), { target: { value: '+243812345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code WhatsApp' }));
    fireEvent.change(await screen.findByLabelText('Code de vérification'), { target: { value: '123456' } });
    vue.rerender(<ConnexionWhatsApp creation={false} langue="fr" enLigne={false} onConnexion={suite} />);
    expect(screen.getByRole('button', { name: 'Vérifier et continuer' })).toBeDisabled();
    expect(screen.getByLabelText('Code de vérification')).toHaveValue('123456');
    expect(api.verify).not.toHaveBeenCalled();
  });
});
