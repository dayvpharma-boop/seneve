// Après le build : une copie de index.html par route fixe (dist/p.html, dist/livre/audio.html…).
// GitHub Pages sert alors /seneve/p avec un statut 200 au lieu de passer par 404.html :
// les aperçus de lien (WhatsApp, Facebook) et les moteurs de recherche lisent la page normalement.
// Les routes viennent de src/main.tsx, pour ne jamais en oublier une nouvelle.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const main = readFileSync('src/main.tsx', 'utf8');
const routes = [...new Set([...main.matchAll(/path="\/([^"*:]+)"/g)].map(m => m[1]))];
const page = readFileSync('dist/index.html', 'utf8');
// /en : même page, mais aperçu de lien en anglais (WhatsApp, Facebook, X lisent ces balises sans exécuter le site).
function versionAnglaise(html) {
  const rempl = [
    ['<html lang="fr">', '<html lang="en">'],
    ['<title>Test des 7 Racines — SÉNEVÉ</title>', '<title>The 7 Roots Test — SÉNEVÉ</title>'],
    ['content="21 questions courtes, tirées du livre « Arrête de mendier des miracles »."', 'content="21 short questions, drawn from the book “Stop Begging for Miracles”."'],
    ['content="Test des 7 Racines — Ce qui grandit commence à l’intérieur."', 'content="7 Roots Test — Growth begins within."'],
    ['content="https://dayvpharma-boop.github.io/seneve/"', 'content="https://dayvpharma-boop.github.io/seneve/en"'],
    ['<meta property="og:locale" content="fr_FR" />', '<meta property="og:locale" content="en_GB" />'],
    ['<meta property="og:locale:alternate" content="en_GB" />', '<meta property="og:locale:alternate" content="fr_FR" />'],
    ['/seneve/og-image-v6.jpg', '/seneve/og-image-en-v4.jpg'],
    ['content="SÉNEVÉ — Test des 7 Racines : Ce qui grandit commence à l’intérieur. Panneau de verre dépoli sur la photo de racines dans la terre"', 'content="SÉNEVÉ — 7 Roots Test: Growth begins within. Frosted glass panel over a photo of roots in the soil"'],
  ];
  let sortie = html;
  for (const [avant, apres] of rempl) {
    if (!sortie.includes(avant)) throw new Error(`Aperçu anglais : balise introuvable dans index.html : ${avant}`);
    sortie = sortie.split(avant).join(apres);
  }
  return sortie;
}
// La photo de l'accueil n'est préchargée que sur les pages du Test (/, /p, /en) : ailleurs, elle ne s'affiche pas.
const ACCUEILS = new Set(['p', 'en']);
function sansPhotoAccueil(html) {
  const sortie = html.replace(/\s*<link rel="preload" as="image" data-accueil[^>]*>/, '');
  if (sortie === html) throw new Error('Préchargement de la photo de l’accueil introuvable dans index.html');
  return sortie;
}
// Aperçu de lien propre à une page : sans lui, partager /habitudes sur WhatsApp montrait le Test des 7 Racines.
const SITE = 'https://dayvpharma-boop.github.io/seneve/';
function apercu(html, route, { titre, description, titreLien, image, alt }) {
  const rempl = [
    ['<title>Test des 7 Racines — SÉNEVÉ</title>', `<title>${titre}</title>`],
    ['<meta name="description" content="21 questions courtes, tirées du livre « Arrête de mendier des miracles »." />', `<meta name="description" content="${description}" />`],
    ['<meta property="og:description" content="21 questions courtes, tirées du livre « Arrête de mendier des miracles »." />', `<meta property="og:description" content="${description}" />`],
    ['content="Test des 7 Racines — Ce qui grandit commence à l’intérieur."', `content="${titreLien}"`],
    [`<meta property="og:url" content="${SITE}" />`, `<meta property="og:url" content="${SITE}${route}" />`],
  ];
  if (image) rempl.push(['/seneve/og-image-v6.jpg', `/seneve/${image}`], ['content="SÉNEVÉ — Test des 7 Racines : Ce qui grandit commence à l’intérieur. Panneau de verre dépoli sur la photo de racines dans la terre"', `content="${alt}"`]);
  let sortie = html;
  for (const [avant, apres] of rempl) {
    if (!sortie.includes(avant)) throw new Error(`Aperçu de /${route} : balise introuvable dans index.html : ${avant}`);
    sortie = sortie.split(avant).join(apres);
  }
  return sortie;
}
const HABITUDES = {
  titre: 'Habitudes & Défis — SÉNEVÉ',
  description: 'Un parcours prévu sur six mois pour faire une place à la prière, à la lecture, à la gratitude et aux actions concrètes dans ton quotidien.',
  titreLien: 'Habitudes & Défis — De petits actes. Un rythme qui prend racine.',
  image: 'og-image-habitudes-v5.jpg',
  alt: 'SÉNEVÉ — Habitudes & Défis : De petits actes. Un rythme qui prend racine. 30 jours gratuits. Avec la couverture « De la graine à l’arbre ».',
};
// /habitudes/en : même aperçu, en anglais, avec la couverture « From seed to tree ».
const HABITUDES_EN = {
  titre: 'Habits & Challenges — SÉNEVÉ',
  description: 'A planned six-month journey making room for prayer, reading, gratitude and practical actions in everyday life.',
  titreLien: 'Habits & Challenges — Small actions. A rhythm that takes root.',
  image: 'og-image-habitudes-en-v4.jpg',
  alt: 'SÉNEVÉ — Habits & Challenges: Small actions. A rhythm that takes root. 30 days free. With the cover “From seed to tree”.',
};
function enAnglais(html) {
  const rempl = [
    ['<html lang="fr">', '<html lang="en">'],
    ['<meta property="og:locale" content="fr_FR" />', '<meta property="og:locale" content="en_GB" />'],
    ['<meta property="og:locale:alternate" content="en_GB" />', '<meta property="og:locale:alternate" content="fr_FR" />'],
  ];
  let sortie = html;
  for (const [avant, apres] of rempl) {
    if (!sortie.includes(avant)) throw new Error(`Aperçu anglais de Habitudes : balise introuvable dans index.html : ${avant}`);
    sortie = sortie.split(avant).join(apres);
  }
  return sortie;
}
const ESPACE = {
  titre: 'Mon espace — SÉNEVÉ',
  description: 'Tes lectures, tes actions et ton journal pour mettre en pratique les principes du Royaume au quotidien.',
  titreLien: 'SÉNEVÉ — Ton espace',
};
// Pages lisibles sans compte : elles seules vont dans le plan du site (sitemap.xml) pour Google.
// Les autres (espace, journal, réglages, /p qui double l'accueil…) portent « noindex » : sans compte, elles renvoient à la connexion.
// GitHub Pages ne permet pas de robots.txt sous /seneve/ (il n'est lu qu'à la racine du domaine) : le plan se déclare dans Search Console.
const PUBLIQUES = ['', 'en', 'habitudes', 'habitudes/en', 'livre', 'livre/audio', 'livre/pdf', 'offres', 'bible', 'bible/livres', 'confidentialite'];
for (const route of PUBLIQUES) {
  if (route && !routes.includes(route)) throw new Error(`Plan du site : /${route} n'est plus une route de src/main.tsx`);
}
function sansIndex(html) {
  const avant = '<meta name="viewport" content="width=device-width, initial-scale=1" />';
  if (!html.includes(avant)) throw new Error('Balise viewport introuvable dans index.html');
  return html.replace(avant, `${avant}\n    <meta name="robots" content="noindex" />`);
}
function pageDe(route) {
  if (route === 'en') return versionAnglaise(page);
  if (ACCUEILS.has(route)) return page;
  const html = sansPhotoAccueil(page);
  if (route === 'habitudes/en') return enAnglais(apercu(html, route, HABITUDES_EN));
  if (route === 'habitudes' || route.startsWith('habitudes/')) return apercu(html, route, HABITUDES);
  if (route === 'connexion' || route === 'espace') return apercu(html, route, ESPACE);
  return html;
}
for (const route of routes) {
  const fichier = `dist/${route}.html`;
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, PUBLIQUES.includes(route) ? pageDe(route) : sansIndex(pageDe(route)));
}
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIQUES.map(route => `  <url><loc>${SITE}${route}</loc></url>`).join('\n')}
</urlset>
`);
// 404.html sert les adresses profondes (Bible, etc.) : elles n'affichent pas la photo de l'accueil.
writeFileSync('dist/404.html', sansPhotoAccueil(readFileSync('dist/404.html', 'utf8')));
console.log(`${routes.length} pages fixes : ${routes.join(', ')}`);
