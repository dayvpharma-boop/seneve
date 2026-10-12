import { describe, expect, it } from 'vitest';
import { linkMessage, linkUrl, maskPhone } from '@/lib/liaison';

describe('Liaison WhatsApp', () => {
  it('message pré-écrit sans donnée personnelle', () => {
    expect(linkMessage('048213')).toBe('LIER 048213');
    const url = new URL(linkUrl('048213'));
    expect(url.origin + url.pathname).toBe('https://wa.me/243844211119');
    expect(url.searchParams.get('text')).toBe('LIER 048213');
  });
  it('numéro partiellement masqué', () => {
    expect(maskPhone('+243844211119')).toBe('+243 ••• ••• 119');
    expect(maskPhone('12')).toBe('•••');
  });
});
