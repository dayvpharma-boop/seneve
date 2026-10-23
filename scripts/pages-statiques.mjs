// Après le build : une copie de index.html par route fixe (dist/p.html, dist/livre/audio.html…).
// GitHub Pages sert alors /seneve/p avec un statut 200 au lieu de passer par 404.html :
// les aperçus de lien (WhatsApp, Facebook) et les moteurs de recherche lisent la page normalement.
// Les routes viennent de src/main.tsx, pour ne jamais en oublier une nouvelle.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const main = readFileSync('src/main.tsx', 'utf8');
const routes = [...new Set([...main.matchAll(/path="\/([^"*:]+)"/g)].map(m => m[1]))];
const page = readFileSync('dist/index.html', 'utf8');
for (const route of routes) {
  const fichier = `dist/${route}.html`;
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, page);
}
console.log(`${routes.length} pages fixes : ${routes.join(', ')}`);
