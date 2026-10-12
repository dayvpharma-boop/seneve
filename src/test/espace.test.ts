import { describe, expect, it } from 'vitest';
import { dayInfo, eventIdFor, fillPrenom, webText } from '@/lib/espace';

describe('dayInfo (Africa/Kinshasa)', () => {
  it('jour 1 le jour du début', () => {
    expect(dayInfo('2026-10-10', new Date('2026-10-10T12:00:00Z'))).toEqual({ day: 1, finished: false });
  });
  it('utilise le fuseau de Kinshasa (UTC+1) : 23h30 UTC est déjà le lendemain', () => {
    expect(dayInfo('2026-10-10', new Date('2026-10-10T23:30:00Z')).day).toBe(2);
    expect(dayInfo('2026-10-10', new Date('2026-10-10T22:59:00Z')).day).toBe(1);
  });
  it('date_debut horodatée convertie en date de Kinshasa', () => {
    expect(dayInfo('2026-10-09T23:30:00Z', new Date('2026-10-10T10:00:00Z')).day).toBe(1);
  });
  it('borné à 1 avant le début', () => {
    expect(dayInfo('2026-10-12', new Date('2026-10-10T12:00:00Z'))).toEqual({ day: 1, finished: false });
  });
  it('jour 7 encore en cours, au-delà terminé et borné à 7', () => {
    expect(dayInfo('2026-10-01', new Date('2026-10-07T12:00:00Z'))).toEqual({ day: 7, finished: false });
    expect(dayInfo('2026-10-01', new Date('2026-10-08T12:00:00Z'))).toEqual({ day: 7, finished: true });
    expect(dayInfo('2026-10-01', new Date('2026-11-30T12:00:00Z'))).toEqual({ day: 7, finished: true });
  });
});

describe('fillPrenom', () => {
  it('remplace {prenom}', () => {
    expect(fillPrenom('Bonjour {prenom}, bienvenue.', 'Marie')).toBe('Bonjour Marie, bienvenue.');
  });
  it('prénom vide : aucun double espace', () => {
    expect(fillPrenom('Bonjour {prenom} et bienvenue.', '')).toBe('Bonjour et bienvenue.');
    expect(fillPrenom('Bonjour {prenom}, bienvenue.', null)).toBe('Bonjour, bienvenue.');
  });
});

describe('webText', () => {
  it('retire l’invitation à répondre, propre à WhatsApp', () => {
    expect(webText('Quelle priorité cette décision révèle-t-elle ? Tu peux répondre ici.', 'Marie')).toBe('Quelle priorité cette décision révèle-t-elle ?');
    expect(webText('Quelle démarche ? Tu peux répondre ici, sans partager de détails personnels.', '')).toBe('Quelle démarche ?');
  });
  it('ne change rien d’autre', () => {
    expect(webText('Bonjour {prenom} 👋 Jour 7/7 — Merci d’avoir suivi ce parcours !', 'Marie')).toBe('Bonjour Marie 👋 Jour 7/7 — Merci d’avoir suivi ce parcours !');
  });
});

describe('eventIdFor', () => {
  it('réutilise le même identifiant pour une nouvelle tentative du même clic', () => {
    let n = 0;
    const gen = () => `id-${++n}`;
    const first = eventIdFor(null, gen);
    const retry = eventIdFor(first, gen);
    expect(retry).toBe(first);
    expect(n).toBe(1);
    expect(eventIdFor(null, gen)).toBe('id-2');
  });
});
