// Vérification visuelle FR/EN × clair/sombre de toutes les pages (aperçu avec compte fictif, sans réseau).
// Usage : node scripts/recette/captures-fr-en.mjs dist-apercu dossier-sortie
// Ne publie rien. Produit des captures 390 px et un rapport des écarts mesurables.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const [racineBrute, sortieBrute] = process.argv.slice(2);
const racine = path.resolve(racineBrute), sortie = path.resolve(sortieBrute);
await fs.mkdir(sortie, {recursive: true});

// Petit serveur : fichiers construits sous /seneve/, sinon index.html (application à une seule page).
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const serveur = http.createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let fichier = path.join(racine, url);
  try { const st = await fs.stat(fichier); if (st.isDirectory()) fichier = path.join(fichier, 'index.html'); await fs.access(fichier); }
  catch { fichier = path.join(racine, 'seneve', 'index.html'); }
  try { res.writeHead(200, {'content-type': types[path.extname(fichier)] ?? 'application/octet-stream'}); res.end(await fs.readFile(fichier)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => serveur.listen(4180, r));
const BASE = 'http://localhost:4180/seneve';

// [nom, adresse FR, adresse EN]
const PAGES = [
  ['test-accueil', '/', '/en'],
  ['habitudes-presentation', '/habitudes', '/habitudes?lang=en'],
  ['bible-accueil', '/bible', '/bible?lang=en'],
  ['bible-livres', '/bible/livres', '/bible/livres?lang=en'],
  ['bible-chapitre', '/bible/jhn/3', '/bible/jhn/3?lang=en'],
  ['bible-recherche', '/bible/recherche', '/bible/recherche?lang=en'],
  ['bible-annotations', '/bible/annotations', '/bible/annotations?lang=en'],
  ['bibliotheque', '/bibliotheque', '/bibliotheque?lang=en'],
  ['livre', '/livre', '/livre?lang=en'],
  ['livre-audio', '/livre/audio', '/livre/audio?lang=en'],
  ['livre-pdf', '/livre/pdf', '/livre/pdf?lang=en'],
  ['offres', '/offres', '/offres?lang=en'],
  ['acces', '/acces', '/acces?lang=en'],
  ['paiement', '/paiement', '/paiement?lang=en'],
  ['confidentialite', '/confidentialite', '/confidentialite?lang=en'],
  ['connexion', '/connexion', '/connexion?lang=en'],
  ['mot-de-passe-oublie', '/mot-de-passe-oublie', '/mot-de-passe-oublie?lang=en'],
  ['nouveau-mot-de-passe', '/nouveau-mot-de-passe', '/nouveau-mot-de-passe?lang=en'],
  ['espace-aujourdhui', '/espace?apercu=journee', '/espace?apercu=journee&lang=en'],
  ['espace-habitudes', '/espace?parcours=hd', '/espace?parcours=hd&lang=en'],
  ['parcours', '/progres', '/progres?lang=en'],
  ['parcours-habitudes', '/progres?parcours=hd', '/progres?parcours=hd&lang=en'],
  ['journal', '/journal', '/journal?lang=en'],
  ['coach', '/coach', '/coach?lang=en'],
  ['aide', '/aide', '/aide?lang=en'],
  ['notifications', '/notifications', '/notifications?lang=en'],
  ['profil', '/profil', '/profil?lang=en'],
  ['profil-carnet', '/profil?onglet=carnet', '/profil?onglet=carnet&lang=en'],
  ['profil-chemin', '/profil?onglet=chemin', '/profil?onglet=chemin&lang=en'],
  ['reglages-horaires', '/reglages?parcours=APERCU', '/reglages?parcours=APERCU&lang=en'],
  ['reglages', '/reglages', '/reglages?lang=en'],
  ['hd-inscription', '/habitudes/inscription', '/habitudes/inscription?lang=en'],
  ['hd-aujourdhui', '/habitudes/aujourdhui?parcours=hd', '/habitudes/aujourdhui?parcours=hd&lang=en'],
  ['hd-engagements', '/habitudes/engagements?parcours=hd', '/habitudes/engagements?parcours=hd&lang=en'],
  ['hd-aide', '/habitudes/aide?parcours=hd', '/habitudes/aide?parcours=hd&lang=en'],
  ['admin', '/admin', '/admin?lang=en'],
  ['admin-demandes', '/admin?vue=demandes', '/admin?vue=demandes&lang=en'],
  ['admin-participants', '/admin?vue=participants', '/admin?vue=participants&lang=en'],
  ['admin-contenus', '/admin?vue=contenus', '/admin?vue=contenus&lang=en'],
  ['accent-menthe', '/espace?parcours=hd', '/espace?parcours=hd&lang=en'],
  ['accent-corail', '/espace?apercu=journee', '/espace?apercu=journee&lang=en'],
  ['accent-ciel', '/reglages#accent', '/reglages?lang=en#accent'],
  ['accent-or', '/profil', '/profil?lang=en'],
  ['introuvable', '/page-qui-n-existe-pas', '/page-qui-n-existe-pas?lang=en'],
];

// Mesures faites dans la page : structure, couleurs principales, textes dans l'autre langue, zones mal adaptées au mode.
function mesurer(langueAttendue) {
  const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = 1] = m.map(Number); if (a < 0.5) return null;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const fond = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e), l = lum(s.backgroundColor); if (l !== null) return {l, c: s.backgroundColor}; } return {l: lum(getComputedStyle(document.documentElement).backgroundColor) ?? 1, c: 'html'}; };
  const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const tous = [...document.querySelectorAll('body *')].filter(visible);
  const structure = tous.filter(e => !['SPAN', 'STRONG', 'EM', 'B', 'I', 'BR', 'SMALL'].includes(e.tagName)).map(e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).sort().join('.') : ''));
  const vw = innerWidth, vh = innerHeight;
  // Grandes zones claires (pour le mode sombre) ou sombres (pour le mode clair).
  const zones = tous.map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e), l = lum(s.backgroundColor); return {e, aire: r.width * r.height, l, c: s.backgroundColor}; })
    .filter(z => z.l !== null && z.aire > vw * vh * 0.04)
    .map(z => ({sel: z.e.tagName.toLowerCase() + (typeof z.e.className === 'string' && z.e.className ? '.' + z.e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''), l: +z.l.toFixed(3), c: z.c, aire: Math.round(z.aire / (vw * vh) * 100)}));
  // Texte peu lisible : contraste < 3 avec le fond.
  const faibles = [];
  for (const e of tous) {
    const texte = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (texte.length < 2) continue;
    const lt = lum(getComputedStyle(e).color); if (lt === null) continue;
    const lf = fond(e).l, ratio = (Math.max(lt, lf) + 0.05) / (Math.min(lt, lf) + 0.05);
    if (ratio < 3) faibles.push({texte: texte.slice(0, 60), ratio: +ratio.toFixed(2), couleur: getComputedStyle(e).color, fond: fond(e).c});
  }
  // Textes dans l'autre langue (heuristique, à confirmer à l'œil).
  const fr = /\b(le|la|les|des|du|ton|ta|tes|une|est|pour|avec|dans|sur|mon|ma|mes|aujourd’hui|ouvrir|revenir|voir)\b|[éèêàùçœ]/i;
  const en = /\b(the|your|and|with|my|today|open|back|view|this|you)\b/i;
  const autre = langueAttendue === 'en' ? fr : en;
  const textes = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(), p = n.parentElement;
    if (t.length < 3 || !p || !visible(p) || p.closest('[lang]')?.getAttribute('lang')?.slice(0, 2) === (langueAttendue === 'en' ? 'fr' : 'en')) continue;
    if (p.closest('.material-symbols-outlined, [class*="symbol"], [aria-hidden="true"]')) continue;
    if (autre.test(t)) textes.add(t.slice(0, 90));
  }
  const css = s => getComputedStyle(document.querySelector(s) ?? document.body);
  return {
    apparence: document.documentElement.dataset.apparence ?? '(aucune)', langHtml: document.documentElement.lang, titre: document.title,
    hauteur: document.documentElement.scrollHeight, nbElements: structure.length, structure,
    couleurs: {html: getComputedStyle(document.documentElement).backgroundColor, body: css('body').backgroundColor, main: css('main').backgroundColor, texte: css('main').color, h1: css('h1').color, nav: css('nav').backgroundColor},
    zones, faibles: faibles.slice(0, 25), autreLangue: [...textes].slice(0, 25),
  };
}

const b = await chromium.launch();
const resultats = [];
for (const [nom, fr, en] of PAGES) for (const mode of ['light', 'dark']) for (const [langue, adr] of [['fr', fr], ['en', en]]) {
  const ctx = await b.newContext({viewport: {width: 390, height: 844}, colorScheme: mode, deviceScaleFactor: 1, serviceWorkers: 'block', locale: langue === 'en' ? 'en-GB' : 'fr-FR'});
  // Profil : versets gardés et graines partagées de ce téléphone, pour voir le fil et le carnet remplis.
  if (nom === 'profil' || nom === 'profil-carnet') await ctx.addInitScript(l => { try { localStorage.setItem('seneve:graines-partagees', '2'); localStorage.setItem('seneve:bible:annotations', JSON.stringify({ 'MAT.13.31': { cle: 'MAT.13.31', livre: 'MAT', chapitre: 13, verset: 31, version: l === 'en' ? 'web' : 'lsg', extrait: l === 'en' ? 'He set another parable before them, saying, “The Kingdom of Heaven is like a grain of mustard seed…' : 'Il leur proposa une autre parabole, et il dit: Le royaume des cieux est semblable à un grain de sénevé…', couleur: 'or', modifie: new Date(Date.now() - 5 * 864e5).toISOString() } })); } catch {} }, langue);
  // Couleur d'accent choisie sur ce téléphone (pages « accent-<couleur> »).
  if (nom.startsWith('accent-')) await ctx.addInitScript(a => { try { localStorage.setItem('seneve:preferences-visuelles:v1', JSON.stringify({ palette: 'ivoire', taille: 'normale', accent: a })); } catch {} }, nom.slice(7));
  const p = await ctx.newPage(), erreurs = [];
  p.on('pageerror', x => erreurs.push(x.message.slice(0, 200)));
  await p.goto(BASE + adr, {waitUntil: 'networkidle'}).catch(x => erreurs.push('navigation : ' + x.message.slice(0, 120)));
  await p.waitForTimeout(1500);
  const fichier = `${nom}-${langue}-${mode === 'light' ? 'clair' : 'sombre'}.png`;
  await p.screenshot({path: path.join(sortie, fichier), fullPage: true}).catch(x => erreurs.push('capture : ' + x.message.slice(0, 120)));
  const m = await p.evaluate(mesurer, langue).catch(x => ({erreurMesure: x.message}));
  resultats.push({nom, langue, mode: mode === 'light' ? 'clair' : 'sombre', adresse: p.url().replace('http://localhost:4180', ''), fichier, erreurs, ...m});
  await ctx.close();
}
await b.close();
serveur.close();
await fs.writeFile(path.join(sortie, 'rapport.json'), JSON.stringify(resultats, null, 1));
console.log(`${resultats.length} captures`);
