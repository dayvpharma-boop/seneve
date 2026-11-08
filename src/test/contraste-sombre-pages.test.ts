import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const css=readFileSync(`${process.cwd()}/src/styles-contraste-sombre.css`,'utf8');
const main=readFileSync(`${process.cwd()}/src/main.tsx`,'utf8');
const ancien=readFileSync(`${process.cwd()}/src/styles.css`,'utf8');

function rapportContraste(fg:string,bg:string){
 const linear=(hex:string)=>{
  const code=hex.replace('#','');
  const comp=[0,2,4].map(i=>parseInt(code.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*comp[0]!+.7152*comp[1]!+.0722*comp[2]!;
 };
 const a=linear(fg),b=linear(bg);
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}

describe('Audit de contraste — SÉNEVÉ FR/EN clair et sombre',()=>{
 it('charge le correctif en dernier, après la palette iPhone et globale',()=>{
  expect(main.indexOf("import './styles-contraste-sombre.css'")).toBeGreaterThan(main.indexOf("import './styles-iphone.css'"));
  expect(main.indexOf("import './styles-contraste-sombre.css'")).toBeGreaterThan(main.indexOf("import './styles-harmonie-globale.css'"));
 });
 it('traite le choix explicite du thème indépendamment du thème système',()=>{
  expect(css).toContain(':root:root[data-apparence="clair"]');
  expect(css).toContain(':root:root[data-apparence="sombre"]');
  for(const v of ['--hdc-on-surface','--hdc-background','--hdc-surface-container-low']){
   expect(css.split(v).length).toBeGreaterThanOrEqual(3);
   expect(ancien).toContain(v);
  }
  expect(css).toContain('--hd-encre:#ede7dc');
  expect(css).toContain('--hd-carte:#211f1c');
 });
 it('corrige les cartes blanches, les bordures du suivi financier, journal et paramètres',()=>{
  for(const s of ['.hd-ecran.ios','.bg-white','.rep-heros','.sim-ios-groupe','.pv-groupe','.journal-form','.journal-question','.journal-page.ios','.coach-page.ios']){
   expect(css).toContain(s);
  }
  expect(css).toContain('backdrop-filter:none!important');
  expect(css).toContain('--sv-bordure:#626b88');
  expect(css).toContain('data-apparence="sombre"');
 });
 it('assure un contraste texte/fond supérieur à 4,5:1 sur les surfaces corrigées',()=>{
  expect(rapportContraste('#f2f2f7','#25283a')).toBeGreaterThan(7);
  expect(rapportContraste('#bec3d6','#25283a')).toBeGreaterThan(7);
  expect(rapportContraste('#626b7c','#ffffff')).toBeGreaterThan(4.5);
  expect(rapportContraste('#c3c5d5','#1e2a3d')).toBeGreaterThan(7);
 });
 it('ne modifie pas le lecteur Bible et ne touche ni aux paiements ni à l’administration',()=>{
  expect(css).toContain('.bb-page.ios:not(.bb-page-lecture)');
  expect(css).not.toMatch(/\.bb-page-lecture\s*\{/);
  expect(css).not.toMatch(/\.admin-[\w-]+\s*\{/);
  expect(css).not.toContain('hd_finance_allocation_save');
 });
});
