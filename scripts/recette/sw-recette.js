/* SÉNEVÉ — VERSION DE TEST (seneve-test) : notifications seulement.
 * Aucun cache : le cache hors connexion du site réel (même origine) n'est jamais touché.
 * Mêmes règles d'affichage que public/sw.js : titre, texte neutre, lien limité à cette version de test. */
const BASE = new URL('./', self.location).pathname;          // /seneve/recette-hd/

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = {}; }
  const lien = typeof m.url === 'string' && m.url.startsWith(BASE) ? m.url : BASE + 'acces';
  e.waitUntil(self.registration.showNotification(m.title || 'SÉNEVÉ (test)', {
    body: m.body || '', tag: m.tag || 'seneve-rappel-test', icon: BASE + 'icons/icon-192.png', badge: BASE + 'icons/favicon-48.png', data: { url: lien },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.url) || BASE + 'acces';
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).pathname.startsWith(BASE)) { await f.focus(); if ('navigate' in f) await f.navigate(lien).catch(() => undefined); return; }
    }
    await self.clients.openWindow(lien);
  })());
});
