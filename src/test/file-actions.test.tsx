import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { entreesFile, envoyerFile, garderAction, reponseConfirme, type TransportFile } from '@/lib/file-actions';

const m = vi.hoisted(() => ({ reseau: true, appels: [] as Record<string, unknown>[], refus: false, tables: {} as Record<string, unknown[]> }));
function builder(table: string) {
  const res = () => m.reseau ? { data: m.tables[table] ?? [], error: null } : { data: null, error: { message: 'Failed to fetch' } };
  const b: Record<string, unknown> = {};
  for (const k of ['select', 'eq', 'neq', 'in', 'order', 'range']) b[k] = () => b;
  b['maybeSingle'] = () => Promise.resolve(m.reseau ? { data: (m.tables[table] ?? [])[0] ?? null, error: null } : res());
  b['then'] = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(res()).then(ok, ko);
  return b;
}
async function rpcServeur(nom: string, args: Record<string, unknown>) {
  if (!m.reseau) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
  if (nom !== 'record_progress') return { data: null, error: null };
  m.appels.push(args);
  if (m.refus) return { data: null, error: { code: '42501', message: 'Cette inscription n’est pas active.' } };
  return { data: { etat: args.p_etat, aide_demandee: false }, error: null };
}
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'U1', user_metadata: { prenom: 'Marie' } } } } }), signOut: () => Promise.resolve({}) },
    rpc: (n: string, a: Record<string, unknown>) => rpcServeur(n, a),
    from: (t: string) => builder(t),
  },
  siteUrl: (p: string) => p,
}));
import { Espace } from '@/routes/espace';

const transport: TransportFile = { rpc: (n, a) => rpcServeur(n, a) };
const P = 'PROSPECT_LIVRE_7J_FR_V1';

beforeEach(() => {
  localStorage.clear(); m.reseau = true; m.appels = []; m.refus = false;
  m.tables = {
    participants: [{ prenom: 'Marie' }],
    programmes: [{ programme_id: P, nom: 'Découverte du livre — 7 jours', duree_jours: 7 }],
    enrollments: [{ enrollment_id: 'E7', programme_id: P, version: 1, langue: 'fr', date_debut: '2026-10-11', etat: 'active' }],
    contents: Array.from({ length: 7 }, (_, k) => ({ content_id: `C${k + 1}`, programme_id: P, version: 1, jour: k + 1, numero_message: 1, theme: `Thème ${k + 1}`, explication: null, texte_officiel: `Texte du jour ${k + 1}`, reference_livre: null })),
    activities: [{ activity_id: 'A2', content_id: 'C2', type_activite: 'action', consigne: 'Lis un chapitre.', obligatoire: true }],
    activity_state: [],
  };
});
afterEach(() => { cleanup(); vi.useRealTimers(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

describe('file locale des actions (cahier n° 12, §7)', () => {
  it('garde l’action sans texte privé, rangée par compte', () => {
    const e = garderAction('U1', 'E7', 'A2', 'realisee', new Date('2026-10-29T10:00:00Z'), () => 'id-1');
    expect(e).toMatchObject({ id: 'id-1', statut: 'appareil', choix: 'realisee' });
    expect(entreesFile('U1')).toHaveLength(1);
    expect(entreesFile('U2')).toHaveLength(0);
    expect(localStorage.getItem('seneve:file-actions:v1:U1')).not.toContain('chapitre');
  });
  it('une panne garde l’entrée en attente, puis l’envoi réutilise le même identifiant', async () => {
    garderAction('U1', 'E7', 'A2', 'realisee', new Date(), () => 'id-stable');
    m.reseau = false;
    await envoyerFile('U1', transport);
    expect(entreesFile('U1')[0]?.statut).toBe('attente');
    m.reseau = true;
    await envoyerFile('U1', transport);
    expect(m.appels).toEqual([expect.objectContaining({ p_client_event_id: 'id-stable', p_etat: 'realisee', p_activity_id: 'A2', p_canal: 'web' })]);
    expect(entreesFile('U1')).toHaveLength(0);
  });
  it('un refus du serveur est gardé et affiché, jamais effacé en silence', async () => {
    garderAction('U1', 'E7', 'A2', 'partielle', new Date(), () => 'id-r');
    m.refus = true;
    await envoyerFile('U1', transport);
    expect(entreesFile('U1')[0]).toMatchObject({ id: 'id-r', statut: 'refuse' });
    await envoyerFile('U1', transport);
    expect(m.appels).toHaveLength(1); // pas de nouvel essai automatique d'un refus
    m.refus = false;
    await envoyerFile('U1', transport, true);
    expect(m.appels.map(a => a.p_client_event_id)).toEqual(['id-r', 'id-r']);
    expect(entreesFile('U1')).toHaveLength(0);
  });
  it('un état déjà plus avancé confirme un choix plus modeste', () => {
    expect(reponseConfirme('partielle', { etat: 'realisee' })).toBe(true);
    expect(reponseConfirme('realisee', { etat: 'partielle' })).toBe(false);
  });
});

describe('espace : action du jour notée sans réseau (décision du 29/10/2026)', () => {
  it('sans réseau, l’action est gardée sur l’appareil ; au retour du réseau, elle est reçue sans doublon', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
    const premier = render(<MemoryRouter><Espace /></MemoryRouter>);
    await screen.findByRole('button', { name: "J'ai réalisé cette action" });
    premier.unmount();

    m.reseau = false; Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<MemoryRouter><Espace /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: "J'ai réalisé cette action" }));
    expect(await screen.findByText('Enregistré sur cet appareil')).toBeInTheDocument();
    expect(screen.getByText('Pas encore envoyé à SÉNEVÉ.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "J'ai réalisé cette action" })).not.toBeInTheDocument();
    expect(m.appels).toHaveLength(0);

    m.reseau = true; Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(await screen.findByText('Reçu par SÉNEVÉ.')).toBeInTheDocument();
    await waitFor(() => expect(m.appels).toHaveLength(1));
    expect(entreesFile('U1')).toHaveLength(0);
  });
});
