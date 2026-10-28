/* SÉNEVÉ — consultation hors connexion de l'espace web.
 * - Pages : le réseau a 3 secondes pour répondre ; sinon (ou sans réseau), la dernière version enregistrée du site.
 * - Fichiers du site (assets, icônes) : gardés après le premier chargement.
 * - Textes de la Bible (domaine public) : gardés dans un cache à part, conservé d'une version du site à l'autre.
 * - Données (Supabase), coach, e-mails : jamais mis en cache ici (rien de privé dans ce cache).
 */
const CACHE = 'seneve-site-v27-lectures-directes-20261028';
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
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('seneve-site-') && k !== CACHE).map(k => caches.delete(k))))
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
      const horsLigne = () => new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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
    body: m.body || '', tag: m.tag || 'seneve-rappel', icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/favicon-48.png', data: { url: lien },
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
