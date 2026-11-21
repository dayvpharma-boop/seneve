import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), verifyOtp: vi.fn(), lien: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: { getUser: api.getUser, updateUser: api.updateUser, verifyOtp: api.verifyOtp },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: api.lien }) }) }) }),
} }));
import { ConnexionWhatsAppCompte } from '@/components/ConnexionWhatsAppCompte';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const sansNumero = (lie: string | null = null) => {
  api.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.c', phone: '' } } });
  api.lien.mockResolvedValue({ data: lie ? { identite_canal: lie } : null, error: null });
};

describe('Profil : se connecter avec WhatsApp', () => {
  it('un compte qui a déjà son numéro le voit, masqué', async () => {
    api.getUser.mockResolvedValue({ data: { user: { id: 'u1', phone: '243844662826' } } });
    api.lien.mockResolvedValue({ data: null, error: null });
    const resume = vi.fn();
    render(<ConnexionWhatsAppCompte langue="fr" onResume={resume} />);
    expect(await screen.findByText('Tu peux te connecter avec ton WhatsApp +243 ••• ••• 826 ou avec ton e-mail.')).toBeInTheDocument();
    expect(resume).toHaveBeenLastCalledWith('+243 ••• ••• 826');
    expect(screen.queryByRole('button', { name: 'Recevoir mon code' })).toBeNull();
  });

  it('propose le numéro déjà relié et prépare un code de changement de numéro', async () => {
    sansNumero('+243812345678');
    api.updateUser.mockResolvedValue({ data: {}, error: null });
    render(<ConnexionWhatsAppCompte langue="fr" />);
    const champ = await screen.findByLabelText(/Ton numéro WhatsApp/);
    await waitFor(() => expect(champ).toHaveValue('+243812345678'));
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByRole('link', { name: 'Envoyer CODE' })).toHaveAttribute('href', 'https://wa.me/243844211119?text=CODE');
    expect(api.updateUser).toHaveBeenCalledWith({ phone: '+243812345678' });
  });

  it('confirme le numéro avec le code reçu (type changement de numéro)', async () => {
    sansNumero();
    api.updateUser.mockResolvedValue({ data: {}, error: null });
    api.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    render(<ConnexionWhatsAppCompte langue="fr" />);
    fireEvent.change(await screen.findByLabelText(/Ton numéro WhatsApp/), { target: { value: '+243 812 345 678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
    fireEvent.change(await screen.findByLabelText('Ton code à 6 chiffres'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer mon numéro' }));
    await screen.findByText(/C’est fait : ton numéro WhatsApp est ajouté à ton compte\./);
    expect(api.verifyOtp).toHaveBeenCalledWith({ phone: '+243812345678', token: '123456', type: 'phone_change' });
  });

  it('refuse un numéro déjà pris par un autre compte, sans rien changer', async () => {
    sansNumero();
    api.updateUser.mockResolvedValue({ data: {}, error: { message: 'A user with this phone number has already been registered', code: 'phone_exists' } });
    render(<ConnexionWhatsAppCompte langue="fr" />);
    fireEvent.change(await screen.findByLabelText(/Ton numéro WhatsApp/), { target: { value: '+243812345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce numéro est déjà utilisé par un autre compte SÉNEVÉ.');
    expect(screen.queryByLabelText('Ton code à 6 chiffres')).toBeNull();
  });
});
