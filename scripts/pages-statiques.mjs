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
    ['/seneve/og-image-v3.jpg', '/seneve/og-image-en-v1.jpg'],
    ['content="SÉNEVÉ — Test des 7 Racines : Ce qui grandit commence à l’intérieur, avec la photo de racines dans la terre"', 'content="SÉNEVÉ — 7 Roots Test: Growth begins within, with a photo of roots in the soil"'],
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
for (const route of routes) {
  const fichier = `dist/${route}.html`;
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, route === 'en' ? versionAnglaise(page) : ACCUEILS.has(route) ? page : sansPhotoAccueil(page));
}
// 404.html sert les adresses profondes (Bible, etc.) : elles n'affichent pas la photo de l'accueil.
writeFileSync('dist/404.html', sansPhotoAccueil(readFileSync('dist/404.html', 'utf8')));
console.log(`${routes.length} pages fixes : ${routes.join(', ')}`);
