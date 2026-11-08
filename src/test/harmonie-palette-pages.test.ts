import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

/** Contrat visuel : harmonisation décorative, quel que soit le texte FR/EN. */
const css=readFileSync(`${process.cwd()}/src/styles-harmonie-globale.css`,'utf8');
const main=readFileSync(`${process.cwd()}/src/main.tsx`,'utf8');

describe('Harmonisation pastel SÉNEVÉ',()=>{
 it('est chargée après les thèmes communs sans modification des composants métier',()=>{
  expect(main.indexOf("import './styles-ilots-clairs.css'")).toBeGreaterThan(-1);
  expect(main.indexOf("import './styles-harmonie-globale.css'")).toBeGreaterThan(main.indexOf("import './styles-ilots-clairs.css'"));
 });
 it('couvre Aujourd’hui, parcours, bibliothèque, Bible, journal, profil/réglages, cultes et aides',()=>{
  for(const page of ['.espace-page.ios','.parcours-page.ios','.bl-page.ios','.bb-page.ios','.journal-page.ios','.pv-page.ios','.hd-ecran.ios','.oa-page.ios','.aide-page.ios','.coach-page.ios','.nt-page.ios']){
   expect(css).toContain(page);
  }
  expect(css).toContain('.pv-groupe');
  expect(css).toContain('.hd-public-section');
 });
 it('conserve la palette du jour HD, les préférences sombres et le lecteur Bible',()=>{
  expect(css).toContain(':not(:has(.hd-aujourdhui-pastel))');
  expect(css).toContain(':not(.bb-page-lecture)');
  expect(css).toContain(':not(.bb-ambiance-sepia)');
  expect(css).toContain(':not(.bb-ambiance-nocturne)');
  expect(css).toContain(':root[data-apparence="sombre"]');
  expect(css).toContain('prefers-color-scheme:dark');
  expect(css).toContain(':root:not([data-apparence="clair"])');
 });
 it('adoucit les surfaces sans réécrire les statuts, les textes ni les boutons de paiement',()=>{
  expect(css).toContain('--sv-carte-violette');
  expect(css).toContain('--sv-carte-bleue');
  expect(css).toContain('--sv-carte-peche');
  expect(css).not.toMatch(/\.oa-primary\s*\{/);
  expect(css).not.toMatch(/\.bb-lecture-texte\s*\{/);
 });
 it('garde le bleu nuit original du verset d’accueil Bible, sans recolorer sa citation',()=>{
  const ancien=readFileSync(`${process.cwd()}/src/styles-iphone.css`,'utf8');
  expect(ancien).toContain('.bb-carte.bb-reprendre{background:radial-gradient');
  expect(ancien).toContain('linear-gradient(160deg,#2a1f7a,#151040)');
  // Le sélecteur global n’intercepte plus la carte supérieure ni son verset.
  expect(css).toContain('.bb-carte:not(.bb-reprendre)');
  expect(css).toContain('.bb-citation:not(.bb-reprendre .bb-citation)');
  expect(css).not.toContain(':is(.bb-carte.bb-reprendre,.bb-citation)');
 });
});
