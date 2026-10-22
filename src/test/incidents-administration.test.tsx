import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentEdition } from '@/lib/admin-edition';

const m = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: m.rpc, auth: { getSession: m.session } } }));
import { IncidentsAdministration } from '@/components/IncidentsAdministration';
import { IncidentsVue } from '@/components/CommunicationsIncidentsAdministration';

const incident: IncidentEdition = {
  id: 'traitement:00000000-0000-4000-8000-000000000001:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  source: 'traitement', source_id: '00000000-0000-4000-8000-000000000001', revision: 'a'.repeat(32), modifie_le: null,
  type: 'verification', etat: 'ouvert', etat_source: 'erreur', titre: 'Traitement de vérification', nombre: 1,
  date: '2026-10-22T07:00:00Z', journal: [],
};
let rows: IncidentEdition[];
const messages = () => ({ data: { incidents: rows, total: rows.length }, error: null });
beforeEach(() => {
  rows = [{ ...incident }]; m.rpc.mockReset(); m.session.mockReset();
  m.session.mockResolvedValue({ data: { session: { user: { id: 'ADMIN' } } } });
  m.rpc.mockImplementation(async (nom, args) => {
    if (nom === 'staff_list_incidents') return messages();
    if (nom === 'staff_update_incident') {
      rows = rows.map(i => ({ ...i, modifie_le: '2026-10-22T09:01:00Z',
        etat: args.p_action === 'resoudre' ? 'resolu' : args.p_action === 'rouvrir' ? 'ouvert' : args.p_action === 'prendre_en_charge' ? 'en_cours' : i.etat,
        note: args.p_action === 'resoudre' ? args.p_texte : i.note,
        journal: [...i.journal ?? [], { date: '2026-10-22T09:01:00Z', texte: args.p_texte || 'Signalement pris en charge.' }],
      }));
      return { data: { resultat: 'enregistree' }, error: null };
    }
    throw new Error('Appel inattendu');
  });
});
afterEach(cleanup);
function ouvrir(mobile = true) { return render(<IncidentsAdministration mobile={mobile} authId="ADMIN" communications={vi.fn()} />); }
async function ajouterNote() {
  fireEvent.click(await screen.findByRole('button', { name: 'Ajouter une note au journal' }));
  fireEvent.change(screen.getByLabelText('Note technique'), { target: { value: 'Vérification effectuée sur données fictives.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
}
async function preparerResolution() {
  fireEvent.change(await screen.findByLabelText('Note obligatoire de résolution *'), { target: { value: 'Correction vérifiée.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Marquer comme résolu' }));
}

describe('Registre des incidents connecté', () => {
  it.each([true, false])('enregistre une note partagée et la retrouve après réouverture (mobile : %s)', async mobile => {
    const vue = ouvrir(mobile);
    await ajouterNote();
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    vue.unmount(); ouvrir(mobile);
    expect(await screen.findByText('Vérification effectuée sur données fictives.')).toBeInTheDocument();
    expect(m.rpc.mock.calls.filter(c => c[0] === 'staff_update_incident')).toHaveLength(1);
  });

  it('demande une confirmation avant clôture puis permet de consulter et rouvrir la fiche', async () => {
    ouvrir(); await preparerResolution();
    expect(m.rpc.mock.calls.some(c => c[0] === 'staff_update_incident')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la résolution' }));
    expect(await screen.findByText('Résolution enregistrée.')).toBeInTheDocument();
    expect(await screen.findByText('Aucun incident selon ces filtres.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Incidents ouverts/));
    expect(screen.getByRole('heading', { name: 'Note de résolution' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le signalement' }));
    expect(await screen.findByText('Signalement rouvert.')).toBeInTheDocument();
    expect(screen.getByLabelText('Note obligatoire de résolution *')).toHaveValue('');
  });

  it('enregistre la prise en charge sans clôturer le signalement', async () => {
    ouvrir(); fireEvent.click(await screen.findByRole('button', { name: 'Prendre en charge' }));
    expect(await screen.findByText('Prise en charge enregistrée.')).toBeInTheDocument();
    expect(m.rpc.mock.calls.find(c => c[0] === 'staff_update_incident')?.[1]).toMatchObject({ p_action: 'prendre_en_charge' });
    expect(screen.queryByRole('button', { name: 'Prendre en charge' })).toBeNull();
    expect(screen.getByLabelText('Note obligatoire de résolution *')).toBeInTheDocument();
  });

  it('conserve la note et le même identifiant lors d’un échec réseau ambigu puis d’une nouvelle tentative', async () => {
    const normal = m.rpc.getMockImplementation()!; let echoue = true;
    m.rpc.mockImplementation((nom, args) => nom === 'staff_update_incident' && echoue
      ? Promise.reject(new Error('Hors connexion')) : normal(nom, args));
    ouvrir(); await ajouterNote();
    const dialogue = screen.getByRole('dialog');
    expect(await within(dialogue).findByRole('alert')).toHaveTextContent('Ton texte est conservé');
    expect(screen.getByLabelText('Note technique')).toHaveValue('Vérification effectuée sur données fictives.');
    echoue = false; fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la note' }));
    expect(await screen.findByText('Note enregistrée.')).toBeInTheDocument();
    const envois = m.rpc.mock.calls.filter(c => c[0] === 'staff_update_incident');
    expect(envois[1]?.[1].p_operation_id).toBe(envois[0]?.[1].p_operation_id);
    expect(envois[0]?.[1]).toMatchObject({ p_revision: 'a'.repeat(32), p_modifie_le: null, p_source: 'traitement', p_source_id: incident.source_id });
  });

  it('explique un conflit entre administrateurs et conserve le texte à corriger', async () => {
    const normal = m.rpc.getMockImplementation()!;
    m.rpc.mockImplementation((nom, args) => nom === 'staff_update_incident'
      ? Promise.resolve({ data: null, error: { code: '40001' } }) : normal(nom, args));
    ouvrir(); await preparerResolution();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la résolution' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Le signalement a changé');
    expect(screen.getByLabelText('Note obligatoire de résolution *')).toHaveValue('Correction vérifiée.');
    expect(screen.queryByText('Résolution enregistrée.')).toBeNull();
  });

  it('bloque les doubles clics et désactive les commandes pendant une écriture', async () => {
    let finir!: (v: unknown) => void;
    const normal = m.rpc.getMockImplementation()!;
    m.rpc.mockImplementation((nom, args) => nom === 'staff_update_incident' ? new Promise(resolve => { finir = resolve; }) : normal(nom, args));
    ouvrir(); await ajouterNote();
    await waitFor(() => expect(m.rpc.mock.calls.filter(c => c[0] === 'staff_update_incident')).toHaveLength(1));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrement…' })).toBeDisabled();
    expect(screen.getByLabelText('Note technique')).toBeDisabled();
    await act(async () => { finir({ data: { resultat: 'enregistree' }, error: null }); });
    expect(m.rpc.mock.calls.filter(c => c[0] === 'staff_update_incident')).toHaveLength(1);
  });

  it('refuse une écriture si le compte a changé', async () => {
    ouvrir(); await screen.findByRole('button', { name: 'Prendre en charge' });
    m.session.mockResolvedValue({ data: { session: { user: { id: 'AUTRE' } } } });
    await ajouterNote();
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Reconnecte-toi');
    expect(m.rpc.mock.calls.some(c => c[0] === 'staff_update_incident')).toBe(false);
  });

  it('signale une erreur de chargement au lieu d’afficher un registre vide', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    ouvrir(); expect(await screen.findByRole('alert')).toHaveTextContent('Le registre ne peut pas être actualisé');
    expect(screen.queryByText('Aucun incident selon ces filtres.')).toBeNull();
  });

  it('annuler une confirmation laisse le serveur intact', async () => {
    ouvrir(); await preparerResolution();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(m.rpc.mock.calls.some(c => c[0] === 'staff_update_incident')).toBe(false);
  });

  it('montre les limites de lecture et garde la relance distincte de la résolution', () => {
    const communications = vi.fn(), agir = vi.fn();
    render(<IncidentsVue mobile={false} incidents={[{ ...incident, source: 'communication', journal_total: 24,
      journal: [{ date: '2026-10-22T09:00:00Z', texte: 'Dernière note' }] }]} total={230} busy={false} erreur="" actualiser={vi.fn()} agir={agir} communications={communications} />);
    expect(screen.getByText('Les 1 derniers signalements sont affichés sur 230.')).toBeInTheDocument();
    expect(screen.getByText(/20 dernières actions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Examiner la relance' }));
    expect(communications).toHaveBeenCalledOnce(); expect(agir).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Notifier l’équipe/)).toBeDisabled();
  });
});
