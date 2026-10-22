/** Rappels sur le téléphone (notifications web) : ce que le navigateur permet, et l'abonnement de ce téléphone. */

export type Moment = 'matin' | 'midi' | 'soir';
export type Moments = Partial<Record<Moment, string | null>>;
export const MOMENTS: Moment[] = ['matin', 'midi', 'soir'];
/** Plages horaires de jour validées par Dr Justin (heures par pas de 30 minutes, rien la nuit). */
export const PLAGES: Record<Moment, [number, number]> = { matin: [6 * 60, 10 * 60], midi: [11 * 60, 15 * 60], soir: [17 * 60, 21 * 60] };
export const PAR_DEFAUT: Record<Moment, string> = { matin: '07:30', midi: '13:00', soir: '19:30' };

export function heuresPossibles(m: Moment): string[] {
  const [debut, fin] = PLAGES[m];
  const liste: string[] = [];
  for (let t = debut; t <= fin; t += 30) liste.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  return liste;
}

export type Possibilite = 'oui' | 'iphone-ecran-accueil' | 'non';
/** Les notifications web demandent un service worker et l'API Push ; sur iPhone, SÉNEVÉ doit être ouvert depuis l'écran d'accueil. */
export function possibilite(w: Window = window): Possibilite {
  const nav = w.navigator as Navigator & { standalone?: boolean };
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const installe = nav.standalone === true || w.matchMedia?.('(display-mode: standalone)').matches === true;
  if (ios && !installe) return 'iphone-ecran-accueil';
  return 'serviceWorker' in nav && 'PushManager' in w && 'Notification' in w ? 'oui' : 'non';
}

export function cleVersOctets(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const brut = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(brut, c => c.charCodeAt(0));
}

/** Abonnement déjà présent sur ce téléphone (sans rien demander à la personne). */
export async function abonnementActuel(): Promise<PushSubscription | null> {
  if (possibilite() !== 'oui') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export class RefusNotifications extends Error {}

/** Demande l'autorisation (uniquement après un appui de la personne), puis abonne ce téléphone. */
export async function abonner(clePublique: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new RefusNotifications('Notifications refusées');
  const reg = await navigator.serviceWorker.ready;
  const existant = await reg.pushManager.getSubscription();
  if (existant) return existant;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleVersOctets(clePublique) as BufferSource });
}

export function clesAbonnement(s: PushSubscription): { endpoint: string; p256dh: string; auth: string } {
  const j = s.toJSON();
  return { endpoint: s.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' };
}

export function fuseauTelephone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Kinshasa'; } catch { return 'Africa/Kinshasa'; }
}
