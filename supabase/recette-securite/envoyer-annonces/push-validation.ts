export type AppareilPush = {endpoint: string; p256dh: string; auth: string};

// Hôtes exacts et chemins des fournisseurs utilisés ; aucun port, redirection,
// identifiant, fragment, paramètre ou encodage ambigu. Même règle dans le contrôle SQL.
const DESTINATION = /^https:\/\/(?:fcm\.googleapis\.com\/fcm\/send\/[A-Za-z0-9_:-]+|updates\.push\.services\.mozilla\.com\/wpush\/v[12]\/[A-Za-z0-9_-]+=*|web\.push\.apple\.com\/[A-Za-z0-9_-]+)$/;

function decoder(cle: string, taille: number): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(cle)) return null;
  try {
    const brut = atob(cle.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - cle.length % 4) % 4));
    if (brut.length !== taille || btoa(brut).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== cle) return null;
    return Uint8Array.from(brut, c => c.charCodeAt(0));
  } catch { return null; }
}

/** Vérifie la destination brute puis l'URL parsée et la structure des clés Web Push.
 * La bibliothèque d'envoi vérifie le point P-256 lors du chiffrement, avant le réseau. */
export function appareilPushValide(x: unknown): x is AppareilPush {
  if (!x || typeof x !== 'object') return false;
  const a = x as AppareilPush;
  if (typeof a.endpoint !== 'string' || a.endpoint.length > 1000 || !DESTINATION.test(a.endpoint) || /\s/.test(a.endpoint)) return false;
  try {
    const u = new URL(a.endpoint);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash) return false;
  } catch { return false; }
  if (typeof a.p256dh !== 'string' || a.p256dh.length !== 87 || typeof a.auth !== 'string' || a.auth.length !== 22) return false;
  return decoder(a.p256dh, 65)?.[0] === 4 && decoder(a.auth, 16) !== null;
}

/** Le transport est injecté pour vérifier les refus sans aucun envoi réel. */
export async function envoyerPushValide<T>(appareil: unknown, envoyer: (a: AppareilPush) => Promise<T>): Promise<T> {
  if (!appareilPushValide(appareil)) throw new Error('Abonnement push invalide.');
  return envoyer(appareil);
}
