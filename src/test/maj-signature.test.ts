import {afterEach,beforeEach,expect,it} from 'vitest';
import {afficherNouvelleVersion} from '@/lib/hors-ligne';

/** Sur iPhone, le bandeau « Nouvelle version prête » revenait même après avoir actualisé (demande de Dr Justin
 * du 13/11/2026) : la croix « Plus tard » n'est gardée qu'en mémoire, effacée par le rechargement. La signature
 * de la dernière version déjà annoncée est donc gardée sur l'appareil (localStorage), pas seulement en mémoire. */
beforeEach(() => { localStorage.clear(); });
afterEach(() => { document.getElementById('seneve-nouvelle-version')?.remove(); });

it('une version déjà annoncée ne revient pas après un rechargement, même sans avoir cliqué « Plus tard »', () => {
  afficherNouvelleVersion('abc123');
  expect(document.getElementById('seneve-nouvelle-version')).not.toBeNull();
  // Simule le rechargement : le bandeau disparaît avec la page, mais pas le stockage.
  document.getElementById('seneve-nouvelle-version')!.remove();
  afficherNouvelleVersion('abc123');
  expect(document.getElementById('seneve-nouvelle-version')).toBeNull();
});

it('une signature différente de la dernière annoncée s’affiche bien', () => {
  afficherNouvelleVersion('abc123');
  document.getElementById('seneve-nouvelle-version')!.remove();
  afficherNouvelleVersion('def456');
  expect(document.getElementById('seneve-nouvelle-version')).not.toBeNull();
});
