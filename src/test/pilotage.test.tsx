import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { PilotageAdmin } from '@/components/PilotageAdmin';

const data = {
  actualise_le: '2026-10-18T08:00:00Z', periode_jours: 7, equipe_exclue: 1,
  participants: 12, nouveaux: 3, nouveaux_avant: 1, actifs: 5, actifs_avant: 5,
  parcours_en_cours: 18, parcours_termines: 4, aide_attente: 2, aide_attente_48h: 1,
  entree: { visites_test: 40, visites_test_avant: 30, tests_termines: 20, tests_termines_avant: 15, decouvertes: 5, decouvertes_avant: 4,
    achats: 2, achats_avant: 0, sources: [{ source: 'tiktok', visites: 25 }, { source: 'direct', visites: 15 }] },
  pratique: { actions_realisees: 9, actions_realisees_avant: 6, actions_partielles: 2, aides_bouton: 1, nouveaux_total: 3, nouveaux_premiere_action: 2 },
  coach: { questions: 7, echecs: 1, en_attente: 0 },
  relances_total: 1, achats_attente: 1,
  relances: [{ enrollment_id: 'E1', prenom: 'Marie', langue: 'fr', email: 'marie@example.invalid', whatsapp: '+243900000000',
    programme_id: 'PARCOURS_FR', programme: 'Découverte 7 jours', derniere_activite: '2026-10-13T08:00:00Z', jour: 6, duree: 7, jours_sans_activite: 5 }],
  incidents: [{ source: 'communication', categorie: 'whatsapp', etat: 'erreur', nombre: 2 }],
  achats: [{ payment_event_id: 'P1', id_evenement: 'VENTE1', offre_id: 'OFFRE1', statut_traitement: 'en_attente_compte', recu_le: '2026-10-16T08:00:00Z' }],
};
beforeEach(() => { rpc.mockReset(); });
afterEach(cleanup);

it('présente les indicateurs, les contacts et les ventes à examiner', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<PilotageAdmin />);
  expect(await screen.findByText('Marie')).toBeInTheDocument();
  expect(rpc).toHaveBeenCalledWith('staff_dashboard', { p_jours: 7 });
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Contacter sur WhatsApp' })).toHaveAttribute('href', 'https://wa.me/243900000000');
  expect(screen.getByText('VENTE1')).toBeInTheDocument();
  expect(screen.getByText(/Les lectures seules ne sont pas mesurées/)).toBeInTheDocument();
  expect(screen.getByText(/jour 6 sur 7/)).toBeInTheDocument();
  expect(screen.getByText(/Sans activité depuis 5 jours/)).toBeInTheDocument();
});

it('résume ce qui est à traiter en premier', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<PilotageAdmin />);
  const zone = await screen.findByRole('region', { name: 'À traiter' });
  expect(zone).toHaveTextContent('1 demande d’aide ouverte depuis plus de 48 h');
  expect(zone).toHaveTextContent('1 achat sans accès ouvert');
  expect(zone).toHaveTextContent('2 incident(s)');
  expect(zone).not.toHaveTextContent('coach');
});

it('montre le parcours d’entrée, les taux entre étapes et l’évolution', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<PilotageAdmin />);
  await screen.findByText('Visites du test');
  expect(screen.getByText(/\+10 vs période précédente/)).toBeInTheDocument();
  expect(screen.getByText(/50 % de l’étape précédente/)).toBeInTheDocument();
  expect(screen.getByText(/25 % de l’étape précédente/)).toBeInTheDocument();
  expect(screen.getByText(/tiktok \(25\)/)).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  expect(screen.getByText(/compte\(s\) de l’équipe ne sont pas comptés/)).toBeInTheDocument();
});

it('change de période sur demande', async () => {
  rpc.mockResolvedValue({ data, error: null });
  render(<PilotageAdmin />);
  await screen.findByText('Marie');
  fireEvent.click(screen.getByRole('tab', { name: '30 derniers jours' }));
  await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('staff_dashboard', { p_jours: 30 }));
});

it('une panne conserve les chiffres précédents avec un avertissement et permet de réessayer', async () => {
  rpc.mockResolvedValueOnce({ data, error: null }).mockRejectedValueOnce(new Error('réseau')).mockResolvedValue({ data: { ...data, participants: 13 }, error: null });
  render(<PilotageAdmin />);
  await screen.findByText('12');
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser les indicateurs' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Indicateurs indisponibles');
  expect(screen.getByText('12')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actualiser les indicateurs' }));
  await screen.findByText('13');
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

it('une première panne ne devient pas un faux zéro', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
  render(<PilotageAdmin />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Aucun incident enregistré selon ces critères.')).not.toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});
