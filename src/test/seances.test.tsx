import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type S = { numero: number; jour: number; ouverte: boolean; demande: { etat: string; cree_le: string } | null };
let seances: S[] = [];
let echec = false;
const appels: { name: string; args: unknown }[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (name: string, args: { p_numero?: number }) => {
      appels.push({ name, args });
      if (name === 'seance_demander') {
        if (echec) return Promise.resolve({ data: null, error: { message: 'Failed to fetch' } });
        seances = seances.map(s => s.numero === args.p_numero ? { ...s, demande: { etat: 'recue', cree_le: '2026-10-13T20:00:00Z' } } : s);
        return Promise.resolve({ data: { etat: 'recue' }, error: null });
      }
      return Promise.resolve({ data: { jour: 8, seances }, error: null });
    },
  },
  siteUrl: (p: string) => p,
}));

import { SeanceCard } from '@/components/SeanceCard';
const ouvrir = (langue = 'fr') => render(<MemoryRouter><SeanceCard enrollmentId="E30" langue={langue} /></MemoryRouter>);

beforeEach(() => {
  echec = false; appels.length = 0;
  seances = [
    { numero: 1, jour: 7, ouverte: true, demande: null },
    { numero: 2, jour: 14, ouverte: false, demande: null },
    { numero: 3, jour: 21, ouverte: false, demande: null },
    { numero: 4, jour: 30, ouverte: false, demande: null },
  ];
});
afterEach(() => cleanup());

describe('Carte séance 1-à-1', () => {
  it('séance ouverte : demande en un appui, sans heure promise', async () => {
    ouvrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Demander ma séance n° 1' }));
    await waitFor(() => expect(appels).toContainEqual({ name: 'seance_demander', args: { p_enrollment_id: 'E30', p_numero: 1 } }));
    expect(await screen.findByText(/Séance n° 1 demandée/)).toBeInTheDocument();
    expect(screen.getByText('Prochaine séance : n° 2, au jour 14.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d+ ?h(eures?)?\b|sous \d|dans les \d/);
  });

  it('avant la première séance : seulement la date', async () => {
    seances = seances.map(s => ({ ...s, ouverte: false }));
    ouvrir();
    expect(await screen.findByText('Prochaine séance : n° 1, au jour 7.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('parcours sans séance : carte cachée', async () => {
    seances = [];
    const { container } = ouvrir();
    await waitFor(() => expect(appels).toHaveLength(1));
    expect(container).toBeEmptyDOMElement();
  });

  it('échec : message clair (anglais)', async () => {
    echec = true;
    ouvrir('en');
    fireEvent.click(await screen.findByRole('button', { name: 'Request session 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Request not sent');
  });
});
