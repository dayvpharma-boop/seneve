import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { invitationTextes, lienInvitation, lienWhatsAppInvitation } from '@/lib/invitation';
import { cleanSource } from '@/lib/suivi-test';
import { InviteCard } from '@/components/InviteCard';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Lien d’invitation', () => {
  it('ouvre le test avec la provenance « invitation », reconnue par le suivi', () => {
    expect(lienInvitation('https://exemple.org', '/seneve/', 'fr')).toBe('https://exemple.org/seneve/?src=invitation');
    expect(lienInvitation('https://exemple.org', '/seneve/', 'en')).toBe('https://exemple.org/seneve/?lang=en&src=invitation');
    expect(cleanSource(new URL(lienInvitation('https://exemple.org', '/', 'fr')).searchParams.get('src'))).toBe('invitation');
  });
  it('message sans aucune donnée personnelle, avec le lien', () => {
    const m = invitationTextes('fr').message('https://exemple.org/?src=invitation');
    expect(m).toContain('Test des 7 Racines');
    expect(m).toContain('https://exemple.org/?src=invitation');
    expect(new URL(lienWhatsAppInvitation(m)).searchParams.get('text')).toBe(m);
  });
});

describe('Carte', () => {
  it('sans partage du téléphone : ouvre WhatsApp avec le message prérempli', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<InviteCard langue="fr" />);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));
    return vi.waitFor(() => {
      expect(open).toHaveBeenCalledTimes(1);
      const url = new URL(String(open.mock.calls[0]![0]));
      expect(url.hostname).toBe('wa.me');
      expect(url.searchParams.get('text')).toContain('src=invitation');
    });
  });
  it('copie le lien et le confirme', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<InviteCard langue="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy the link' }));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('lang=en&src=invitation'));
  });
});
