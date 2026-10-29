import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ rpc: vi.fn(), session: true, upload: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: m.session ? { user: { id: 'U1' } } : null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
    rpc: (n: string, a: unknown) => m.rpc(n, a),
    storage: { from: (b: string) => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://stockage.test/${b}/${p}` } }), upload: (p: string, f: Blob, o: unknown) => m.upload(b, p, f, o) }) },
    from: () => { const q: Record<string, unknown> = {}; for (const k of ['select', 'order']) q[k] = () => q; q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [{ programme_id: 'P30', nom: 'Formation 30 jours' }], error: null }).then(ok); return q; },
  },
  siteUrl: (p: string) => p,
}));
vi.mock('@/lib/annonces-medias', async orig => ({ ...(await orig<typeof import('@/lib/annonces-medias')>()), preparerImageAnnonce: async () => new Blob(['jpeg'], { type: 'image/jpeg' }) }));
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
beforeEach(() => { m.session = true; m.upload.mockReset(); m.upload.mockResolvedValue({ data: {}, error: null }); m.rpc.mockReset(); m.rpc.mockImplementation(async (n: string) => n === 'mes_notifications' ? { data: liste, error: null } : n === 'marquer_notifications_vues' ? { data: '2026-10-29T10:00:00Z', error: null } : n === 'staff_annonces' ? { data: [], error: null } : { data: null, error: null }); });
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

describe('chiffre sur l’icône de l’application (demande du 29/10/2026)', () => {
  it('suit la cloche, puis disparaît avec les notifications du téléphone quand la page est lue', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined), clearAppBadge = vi.fn().mockResolvedValue(undefined), close = vi.fn();
    Object.defineProperty(navigator, 'setAppBadge', { configurable: true, value: setAppBadge });
    Object.defineProperty(navigator, 'clearAppBadge', { configurable: true, value: clearAppBadge });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: Object.assign(new EventTarget(), { getRegistration: async () => ({ getNotifications: async () => [{ close }, { close }] }) }) });
    try {
      render(<MemoryRouter><ClocheNotifications langue="fr" /></MemoryRouter>);
      await screen.findByRole('link', { name: 'Notifications, 3 nouvelles' });
      expect(setAppBadge).toHaveBeenCalledWith(3);
      cleanup();
      page();
      await screen.findByText('Nouvelle formation');
      await waitFor(() => expect(close).toHaveBeenCalledTimes(2));
      expect(clearAppBadge).toHaveBeenCalled();
    } finally {
      for (const k of ['setAppBadge', 'clearAppBadge', 'serviceWorker']) Object.defineProperty(navigator, k, { configurable: true, value: undefined });
    }
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
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’annonce' }));
    expect(screen.getByText(/Publier « Nouvelle formation » pour tous les participants \(français\)/)).toBeInTheDocument();
    expect(m.rpc).not.toHaveBeenCalledWith('staff_annonce_publier', expect.anything());
    m.rpc.mockImplementationOnce(async () => ({ data: null, error: { message: 'Failed to fetch' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/L’annonce n’a pas été publiée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/^Annonce publiée. Elle apparaît dans la page Notifications des participants concernés./)).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Envoyer l’annonce' })).toBeDisabled();
    expect(screen.getByText('Pour envoyer, écris un titre et un message, puis choisis un parcours.')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Parcours'), { target: { value: 'P30' } });
    expect(screen.getByRole('button', { name: 'Envoyer l’annonce' })).toBeEnabled();
  });
});

describe('image et vidéo dans les annonces (décision du 29/10/2026)', () => {
  it('le participant voit l’image ; la vidéo ne se charge qu’après un appui', async () => {
    m.rpc.mockImplementation(async (n: string) => n === 'mes_notifications' ? { data: { vu_jusqu_a: null, non_lues: 1, elements: [
      { type: 'annonce', id: 'A5', date: '2026-10-29T09:00:00Z', titre: 'Culte spécial', texte: 'Regarde la vidéo.', langue: 'fr', nouveau: true, image: '11111111-1111-4111-8111-111111111111.jpg', video: 'https://youtu.be/dQw4w9WgXcQ' },
    ] }, error: null } : { data: null, error: null });
    page();
    const img = await screen.findByRole('img', { name: 'Image de l’annonce : Culte spécial' });
    expect(img).toHaveAttribute('src', 'https://stockage.test/annonces/11111111-1111-4111-8111-111111111111.jpg');
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: 'Ouvrir sur YouTube' })).toHaveAttribute('href', 'https://youtu.be/dQw4w9WgXcQ');
    fireEvent.click(screen.getByRole('button', { name: 'Regarder la vidéo (YouTube)' }));
    expect(screen.getByTitle('Vidéo : Culte spécial')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('l’administration refuse un lien hors YouTube/TikTok', async () => {
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Lien vidéo YouTube ou TikTok (facultatif)'), { target: { value: 'https://exemple.com/video' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Ce lien n’est pas reconnu');
    expect(screen.getByRole('button', { name: 'Envoyer l’annonce' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lien vidéo YouTube ou TikTok (facultatif)'), { target: { value: 'https://www.tiktok.com/@drjustin/video/7300000000000000000' } });
    expect(screen.getByText('Vidéo TikTok reconnue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer l’annonce' })).toBeEnabled();
  });
  it('envoie l’image sous le nom de l’annonce, puis publie avec l’image et la vidéo', async () => {
    const createObjectURL = vi.fn(() => 'blob:apercu'), revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Culte' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Dimanche.' } });
    fireEvent.change(screen.getByLabelText('Image (facultatif)'), { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('img', { name: 'Aperçu de l’image de l’annonce' })).toHaveAttribute('src', 'blob:apercu');
    fireEvent.change(screen.getByLabelText('Lien vidéo YouTube ou TikTok (facultatif)'), { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’annonce' }));
    expect(screen.getByText(/Publier « Culte » avec son image et sa vidéo pour tous les participants/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/Annonce publiée/)).toBeInTheDocument();
    const appel = m.rpc.mock.calls.find(c => c[0] === 'staff_annonce_publier')![1] as { p_client_id: string; p_image_path: string; p_video_url: string };
    expect(m.upload).toHaveBeenCalledWith('annonces', `${appel.p_client_id}.jpg`, expect.any(Blob), expect.objectContaining({ contentType: 'image/jpeg', upsert: false }));
    expect(appel.p_image_path).toBe(`${appel.p_client_id}.jpg`);
    expect(appel.p_video_url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
  it('si l’image ne part pas, l’annonce n’est pas publiée et le dit', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:apercu'), revokeObjectURL: vi.fn() });
    m.upload.mockResolvedValue({ data: null, error: { statusCode: '500', message: 'Failed to fetch' } });
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Culte' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Dimanche.' } });
    fireEvent.change(screen.getByLabelText('Image (facultatif)'), { target: { files: [new File(['x'], 'photo.jpg', { type: 'image/jpeg' })] } });
    await screen.findByRole('img', { name: 'Aperçu de l’image de l’annonce' });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’annonce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/L’image n’a pas pu être envoyée/)).toBeInTheDocument();
    expect(m.rpc).not.toHaveBeenCalledWith('staff_annonce_publier', expect.anything());
  });
});

describe('annonce qui fait sonner les téléphones (décision du 29/10/2026)', () => {
  it('sonne par défaut et dit combien de téléphones sonnent maintenant et à 7 h', async () => {
    m.rpc.mockImplementation(async (n: string) => n === 'staff_annonces' ? { data: [], error: null } : n === 'staff_annonce_publier' ? { data: { telephones: 3, differes: 1 }, error: null } : { data: null, error: null });
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    expect(screen.getByLabelText('Faire sonner les téléphones')).toBeChecked();
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Culte' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Dimanche.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’annonce' }));
    expect(screen.getByText(/en faisant sonner leurs téléphones/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/Elle sonne sur 2 téléphones maintenant, et sur 1 autre à 7 h/)).toBeInTheDocument();
    expect(m.rpc).toHaveBeenCalledWith('staff_annonce_publier', expect.objectContaining({ p_sonner: true }));
  });
  it('case décochée : publiée sans faire sonner', async () => {
    m.rpc.mockImplementation(async (n: string) => n === 'staff_annonces' ? { data: [], error: null } : n === 'staff_annonce_publier' ? { data: { telephones: 0, differes: 0 }, error: null } : { data: null, error: null });
    render(<AnnoncesAdministration />);
    await screen.findByText('Aucune annonce pour le moment.');
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Culte' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Dimanche.' } });
    fireEvent.click(screen.getByLabelText('Faire sonner les téléphones'));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’annonce' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’envoi' }));
    expect(await screen.findByText(/Aucun téléphone ne sonne \(case décochée\)/)).toBeInTheDocument();
    expect(m.rpc).toHaveBeenCalledWith('staff_annonce_publier', expect.objectContaining({ p_sonner: false }));
  });
  it('la liste montre le bilan des téléphones', async () => {
    m.rpc.mockImplementation(async (n: string) => n === 'staff_annonces' ? { data: [{ annonce_id: 'A1', titre: 'Culte', texte: 'T', langue: 'fr', cible: 'tous', programme_id: null, publie_le: '2026-10-29T17:00:00Z', retire_le: null, envois: { acceptes: 2, en_attente: 1, echecs: 0 } }], error: null } : { data: null, error: null });
    render(<AnnoncesAdministration />);
    expect(await screen.findByText('Téléphones : 2 sonnés · 1 en attente')).toBeInTheDocument();
  });
});
