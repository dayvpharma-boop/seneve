import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const filtres: Record<string, unknown> = {};
let ligne: unknown = null;
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      filtres['table'] = table;
      const b: Record<string, unknown> = {};
      b['select'] = () => b;
      b['eq'] = (col: string, val: unknown) => { filtres[col] = val; return b; };
      b['maybeSingle'] = () => Promise.resolve({ data: ligne, error: null });
      return b;
    },
  },
}));

import { ParoleCard } from '@/components/ParoleCard';
import { adresseParole, entreGuillemets } from '@/lib/parole';
import { PenseeLivre } from '@/components/RepereParcours';
import { cleanSource } from '@/lib/suivi-test';

beforeEach(() => { ligne = null; for (const k of Object.keys(filtres)) delete filtres[k]; });
afterEach(cleanup);

describe('Parole du jour', () => {
  it('affiche la citation exacte et sa source pour le jour, la version et la langue demandés', async () => {
    ligne = { texte: 'Dieu ne cherche pas l’homme parfait. Il cherche l’homme obéissant.', reference_livre: 'Chapitre 1 — page imprimée 34' };
    render(<ParoleCard programmeId="PROSPECT_LIVRE_7J_FR_V1" version={1} langue="fr" jour={7} />);
    expect(await screen.findByText('« Dieu ne cherche pas l’homme parfait. Il cherche l’homme obéissant. »')).toBeInTheDocument();
    expect(screen.getByText(/Arrête de mendier des miracles » — Chapitre 1 — page imprimée 34/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partager en image' })).toBeInTheDocument();
    expect(filtres).toMatchObject({ table: 'paroles', programme_id: 'PROSPECT_LIVRE_7J_FR_V1', version: 1, langue: 'fr', jour: 7 });
  });

  it('rien n’est affiché quand aucune parole n’est publiée pour ce jour (aucune citation inventée)', async () => {
    const { container } = render(<ParoleCard programmeId="ACHETEUR_LIVRE_14J_FR_V1" version={2} langue="fr" jour={3} />);
    await waitFor(() => expect(filtres['jour']).toBe(3));
    expect(container).toBeEmptyDOMElement();
  });

  it('l’image renvoie vers le test avec la provenance « parole »', () => {
    expect(adresseParole('exemple.org', '/seneve/', 'fr')).toBe('exemple.org/seneve/?src=parole');
    expect(cleanSource(new URL(`https://${adresseParole('exemple.org', '/', 'en')}`).searchParams.get('src'))).toBe('parole');
  });
});

describe('Guillemets selon la langue', () => {
  it('français « … », anglais “…”', () => {
    expect(entreGuillemets('Texte', 'fr')).toBe('« Texte »');
    expect(entreGuillemets('Text', 'en')).toBe('“Text”');
  });
  it('la citation du livre en anglais n’a pas de guillemets français', () => {
    render(<PenseeLivre langue='en' />);
    expect(screen.getByText('“Faithfulness in the little things, then, is not only about money. It is about people.”')).toBeInTheDocument();
  });
});
