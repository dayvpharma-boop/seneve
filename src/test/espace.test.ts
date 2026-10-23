import { describe, expect, it } from 'vitest';
import { apercuMoment, avecLangue, dateDuJour, dayInfo, eventIdFor, fillPrenom, periodeMoment, pickDefault, webText } from '@/lib/espace';

describe('dayInfo (Africa/Kinshasa)', () => {
  it('jour 1 le jour du début', () => {
    expect(dayInfo('2026-10-10', new Date('2026-10-10T12:00:00Z'))).toEqual({ day: 1, finished: false, notStarted: false });
  });
  it('utilise le fuseau de Kinshasa (UTC+1) : 23h30 UTC est déjà le lendemain', () => {
    expect(dayInfo('2026-10-10', new Date('2026-10-10T23:30:00Z')).day).toBe(2);
    expect(dayInfo('2026-10-10', new Date('2026-10-10T22:59:00Z')).day).toBe(1);
  });
  it('date_debut horodatée convertie en date de Kinshasa', () => {
    expect(dayInfo('2026-10-09T23:30:00Z', new Date('2026-10-10T10:00:00Z')).day).toBe(1);
  });
  it('avant le début : notStarted, aucun jour ouvert', () => {
    expect(dayInfo('2026-10-12', new Date('2026-10-10T12:00:00Z'))).toEqual({ day: 1, finished: false, notStarted: true });
    expect(dayInfo('2026-10-19T00:00:00.000+01:00', new Date('2026-10-18T22:59:00Z')).notStarted).toBe(true);
    expect(dayInfo('2026-10-19T00:00:00.000+01:00', new Date('2026-10-18T23:00:00Z')).notStarted).toBe(false);
  });
  it('jour 7 encore en cours, au-delà terminé et borné à 7', () => {
    expect(dayInfo('2026-10-01', new Date('2026-10-07T12:00:00Z'))).toEqual({ day: 7, finished: false, notStarted: false });
    expect(dayInfo('2026-10-01', new Date('2026-10-08T12:00:00Z'))).toEqual({ day: 7, finished: true, notStarted: false });
    expect(dayInfo('2026-10-01', new Date('2026-11-30T12:00:00Z'))).toEqual({ day: 7, finished: true, notStarted: false });
  });
  it('durée du programme : 14 jours', () => {
    expect(dayInfo('2026-10-01', new Date('2026-10-14T12:00:00Z'), 14)).toEqual({ day: 14, finished: false, notStarted: false });
    expect(dayInfo('2026-10-01', new Date('2026-10-15T12:00:00Z'), 14)).toEqual({ day: 14, finished: true, notStarted: false });
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
  it('retire aussi les invitations à répondre en anglais', () => {
    expect(webText('What time of day will you set aside for your book? If you have any trouble accessing it, let us know here.', 'Ann')).toBe('What time of day will you set aside for your book?');
    expect(webText('Question for today: why? You can reply here.', '')).toBe('Question for today: why?');
  });
  it('retire la consigne PAUSE / STOP de la Découverte anglaise, propre à WhatsApp', () => {
    expect(webText('Today, reflect on a recent decision: what priority does it reveal? To pause this journey, reply PAUSE; to stop messages and calls from the program, reply STOP.', 'Ann')).toBe('Today, reflect on a recent decision: what priority does it reveal?');
    expect(webText('Thank you for taking part in this journey! To pause this journey, reply PAUSE; to stop messages and calls from the program, reply STOP.', '')).toBe('Thank you for taking part in this journey!');
  });
  it('avecLangue garde l’anglais dans les liens internes', () => {
    expect(avecLangue('/journal', 'en')).toBe('/journal?lang=en');
    expect(avecLangue('/aide?inscription=E1', 'en')).toBe('/aide?inscription=E1&lang=en');
    expect(avecLangue('/journal', 'fr')).toBe('/journal');
  });
  it('retire « Si tu as un souci d’accès, dis-le-nous ici. », propre à WhatsApp (jour 1 du Livre 14 jours)', () => {
    expect(webText("Quel moment de ta journée réserves-tu à ton livre ? Si tu as un souci d'accès, dis-le-nous ici.", 'Marie')).toBe('Quel moment de ta journée réserves-tu à ton livre ?');
  });
  it('retire l’en-tête « Bonjour {prenom} … Jour N/M — », déjà affiché par la page (décision du 15/10/2026)', () => {
    expect(webText('Bonjour {prenom} 👋 Jour 7/7 — Merci d’avoir suivi ce parcours !', 'Marie')).toBe('Merci d’avoir suivi ce parcours !');
    expect(webText('Bonjour {prenom} 🌱 Jour 3/14 — Dans le chapitre 1, le Dr Justin Tshims raconte…', '')).toBe('Dans le chapitre 1, le Dr Justin Tshims raconte…');
    expect(webText('Hello {prenom} 🌱 Day 2/14 — Read chapter 2.', 'Ann')).toBe('Read chapter 2.');
  });
  it('ne change rien d’autre : salutation sans « Jour N/M », ou « Jour N/M » au milieu du texte', () => {
    expect(webText('Bonsoir {prenom} 🌙 Ce soir, fais tienne la prière.', 'Marie')).toBe('Bonsoir Marie 🌙 Ce soir, fais tienne la prière.');
    expect(webText('{prenom} ✨ La perle du jour : « Dieu permet… »', 'Marie')).toBe('Marie ✨ La perle du jour : « Dieu permet… »');
    expect(webText('Relis le passage. Bonjour {prenom} Jour 2/7 — fin.', 'Marie')).toBe('Relis le passage. Bonjour Marie Jour 2/7 — fin.');
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

describe('pickDefault', () => {
  const now = new Date('2026-10-12T12:00:00Z');
  const decouverte = { id: 'D', date_debut: '2026-10-12', duree: 7 };
  const livreFutur = { id: 'L', date_debut: '2026-10-19', duree: 14 };
  const livreEnCours = { id: 'L2', date_debut: '2026-10-10', duree: 14 };
  const ancien = { id: 'A', date_debut: '2026-09-01', duree: 7 };
  it('un parcours en cours passe avant un parcours qui commence plus tard', () => {
    expect(pickDefault([livreFutur, decouverte], now)?.id).toBe('D');
  });
  it('parmi les parcours en cours, le plus récemment commencé', () => {
    expect(pickDefault([livreEnCours, decouverte], now)?.id).toBe('D');
  });
  it('sinon le prochain à commencer, puis le dernier terminé', () => {
    expect(pickDefault([ancien, livreFutur], now)?.id).toBe('L');
    expect(pickDefault([ancien], now)?.id).toBe('A');
    expect(pickDefault([], now)).toBeNull();
  });
});

describe('Écran « Aujourd’hui » : période et date d’un jour', () => {
  it('période selon l’heure du moment, sinon selon son rang', () => {
    expect(periodeMoment('08:00', 1)).toBe('matin');
    expect(periodeMoment('13:00', 2)).toBe('midi');
    expect(periodeMoment('19:00', 3)).toBe('soir');
    expect(periodeMoment(null, 1)).toBe('matin');
    expect(periodeMoment(null, 3)).toBe('soir');
  });
  it('date du jour n, au fuseau de Kinshasa', () => {
    const f = (d: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Kinshasa', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    expect(f(dateDuJour('2026-10-13', 1))).toBe('mardi 13 octobre');
    expect(f(dateDuJour('2026-10-13', 3))).toBe('jeudi 15 octobre');
    expect(f(dateDuJour('2026-10-30', 3))).toBe('dimanche 1 novembre');
  });
});

// Débuts de messages réels (base seneve-prod, 23/10/2026).
describe('apercuMoment : début du vrai message sur la carte du moment', () => {
  it('retire salutation, « Jour 11/30 — » et la phrase qui répète le titre', () => {
    const texte = "Bonjour {prenom} 🌱 Jour 11/30 — Le travail, canal divin, Clé 3. Le chapitre 3 rappelle les années de Jésus dans l'atelier de Nazareth.";
    expect(apercuMoment(texte, 'Le travail, canal divin — Clé 3', 'Justin')).toBe("Le chapitre 3 rappelle les années de Jésus dans l'atelier de Nazareth.");
  });
  it('garde la phrase d’ouverture quand elle n’est pas le titre', () => {
    const texte = 'Hello {prenom} 🌱 Day 4/14 — Chapter 2 begins with a strong sentence: “The tithe has never enriched God.”';
    expect(apercuMoment(texte, 'Begin Chapter 2 — tithes and offerings', 'Justin')).toBe('Chapter 2 begins with a strong sentence: “The tithe has never enriched God.”');
  });
  it('midi et soir : seule la salutation disparaît', () => {
    expect(apercuMoment('{prenom} ✨ La perle du jour : « Dieu ne bénit pas l’inaction. »', 'La perle du jour', 'Justin')).toBe('La perle du jour : « Dieu ne bénit pas l’inaction. »');
    expect(apercuMoment('Bonsoir {prenom} 🌙 Ce soir, dans ton carnet : « Où en es-tu ? »', 'Prière et pensée du soir', 'Justin')).toBe('Ce soir, dans ton carnet : « Où en es-tu ? »');
  });
  it('Continuité : retire « Continuité — Mois 3, jour 9 — » et le titre', () => {
    const texte = 'Bonjour {prenom} 🌱 Continuité — Mois 3, jour 9 — Préparer la dîme à l’avance. Parole : Proverbes 3:9.';
    expect(apercuMoment(texte, 'Préparer la dîme à l’avance', 'Justin')).toBe('Parole : Proverbes 3:9.');
    expect(apercuMoment('Bonjour {prenom} 🌱 Continuité — Jour 2 — La dîme mise à part. Défi du jour : vérifie ta dîme.', 'La dîme mise à part', 'Justin')).toBe('Défi du jour : vérifie ta dîme.');
  });
  it('coupe proprement un long message, sans ponctuation avant les points de suspension', () => {
    const long = 'Bonjour {prenom} 🌱 Jour 1/7 — ' + 'Une phrase assez longue pour dépasser la limite. '.repeat(6);
    const a = apercuMoment(long, 'Titre', 'Justin');
    expect(a.length).toBeLessThanOrEqual(151);
    expect(a).toMatch(/[^.!?,]…$/);
  });
});
