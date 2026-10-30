/* SÉNEVÉ — consultation hors connexion de l'espace web.
 * - Pages : le réseau a 3 secondes pour répondre ; sinon (ou sans réseau), la dernière version enregistrée du site.
 * - Fichiers du site (assets, icônes) : gardés après le premier chargement.
 * - Textes de la Bible (domaine public) : gardés dans un cache à part, conservé d'une version du site à l'autre.
 * - Données (Supabase), coach, e-mails : jamais mis en cache ici (rien de privé dans ce cache).
 */
const CACHE = 'seneve-site-v69-haut-commun-20261030';
const CACHE_BIBLE = 'seneve-bible-v1';
const BASE = new URL('./', self.location).pathname;          // ex. /seneve/
const INDEX = BASE + 'index.html';

async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch(INDEX, { cache: 'no-store' });
  if (!res.ok) throw new Error('Site indisponible pour le téléchargement');
  const html = await res.clone().text();
  // Ne publier la nouvelle page qu'après ses fichiers indispensables.

  const urls = new Set([BASE + 'manifest.webmanifest', BASE + 'icons/icon-192.png']);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], self.location.origin + BASE);
    if (u.origin === self.location.origin && u.pathname.startsWith(BASE + 'assets/')) urls.add(u.pathname);
  }
  await Promise.all([...urls].map(u => cache.add(u)));
  await garderLesPages(true);
  await cache.put(INDEX, res);
}

/** Maquette Stitch n° 1 (28/10/2026) : aucune copie du site sur l'appareil et pas de réseau. Page autonome, sans fichier externe. */
function pageHorsLigne(url) {
  const en = url.pathname.startsWith(BASE + 'en') || url.searchParams.get('lang') === 'en'
    || (url.searchParams.get('lang') !== 'fr' && /^en\b/i.test(self.navigator.language || ''));
  const t = en
    ? { lang: 'en', titre: 'No connection', texte: 'SÉNEVÉ has not saved anything on this device yet. Connect to the Internet once: after that, the pages you have opened will stay readable without a network.', bouton: 'Try again', note: 'Check your Wi-Fi or mobile data.' }
    : { lang: 'fr', titre: 'Pas de connexion', texte: 'SÉNEVÉ n’a encore rien gardé sur cet appareil. Connecte-toi une première fois à Internet : ensuite, les pages déjà ouvertes resteront lisibles sans réseau.', bouton: 'Réessayer', note: 'Vérifie le Wi-Fi ou les données mobiles.' };
  const html = `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${t.titre} — SÉNEVÉ</title><style>
html,body{margin:0;min-height:100%;background:#fef9ea;color:#1d1c13}body{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:space-between;box-sizing:border-box;padding:max(36px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(36px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));font-family:Georgia,'Times New Roman',serif;text-align:center}
.marque{font:600 11px/15px system-ui,sans-serif;letter-spacing:.28em;color:#584400}main{display:flex;flex-direction:column;align-items:center;max-width:340px}
.rond{display:grid;place-items:center;width:80px;height:80px;border-radius:50%;background:#f8f4e4;margin-bottom:24px}.rond>span{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:#ede8d9;color:#755b00}
h1{font-size:24px;line-height:32px;font-weight:600;margin:0 0 16px}p{font-size:15px;line-height:25px;color:#48473e;margin:0 0 36px}
button{width:100%;max-width:280px;min-height:48px;border:0;border-radius:12px;background:#584400;color:#fff;font:500 15px/20px system-ui,sans-serif;cursor:pointer}button:focus-visible{outline:2px solid #755b00;outline-offset:2px}
small{font:400 13px/19px system-ui,sans-serif;color:#48473e}
@media (prefers-color-scheme:dark){html,body{background:#141310;color:#e6e2dc}.rond{background:#2b2a26}.rond>span{background:#363531;color:#ffd482}p,small{color:#d1c5b3}.marque{color:#ffd482}button{background:#ffd482;color:#1d1b18}}
</style></head><body><span class="marque">SÉNEVÉ</span><main><div class="rond"><span><svg width="32" height="32" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M793.08-80.62 439.39-436.31q-53.93 6.77-101.93 29.92-48 23.16-83.46 60.39l-62.46-63.69q35.46-35.46 79.96-61.39Q316-497 365.7-510L247.23-628.46q-43.31 19.46-85.54 48.23Q119.46-551.46 84-516l-61.69-63.69q35.85-35.85 76.5-65 40.65-29.16 81.96-50.23l-87.84-87.85 42.15-42.15 702.15 702.15-44.15 42.15ZM480-131.54q-33.92 0-57.35-23.73-23.42-23.73-23.42-57.04 0-33.92 23.42-57.34 23.43-23.42 57.35-23.42t57.35 23.42q23.42 23.42 23.42 57.34 0 33.31-23.42 57.04-23.43 23.73-57.35 23.73ZM716-358l-23.04-23.04-23.04-23.04-113.61-113.61q57.54 8 112.65 35.42 55.12 27.43 99.5 71.81L716-358Zm160-158q-77-77-178.5-120.5T480-680q-21 0-41.08 1.5Q418.85-677 400-674l-76.61-76.61q35.15-9.31 73.92-13.96 38.77-4.66 82.69-4.66 135.46 0 252.69 50.5 117.23 50.5 205.77 139.04L876-516Z"/></svg></span></div><h1>${t.titre}</h1><p>${t.texte}</p><button type="button" onclick="location.reload()">${t.bouton}</button></main><small>${t.note}</small></body></html>`;
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

const ATTENTE_RESEAU = 3000;
let dernierInventaire = 0;
/** Garde les fichiers des pages chargées à la demande (sauf l'administration), pour qu'elles s'ouvrent aussi
 *  hors connexion. Seuls les fichiers absents du téléphone sont téléchargés ; au plus une fois toutes les 10 min. */
async function garderLesPages(obligatoire = false) {
  if (Date.now() - dernierInventaire < 600000) return;
  dernierInventaire = Date.now();
  const r = await fetch(BASE + 'asset-manifest.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('Inventaire indisponible');
  const liste = await r.json();
  const fichiers = new Set();
  for (const [source, f] of Object.entries(liste)) {
    if (/routes\/admin/.test(source)) continue;
    if (f.file) fichiers.add(BASE + f.file);
    for (const css of f.css || []) fichiers.add(BASE + css);
  }
  const cache = await caches.open(CACHE);
  for (const u of fichiers) if (!(await cache.match(u))) await cache.add(u).catch(err => { if (obligatoire) throw err; });
}

self.addEventListener('install', e => { e.waitUntil(precache().then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== CACHE_BIBLE && (k.startsWith('seneve-site-') || k.includes('-seneve-site-'))).map(k => caches.delete(k))))
    .then(() => self.clients.claim()).then(() => garderLesPages().catch(() => undefined)));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;   // Supabase, n8n, polices : pas touchés

  // La recette dispose de son propre point d'entrée ; ne pas remplacer le site par sa page.
  if (url.pathname.startsWith(BASE + 'recette-hd/')) return;

  if (req.mode === 'navigate') {
    // Le réseau a 3 secondes pour répondre ; au-delà, la copie du téléphone s'affiche. La réponse du réseau,
    // même tardive, remplace la copie pour la visite suivante.
    const reseau = fetch(req).then(async res => {
      // INDEX reste la page cohérente téléchargée avec les fichiers à l'installation.
      // Les autres routes (dont la recette) ne doivent jamais l'écraser.
      if (res.ok) garderLesPages().catch(() => undefined);
      return res;
    });
    e.waitUntil(reseau.then(() => undefined, () => undefined));
    e.respondWith((async () => {
      const copie = await caches.match(INDEX);
      const horsLigne = () => pageHorsLigne(url);
      if (!copie) return reseau.catch(horsLigne);
      const delai = new Promise(r => setTimeout(() => r(null), ATTENTE_RESEAU));
      const reponse = await Promise.race([reseau.catch(() => null), delai]);
      return reponse && reponse.ok ? reponse : copie;
    })());
    return;
  }

  if (url.pathname.startsWith(BASE + 'bible/')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_BIBLE);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.pathname.startsWith(BASE + 'assets/') || url.pathname.startsWith(BASE + 'icons/') || url.pathname.endsWith('manifest.webmanifest')) {
    e.respondWith((async () => {
      const hit = await caches.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    })());
  }
});


/* Rappels sur le téléphone (validés le 22/10/2026) : le serveur n'envoie que le titre, un texte sans rien
 * de privé et le lien de l'espace. Toucher la notification ouvre (ou ramène) SÉNEVÉ. */
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = {}; }
  const lien = typeof m.url === 'string' && m.url.startsWith(BASE) ? m.url : BASE + 'espace';
  e.waitUntil(self.registration.showNotification(m.title || 'SÉNEVÉ', {
    body: m.body || '', tag: m.tag || 'seneve-rappel', renotify: typeof m.tag === 'string' && m.tag.startsWith('seneve-hd-'), icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/favicon-48.png', data: { url: lien },
  }).then(async () => {
    // La cloche des pages ouvertes se relit (29/10/2026) : rien de privé n'est transmis, seulement un signal.
    // Un échec ici ne doit jamais empêcher l'affichage du rappel, déjà fait.
    // Chiffre sur l'icône (iPhone écran d'accueil, ordinateur) : nombre de notifications SÉNEVÉ affichées ;
    // la page le remplace par le compte exact de la cloche dès qu'elle est ouverte.
    try {
      const affichees = await self.registration.getNotifications();
      if (self.navigator && typeof self.navigator.setAppBadge === 'function') await self.navigator.setAppBadge(affichees.length);
    } catch { /* non pris en charge */ }
    try {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const f of fenetres) f.postMessage({ type: 'seneve-notification' });
    } catch { /* aucune page à prévenir */ }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.url) || BASE + 'espace';
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).pathname.startsWith(BASE)) { await f.focus(); if ('navigate' in f) await f.navigate(lien).catch(() => undefined); return; }
    }
    await self.clients.openWindow(lien);
  })());
});
