import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const css=readFileSync(`${process.cwd()}/src/components/SimulateurEpargne.css`,'utf8');
const compte=readFileSync(`${process.cwd()}/src/routes/habitudes-compteurs.tsx`,'utf8');
const finance=readFileSync(`${process.cwd()}/src/components/SuiviEpargneDettes.tsx`,'utf8');

function luminance(hex:string){
 const c=hex.replace('#','');
 const v=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255);
 const lin=v.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return lin[0]!*.2126+lin[1]!*.7152+lin[2]!*.0722;
}
function contraste(a:string,b:string){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

describe('Choix de l’objectif SÉNEVÉ Finance en mode sombre',()=>{
 it('applique un style distinct seulement à la pastille sélectionnée',()=>{
  expect(finance).toContain('className="finance-objectifs-choix flex gap-2');
  expect(finance).toContain("aria-pressed={!nouvelObjectif&&!choixVersementRequis&&g.goal_id===objectif?.goal_id}");
  expect(finance).toContain('aria-pressed={nouvelObjectif}');
  expect(css).toContain('.finance-objectifs-choix button[aria-pressed="true"]');
  expect(css).toContain('background:#202331!important');
  expect(css).toContain('color:#ffffff!important');
  expect(css).not.toContain('.finance-objectifs-choix button[aria-pressed="false"]');
 });
 it('ne remplace ni les couleurs des cartes ni le mode clair',()=>{
  const corr=css.slice(css.lastIndexOf('/* SÉNEVÉ Finance — objectif choisi'));
  expect(corr).toContain('data-apparence="sombre"');
  expect(corr).not.toContain('bg-white {');
  expect(corr).not.toContain('data-apparence="clair"');
 });
});

describe('SÉNEVÉ Finance : seules les cartes blanches sont corrigées en mode sombre',()=>{
 it('cible uniquement les pages SÉNEVÉ Compte et SÉNEVÉ Finance',()=>{
  expect(compte).toContain('className="finance-cartes-lisibles sim-ios');
  expect(finance).toContain('className="finance-cartes-lisibles sim-ios');
  expect(css).toContain('data-apparence="sombre"');
  expect(css).toContain('.finance-cartes-lisibles .bg-white');
 });
 it('montants, titres et sous-titres sur blanc ont un contraste de niveau AA',()=>{
  expect(contraste('#202331','#ffffff')).toBeGreaterThan(4.5);
  expect(contraste('#575e6b','#ffffff')).toBeGreaterThan(4.5);
  expect(css).toContain('.bg-white .text-hd-on-surface-variant');
  expect(css).toContain('.bg-white :is(h2,h3,h4,.text-hd-on-surface)');
 });
 it('préserve les sous-cartes sombres et les boutons violets',()=>{
  expect(css).toContain('.bg-white :is(.sim-ios-groupe,[style*="--ios-fond"])');
  expect(css).toContain('.bg-white.text-hd-secondary');
  expect(css).not.toContain('.hd-ecran.ios .bg-white {');
 });
 it('ne modifie pas les autres pages ni les calculs',()=>{
  expect(css).not.toContain('data-apparence="clair"');
  expect(css).not.toContain('.bb-page');
  expect(css).not.toContain('.journal-page');
  expect(css).not.toContain('.parcours-page');
 });
});
