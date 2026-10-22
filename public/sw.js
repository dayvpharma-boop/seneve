/* SÉNEVÉ — consultation hors connexion de l'espace web.
 * - Pages : le réseau d'abord ; sans réseau, la dernière version enregistrée du site.
 * - Fichiers du site (assets, icônes) : gardés après le premier chargement.
 * - Textes de la Bible (domaine public) : gardés dans un cache à part, conservé d'une version du site à l'autre.
 * - Données (Supabase), coach, e-mails : jamais mis en cache ici (rien de privé dans ce cache).
 */
const CACHE = 'seneve-site-v9-20261022';
const CACHE_BIBLE = 'seneve-bible-v1';
const BASE = new URL('./', self.location).pathname;          // ex. /seneve/
const INDEX = BASE + 'index.html';

async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch(INDEX, { cache: 'no-store' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put(INDEX, res);
  const urls = new Set([BASE + 'manifest.webmanifest', BASE + 'icons/icon-192.png']);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = new URL(m[1], self.location.origin + BASE);
    if (u.origin === self.location.origin && u.pathname.startsWith(BASE + 'assets/')) urls.add(u.pathname);
  }
  await Promise.all([...urls].map(u => cache.add(u).catch(() => undefined)));
}

self.addEventListener('install', e => { e.waitUntil(precache().catch(() => undefined).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('seneve-site-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;   // Supabase, n8n, polices : pas touchés

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(CACHE); c.put(INDEX, res.clone()); }
        return res;
      } catch {
        return (await caches.match(INDEX)) || new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (url.pathname.startsWith(BASE + 'bible/')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_BIBLE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (url.pathname.startsWith(BASE + 'assets/') || url.pathname.startsWith(BASE + 'icons/') || url.pathname.endsWith('manifest.webmanifest')) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
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
