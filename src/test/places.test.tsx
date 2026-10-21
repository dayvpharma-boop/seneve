import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const results: Record<string, { data: unknown; error: { message: string } | null }> = {};
const appels: { name: string; args: unknown }[] = [];
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (name: string, args?: unknown) => { appels.push({ name, args }); return Promise.resolve(results[name] ?? { data: null, error: null }); } },
  siteUrl: (p: string) => p,
}));
import { CodePlaceCard } from '@/components/CodePlaceCard';
import { ConventionsAdmin } from '@/components/ConventionsAdmin';
import { csvCodesLibres, messageCode } from '@/lib/places';

beforeEach(() => { for (const k of Object.keys(results)) delete results[k]; appels.length = 0; });
afterEach(() => cleanup());

describe('Places financées : messages', () => {
  it('ouverture immédiate ou mois suivant', () => {
    expect(messageCode({ resultat: 'ok', mois: 2, date_debut: '2026-10-16', commence_maintenant: true }, 'fr'))
      .toEqual({ ok: true, texte: 'C’est fait : 2 mois offerts. Ton parcours Sénevé Continuité commence aujourd’hui.' });
    expect(messageCode({ resultat: 'ok', mois: 1, date_debut: '2026-11-15', commence_maintenant: false }, 'fr').texte)
      .toBe('C’est fait : 1 mois offert. Ton prochain mois Sénevé Continuité commencera le 15 novembre.');
    expect(messageCode({ resultat: 'code_deja_utilise' }, 'fr')).toEqual({ ok: false, texte: 'Ce code a déjà été utilisé.' });
    expect(messageCode({ resultat: 'trop_d_essais' }, 'en').texte).toBe('Too many attempts. Try again in an hour.');
  });

  it('CSV : seulement les codes libres', () => {
    expect(csvCodesLibres('Église "Test"', [{ code: 'SNV-AAAA-BBBB', etat: 'libre' }, { code: 'SNV-CCCC-DDDD', etat: 'utilise' }]))
      .toBe('organisation;code\n"Église ""Test""";SNV-AAAA-BBBB');
  });
});

describe('Places financées : carte du participant', () => {
  it('code valable : message de réussite et espace rechargé', async () => {
    results['utiliser_code_place'] = { data: { resultat: 'ok', mois: 1, date_debut: '2026-10-16', commence_maintenant: true }, error: null };
    const onOuvert = vi.fn();
    render(<CodePlaceCard langue="fr" onOuvert={onOuvert} />);
    fireEvent.change(screen.getByLabelText('Code de place'), { target: { value: 'snv-abcd-efgh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser ce code' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Ton parcours Sénevé Continuité commence aujourd’hui.');
    expect(appels).toContainEqual({ name: 'utiliser_code_place', args: { p_code: 'snv-abcd-efgh' } });
    expect(onOuvert).toHaveBeenCalledTimes(1);
  });

  it('code refusé : message d’erreur, espace non rechargé', async () => {
    results['utiliser_code_place'] = { data: { resultat: 'code_invalide' }, error: null };
    const onOuvert = vi.fn();
    render(<CodePlaceCard langue="fr" onOuvert={onOuvert} />);
    fireEvent.change(screen.getByLabelText('Code de place'), { target: { value: 'SNV-AAAA-AAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser ce code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce code n’est pas valable.');
    expect(onOuvert).not.toHaveBeenCalled();
  });
});

describe('Places financées : administration', () => {
  it('liste : nombre de places utilisées, sans aucun nom', async () => {
    results['staff_list_conventions'] = { data: [{ convention_id: 'c1', organisation: 'Église Test', nb_places: 50, mois_par_place: 1, valide_jusqu_au: '2026-12-31', etat: 'active', note: null, cree_le: '2026-10-16T20:00:00Z', utilisees: 37, libres: 13, annulees: 0 }], error: null };
    results['staff_codes_convention'] = { data: [{ code: 'SNV-AAAA-BBBB', etat: 'libre' }, { code: 'SNV-CCCC-DDDD', etat: 'utilise' }], error: null };
    render(<MemoryRouter><ConventionsAdmin /></MemoryRouter>);
    const carte = await screen.findByRole('region', { name: 'Places financées' });
    expect(await within(carte).findByText(/37 places utilisées sur 50/)).toBeInTheDocument();
    fireEvent.click(within(carte).getByRole('button', { name: 'Voir les codes' }));
    const codes = await within(carte).findByRole('list', { name: 'Codes de Église Test' });
    expect(codes).toHaveTextContent('SNV-AAAA-BBBB — libre');
    expect(codes).toHaveTextContent('SNV-CCCC-DDDD — utilisé');
  });

  it('aucune convention', async () => {
    results['staff_list_conventions'] = { data: [], error: null };
    render(<MemoryRouter><ConventionsAdmin /></MemoryRouter>);
    expect(await screen.findByText('Aucune convention pour le moment.')).toBeInTheDocument();
  });
});
