import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  appels: [] as { name: string; args: Record<string, unknown> }[],
  etat: { actif: false, cet_appareil: false, appareils: 0, moments: { matin: '07:30', midi: null, soir: null }, fuseau: 'Africa/Kinshasa', cle_publique: 'CLE' } as Record<string, unknown>,
  possibilite: 'oui' as string,
  chargementErreur: false,
  refus: false,
  echec: false,
  rejeter: false,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => {
      m.appels.push({ name, args });
      if(name==='rappels_etat'&&m.chargementErreur)return Promise.resolve({data:null,error:Error('réseau')});
      if (name !== 'rappels_etat' && m.rejeter) return Promise.reject(new Error('Hors connexion'));
      if (name !== 'rappels_etat' && m.echec) return Promise.resolve({ data: null, error: { message: 'indisponible' } });
      if (name === 'rappels_activer') return Promise.resolve({ data: { ...m.etat, actif: true, cet_appareil: true, moments: args['p_moments'] }, error: null });
      if (name === 'rappels_arreter') return Promise.resolve({ data: { ...m.etat, actif: false, cet_appareil: false }, error: null });
      if (name === 'rappels_annonces') return Promise.resolve({ data: { ...m.etat, actif: true, cet_appareil: true, annonces: args['p_actif'] }, error: null });
      if (name === 'rappels_regler') return Promise.resolve({ data: { ...m.etat, actif: true, cet_appareil: true, moments: args['p_moments'] }, error: null });
      return Promise.resolve({ data: m.etat, error: null });
    },
  },
}));
vi.mock('@/lib/rappels', async (orig) => {
  const vrai = await orig<typeof import('@/lib/rappels')>();
  return {
    ...vrai,
    possibilite: () => m.possibilite,
    abonnementActuel: () => Promise.resolve(null),
    fuseauTelephone: () => 'Africa/Kinshasa',
    abonner: () => m.refus ? Promise.reject(new vrai.RefusNotifications('non'))
      : Promise.resolve({ endpoint: 'https://push.example.invalid/abc', toJSON: () => ({ keys: { p256dh: 'P'.repeat(40), auth: 'A'.repeat(16) } }) }),
  };
});

import { RappelsCard } from '@/components/RappelsCard';
import { heuresPossibles } from '@/lib/rappels';

beforeEach(() => { m.appels.length = 0; m.chargementErreur=false; m.possibilite = 'oui'; m.refus = false; m.echec = false; m.rejeter = false; m.etat = { actif: false, cet_appareil: false, appareils: 0, moments: { matin: '07:30', midi: null, soir: null }, fuseau: 'Africa/Kinshasa', cle_publique: 'CLE' }; });
afterEach(cleanup);

describe('Rappels sur ce téléphone', () => {
  it('décocher le dernier moment arrête les rappels au serveur et garde les cases vides', async () => {
    m.etat = { ...m.etat, actif: true, cet_appareil: true, appareils: 1 };
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByLabelText('Matin'));
    await waitFor(() => expect(screen.queryByText('Rappels activés sur ce téléphone.')).toBeNull());
    expect(m.appels.filter(a => a.name === 'rappels_arreter')).toHaveLength(1);
    expect(m.appels.some(a => a.name === 'rappels_regler')).toBe(false);
    expect(screen.getByLabelText('Matin')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Recevoir mes rappels' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Soir'));
    expect(m.appels.filter(a => a.name !== 'rappels_etat')).toHaveLength(1);
  });

  it('retirer un moment garde les autres horaires actifs', async () => {
    m.etat = { ...m.etat, actif: true, cet_appareil: true, moments: { matin: '07:30', midi: null, soir: '19:30' } };
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByLabelText('Matin'));
    await waitFor(() => expect(screen.getByLabelText('Soir')).not.toBeDisabled());
    expect(m.appels.find(a => a.name === 'rappels_regler')?.args['p_moments']).toEqual({ matin: null, midi: null, soir: '19:30' });
    expect(m.appels.some(a => a.name === 'rappels_arreter')).toBe(false);
  });

  it.each([false, true])('restaure le dernier créneau si l’arrêt échoue (rejet réseau : %s)', async rejet => {
    m.etat = { ...m.etat, actif: true, cet_appareil: true };
    m.rejeter = rejet; m.echec = !rejet;
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByLabelText('Matin'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ton choix n’a pas été enregistré');
    expect(screen.getByLabelText('Matin')).toBeChecked();
    expect(screen.getByText('Rappels activés sur ce téléphone.')).toBeInTheDocument();
  });

  it('restaure aussi l’horaire précédent si son enregistrement échoue', async () => {
    m.etat = { ...m.etat, actif: true, cet_appareil: true }; m.echec = true;
    render(<RappelsCard langue="fr" />);
    fireEvent.change(await screen.findByLabelText('Heure du rappel : Matin'), { target: { value: '08:00' } });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Heure du rappel : Matin')).toHaveValue('07:30');
  });
  it('désactivés par défaut : seul le matin est proposé, à 7 h 30', async () => {
    render(<RappelsCard langue="fr" />);
    expect(await screen.findByText('Rappels sur ce téléphone', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByLabelText('Matin')).toBeChecked();
    expect(screen.getByLabelText('Midi')).not.toBeChecked();
    expect((screen.getByLabelText('Heure du rappel : Matin') as HTMLSelectElement).value).toBe('07:30');
    expect(screen.getByText(/peuvent arriver en retard ou ne pas arriver/)).toBeInTheDocument();
    expect(m.appels.some(a => a.name === 'rappels_activer')).toBe(false);
  });

  it('« Recevoir mes rappels » abonne ce téléphone avec les moments choisis', async () => {
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByLabelText('Soir'));
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mes rappels' }));
    expect(await screen.findByText('Rappels activés sur ce téléphone.')).toBeInTheDocument();
    expect(m.appels.find(a => a.name === 'rappels_activer')?.args).toMatchObject({
      p_endpoint: 'https://push.example.invalid/abc', p_moments: { matin: '07:30', midi: null, soir: '19:30' }, p_fuseau: 'Africa/Kinshasa',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter les rappels' }));
    expect(await screen.findByRole('button', { name: 'Recevoir mes rappels' })).toBeInTheDocument();
    expect(m.appels.some(a => a.name === 'rappels_arreter')).toBe(true);
  });

  it('un refus du navigateur est expliqué, rien n’est enregistré', async () => {
    m.refus = true;
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Recevoir mes rappels' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bloquées pour SÉNEVÉ');
    expect(m.appels.some(a => a.name === 'rappels_activer')).toBe(false);
  });

  it('sans aucun moment choisi, le bouton reste inactif', async () => {
    render(<RappelsCard langue="fr" />);
    fireEvent.click(await screen.findByLabelText('Matin'));
    expect(screen.getByRole('button', { name: 'Recevoir mes rappels' })).toBeDisabled();
  });

  it('sur iPhone hors écran d’accueil, explique comment faire', async () => {
    m.possibilite = 'iphone-ecran-accueil';
    render(<RappelsCard langue="fr" />);
    expect(await screen.findByText(/ajoute d’abord SÉNEVÉ à ton écran d’accueil/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recevoir mes rappels' })).not.toBeInTheDocument();
  });

  it('les heures restent dans les plages de jour', () => {
    expect(heuresPossibles('matin')[0]).toBe('06:00');
    expect(heuresPossibles('matin').at(-1)).toBe('10:00');
    expect(heuresPossibles('soir').at(-1)).toBe('21:00');
  });
});

it('une panne de chargement conserve les rappels visibles et permet de réessayer',async()=>{m.chargementErreur=true;render(<RappelsCard langue="fr"/>);expect(await screen.findByText('Tes réglages de rappel n’ont pas pu être chargés.')).toBeInTheDocument();m.chargementErreur=false;fireEvent.click(screen.getByRole('button',{name:'Réessayer les rappels'}));expect(await screen.findByLabelText('Matin')).toBeInTheDocument();});

it('présente les rappels et les heures en anglais',async()=>{render(<RappelsCard langue="en"/>);expect(await screen.findByLabelText('Morning')).toBeChecked();expect(screen.getByRole('option',{name:'07:30'})).toBeInTheDocument();expect(screen.getByLabelText('Midday')).not.toBeChecked();expect(screen.getByRole('button',{name:'Get my reminders'})).toBeInTheDocument();});

  it('annonces de l’équipe : annoncées dans les réglages et coupables séparément (décision du 29/10/2026)', async () => {
    m.etat = { ...m.etat, actif: true, cet_appareil: true, appareils: 1, annonces: true };
    render(<RappelsCard langue="fr" />);
    const caseAnnonces = await screen.findByLabelText('Recevoir aussi les annonces de l’équipe SÉNEVÉ');
    expect(caseAnnonces).toBeChecked();
    expect(screen.getByText(/jamais entre 21 h et 7 h/)).toBeInTheDocument();
    fireEvent.click(caseAnnonces);
    await waitFor(() => expect(screen.getByLabelText('Recevoir aussi les annonces de l’équipe SÉNEVÉ')).not.toBeChecked());
    expect(m.appels.find(a => a.name === 'rappels_annonces')?.args).toEqual({ p_actif: false, p_endpoint: null });
    expect(m.appels.some(a => a.name === 'rappels_arreter')).toBe(false);
  });

it('présentation du profil : interrupteurs et résumé de la ligne (maquette du 29/10/2026)', async () => {
  m.etat = { ...m.etat, actif: true, cet_appareil: true, appareils: 1, moments: { matin: '07:30', midi: null, soir: '19:30' }, annonces: true };
  const resume = vi.fn();
  render(<RappelsCard langue="fr" interrupteurs onResume={resume} />);
  const matin = await screen.findByRole('switch', { name: 'Matin' });
  expect(matin).toBeChecked();
  expect(screen.getByRole('switch', { name: 'Midi' })).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Recevoir aussi les annonces de l’équipe SÉNEVÉ' })).toBeChecked();
  await waitFor(() => expect(resume).toHaveBeenLastCalledWith('Matin 7 h 30 · Soir 19 h 30'));
  fireEvent.click(screen.getByRole('switch', { name: 'Midi' }));
  await waitFor(() => expect(m.appels.some(a => a.name === 'rappels_regler')).toBe(true));
});
