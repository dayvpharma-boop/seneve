import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  appels: [] as { name: string; args: Record<string, unknown> }[],
  etat: { actif: false, cet_appareil: false, appareils: 0, moments: { matin: '07:30', midi: null, soir: null }, fuseau: 'Africa/Kinshasa', cle_publique: 'CLE' } as Record<string, unknown>,
  possibilite: 'oui' as string,
  refus: false,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => {
      m.appels.push({ name, args });
      if (name === 'rappels_activer') return Promise.resolve({ data: { ...m.etat, actif: true, cet_appareil: true, moments: args['p_moments'] }, error: null });
      if (name === 'rappels_arreter') return Promise.resolve({ data: { ...m.etat, actif: false, cet_appareil: false }, error: null });
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

beforeEach(() => { m.appels.length = 0; m.possibilite = 'oui'; m.refus = false; m.etat = { actif: false, cet_appareil: false, appareils: 0, moments: { matin: '07:30', midi: null, soir: null }, fuseau: 'Africa/Kinshasa', cle_publique: 'CLE' }; });
afterEach(cleanup);

describe('Rappels sur ce téléphone', () => {
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
