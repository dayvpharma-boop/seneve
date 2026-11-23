import {expect, it, vi} from 'vitest';
import {appareilPushValide, envoyerPushValide} from '../../supabase/functions/_shared/push-validation';
import {abonnementFictif} from './fixtures-push';

it.each([
  'https://web.push.apple.com/fictif',
  'https://fcm.googleapis.com/fcm/send/fictif:jeton',
  'https://updates.push.services.mozilla.com/wpush/v2/fictif',
  'https://updates.push.services.mozilla.com/wpush/v1/fictif==',
])('accepte la structure du fournisseur %s sans le contacter', endpoint => {
  expect(appareilPushValide({...abonnementFictif, endpoint})).toBe(true);
});
it.each([
  'https://audit.invalid/non-push-destination', 'https://127.0.0.1/a', 'https://[::1]/a',
  'https://169.254.169.254/a', 'https://localhost/a', 'http://web.push.apple.com/fictif',
  'https://web.push.apple.com.evil.invalid/fictif', 'https://evilweb.push.apple.com/fictif',
  'https://user:secret@web.push.apple.com/fictif', 'https://web.push.apple.com:443/fictif',
  'https://web.push.apple.com:8443/fictif', 'https://web.push.apple.com./fictif',
  'https://web.push.apple.com/fictif?redirect=https://localhost', 'https://web.push.apple.com/fictif#secret',
  'https://web.push.apple.com/../fictif', 'https://web.push.apple.com/%2e%2e/fictif',
  'https://fcm.googleapis.com/other/fictif', 'https://web.push.apple.com/',
  'https://web.push.apple.com/fictif\n', 'https://web.push.apple.com\\@localhost/fictif',
])('refuse avant le transport : %s', async endpoint => {
  const envoyer = vi.fn();
  await expect(envoyerPushValide({...abonnementFictif, endpoint}, envoyer)).rejects.toThrow('Abonnement push invalide');
  expect(envoyer).not.toHaveBeenCalled();
});
it.each([
  {...abonnementFictif, p256dh: 'FICTIF'}, {...abonnementFictif, auth: 'FICTIF'},
  {...abonnementFictif, p256dh: 'A' + abonnementFictif.p256dh.slice(1)},
  {...abonnementFictif, auth: 'AAAAAAAAAAAAAAAAAAAAAB'},
  {...abonnementFictif, auth: abonnementFictif.auth + '=='}, null, {},
])('refuse une structure de clés invalide', appareil => expect(appareilPushValide(appareil)).toBe(false));
it('appelle une seule fois le transport autorisé', async () => {
  const envoyer = vi.fn().mockResolvedValue('accepte');
  await expect(envoyerPushValide(abonnementFictif, envoyer)).resolves.toBe('accepte');
  expect(envoyer).toHaveBeenCalledExactlyOnceWith(abonnementFictif);
});
