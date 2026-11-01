import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ rpc: vi.fn(), session: true }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: m.session ? { user: { id: 'U1' } } : null }, error: null }) },
    rpc: (n: string, a: unknown) => m.rpc(n, a),
    storage: { from: (b: string) => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://stockage.test/${b}/${p}` } }) }) },
  },
}));
import { AfficheAnnonce, pageAutorisee } from '@/components/AfficheAnnonce';

const AFFICHE = { id: 'A1', titre: '7 jours de gratitude', texte: 'Chaque soir, trois sujets.', langue: 'fr', image: null, bouton_texte: 'Je participe', bouton_lien: '/bible', fin: '2026-11-07T22:59:00Z' };
function Ici() { const l = useLocation(); return <p data-testid="ici">{l.pathname}</p>; }
const rendre = (chemin = '/espace') => render(<MemoryRouter initialEntries={[chemin]}><AfficheAnnonce /><Routes><Route path="*" element={<Ici />} /></Routes></MemoryRouter>);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  sessionStorage.clear(); m.session = true; m.rpc.mockReset();
  m.rpc.mockImplementation(async (n: string) => n === 'mon_affiche' ? { data: AFFICHE, error: null } : { data: null, error: null });
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const attendre = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(1300); }); };

describe('affiche à l’ouverture (décision du 01/11/2026)', () => {
  it('s’affiche une fois, note « vue », et « Plus tard » la ferme sans rien d’autre', async () => {
    rendre();
    await attendre();
    expect(await screen.findByRole('heading', { name: '7 jours de gratitude' })).toBeInTheDocument();
    expect(m.rpc).toHaveBeenCalledWith('mon_affiche', { p_langue: 'fr' });
    expect(m.rpc).toHaveBeenCalledWith('affiche_marquer', { p_annonce_id: 'A1', p_action: 'vue' });
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByRole('heading', { name: '7 jours de gratitude' })).toBeNull();
    expect(m.rpc).toHaveBeenCalledWith('affiche_marquer', { p_annonce_id: 'A1', p_action: 'plus_tard' });
    expect(screen.getByTestId('ici')).toHaveTextContent('/espace');
  });
  it('la croix ferme ; le bouton ouvre la page choisie', async () => {
    rendre();
    await attendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Fermer' }));
    expect(m.rpc).toHaveBeenCalledWith('affiche_marquer', { p_annonce_id: 'A1', p_action: 'fermee' });
    cleanup(); sessionStorage.clear(); m.rpc.mockClear();
    rendre();
    await attendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Je participe' }));
    expect(m.rpc).toHaveBeenCalledWith('affiche_marquer', { p_annonce_id: 'A1', p_action: 'bouton' });
    expect(screen.getByTestId('ici')).toHaveTextContent('/bible');
  });
  it('une seule vérification par ouverture de l’application', async () => {
    rendre();
    await attendre();
    await screen.findByRole('heading', { name: '7 jours de gratitude' });
    cleanup(); m.rpc.mockClear();
    rendre('/journal');
    await attendre();
    expect(m.rpc).not.toHaveBeenCalledWith('mon_affiche', expect.anything());
  });
  it('jamais sans compte, sur l’accueil public, la connexion, l’administration ou pendant la lecture d’un chapitre', async () => {
    expect(pageAutorisee('/')).toBe(false);
    expect(pageAutorisee('/connexion')).toBe(false);
    expect(pageAutorisee('/admin')).toBe(false);
    expect(pageAutorisee('/bible/joh/3')).toBe(false);
    expect(pageAutorisee('/bible')).toBe(true);
    expect(pageAutorisee('/espace')).toBe(true);
    m.session = false;
    rendre();
    await attendre();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('en anglais, demande la version anglaise', async () => {
    rendre('/espace?lang=en');
    await attendre();
    expect(m.rpc).toHaveBeenCalledWith('mon_affiche', { p_langue: 'en' });
  });
});
