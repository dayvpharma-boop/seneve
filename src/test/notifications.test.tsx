import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ rpc: vi.fn(), session: true }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: m.session ? { user: { id: 'U1' } } : null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    rpc: (n: string, a: unknown) => m.rpc(n, a),
    from: () => { const q: Record<string, unknown> = {}; for (const k of ['select', 'order']) q[k] = () => q; q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [{ programme_id: 'P30', nom: 'Formation 30 jours' }], error: null }).then(ok); return q; },
  },
  siteUrl: (p: string) => p,
}));
import { Notifications } from '@/routes/notifications';
import { ClocheNotifications } from '@/components/ClocheNotifications';
import { AnnoncesAdministration } from '@/components/AnnoncesAdministration';

const liste = {
  vu_jusqu_a: '2026-10-28T10:00:00Z', non_lues: 3,
  elements: [
    { type: 'annonce', id: 'A1', date: '2026-10-29T09:00:00Z', titre: 'Nouvelle formation', texte: 'La formation 30 jours ouvre lundi.', langue: 'fr', nouveau: true },
    { type: 'reponse', id: 'R1', date: '2026-10-29T08:00:00Z', texte: 'Merci pour ta question, voici la réponse.', request_id: 'H1', nouveau: true },
    { type: 'rappel_habitude', id: 'H9', date: '2026-10-29T07:00:00Z', activity_id: 'X', habit_key: 'priere_matin', nouveau: true },
    { type: 'rappel_moment', id: 'C9', date: '2026-10-29T06:00:00Z', moment: 'matin', nouveau: false },
    { type: 'annonce', id: 'A0', date: '2026-10-27T09:00:00Z', titre: 'Ancienne annonce', texte: 'Déjà vue.', langue: 'fr', nouveau: false },
  ],
};
beforeEach(() => { m.session = true; m.rpc.mockReset(); m.rpc.mockImplementation(async (n: string) => n === 'mes_notifications' ? { data: liste, error: null } : n === 'marquer_notifications_vues' ? { data: '2026-10-29T10:00:00Z', error: null } : n === 'staff_annonces' ? { data: [], error: null } : { data: null, error: null }); });
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
const page = () => render(<MemoryRouter initialEntries={['/notifications']}><Routes><Route path="/notifications" element={<Notifications />} /></Routes></MemoryRouter>);

describe('page Notifications', () => {
  it('affiche annonces, réponses et rappels, signale les nouveaux (rappels compris) et les marque vus', async () => {
    page();
    expect(await screen.findByText('Nouvelle formation')).toBeInTheDocument();
    expect(screen.getByText('L’équipe t’a répondu')).toBeInTheDocument();
    expect(screen.getByText('Merci pour ta question, voici la réponse.')).toBeInTheDocument();
    expect(screen.getByText('Prière du matin')).toBeInTheDocument();
    expect(screen.getByText('Rappel du matin')).toBeInTheDocument();
    expect(screen.getAllByText('Nouveau')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Ouvrir mes demandes d’aide' })).toHaveAttribute('href', '/aide');
    await waitFor(() => expect(m.rpc).toHaveBeenCalledWith('marquer_notifications_vues', undefined));
  });
  it('sans réseau, le dit au lieu d’une erreur', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    m.rpc.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
    page();
    expect(await screen.findByText('Tes notifications demandent une connexion. Les rappels déjà reçus restent sur ton téléphone.')).toBeInTheDocument();
  });
  it('une liste vide l’explique simplement', async () => {
    m.rpc.mockImplementation(async (n: string) => n === 'mes_notifications' ? { data: { vu_jusqu_a: null, non_lues: 0, elements: [] }, error: null } : { data: null, error: null });
    page();
    expect(await screen.findByText(/Aucun message pour le moment/)).toBeInTheDocument();
    expect(screen.getByText(/Aucun rappel ces 60 derniers jours/)).toBeInTheDocument();
  });
});

describe('cloche de l’en-tête', () => {
  it('affiche le nombre de messages non vus et mène à la page', async () => {
    render(<MemoryRouter><ClocheNotifications langue="fr" /></MemoryRouter>);
    const lien = await screen.findByRole('link', { name: 'Notifications, 3 nouvelles' });
    expect(lien).toHaveAttribute('href', '/notifications');
    expect(lien).toHaveTextContent('3');
    await act(async () => { window.dispatchEvent(new Event('seneve:notifications-vues')); });
    expect(screen.getByRole('link', { name: 'Notifications' })).not.toHaveTextContent('3');
  });
  it('un rappel arrivé sur le téléphone fait relire la cloche (signal du service worker)', async () => {
    const sw = new EventTarget();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      m.rpc.mockImplementation(async () => ({ data: { vu_jusqu_a: null, non_lues: 0, elements: [] }, error: null }));
      render(<MemoryRouter><ClocheNotifications langue="fr" /></MemoryRouter>);
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument();
      m.rpc.mockImplementation(async () => ({ data: { vu_jusqu_a: null, non_lues: 1, elements: [] }, error: null }));
      await act(async () => { sw.dispatchEvent(new MessageEvent('message', { data: { type: 'seneve-notification' } })); await vi.advanceTimersByTimeAsync(3100); });
      expect(screen.getByRole('link', { name: 'Notifications, 1 nouvelle' })).toHaveTextContent('1');
    } finally { vi.useRealTimers(); Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined }); }
  });
  it('sans réseau, aucune pastille n’est inventée', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<MemoryRouter><ClocheNotifications langue="en" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/notifications?lang=en');
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe('annonces dans l’administration', () => {
  it('demande une confirmation, puis réutilise le même identifiant après un échec', async () => {
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Nouvelle formation' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Ouverture lundi.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publier l’annonce' }));
    expect(screen.getByText(/Publier « Nouvelle formation » pour tous les participants \(français\)/)).toBeInTheDocument();
    expect(m.rpc).not.toHaveBeenCalledWith('staff_annonce_publier', expect.anything());
    m.rpc.mockImplementationOnce(async () => ({ data: null, error: { message: 'Failed to fetch' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la publication' }));
    expect(await screen.findByText(/L’annonce n’a pas été publiée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la publication' }));
    expect(await screen.findByText('Annonce publiée. Elle apparaît dans la page Notifications des participants concernés.')).toBeInTheDocument();
    const appels = m.rpc.mock.calls.filter(c => c[0] === 'staff_annonce_publier').map(c => (c[1] as { p_client_id: string }).p_client_id);
    expect(appels).toHaveLength(2);
    expect(appels[0]).toBe(appels[1]);
  });
  it('une annonce ciblée exige un parcours', async () => {
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Destinataires'), { target: { value: 'programme' } });
    expect(screen.getByRole('button', { name: 'Publier l’annonce' })).toBeDisabled();
    fireEvent.change(await screen.findByLabelText('Parcours'), { target: { value: 'P30' } });
    expect(screen.getByRole('button', { name: 'Publier l’annonce' })).toBeEnabled();
  });
});
