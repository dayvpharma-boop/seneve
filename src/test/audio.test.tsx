import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const filtres: { eq: Record<string, unknown>; in?: unknown[] } = { eq: {} };
let lignes: unknown[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const b: Record<string, unknown> = {};
      b['select'] = () => b;
      b['eq'] = (c: string, v: unknown) => { filtres.eq[c] = v; return b; };
      b['in'] = (_c: string, v: unknown[]) => { filtres.in = v; return b; };
      b['then'] = (ok: (v: unknown) => unknown) => Promise.resolve({ data: lignes, error: null }).then(ok);
      return b;
    },
  },
}));

import { AudioCard, MEDIAS_URL } from '@/components/AudioCard';

beforeEach(() => { lignes = []; filtres.eq = {}; filtres.in = undefined; });
afterEach(cleanup);

it('propose l’audio publié du jour, présenté comme voix de synthèse', async () => {
  lignes = [{ titre: 'Ce qui occupe la première place', reference_stockage: 'medias-publics/decouverte/fr/jour-1.mp3', content_id: 'C1' }];
  const { container } = render(<AudioCard contentIds={['C1']} langue="fr" />);
  expect(await screen.findByText('Ce qui occupe la première place')).toBeInTheDocument();
  expect(container.querySelector('audio')).toHaveAttribute('src', `${MEDIAS_URL}/medias-publics/decouverte/fr/jour-1.mp3`);
  expect(container.querySelector('audio')).toHaveAttribute('preload', 'none');
  expect(screen.getByText('Voix de synthèse.')).toBeInTheDocument();
  expect(filtres.eq).toMatchObject({ type_media: 'audio', etat: 'publie', est_public: true });
  expect(filtres.in).toEqual(['C1']);
});

it('rien n’est affiché sans audio publié et validé', async () => {
  const { container } = render(<AudioCard contentIds={['C9']} langue="fr" />);
  await waitFor(() => expect(filtres.in).toEqual(['C9']));
  expect(container).toBeEmptyDOMElement();
});
