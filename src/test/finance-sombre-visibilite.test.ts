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
 it('rend visible le seul objectif sélectionné sur fond lavande en mode sombre',()=>{
  expect(finance).toContain('className="finance-choix-objectifs');
  expect(finance).toContain('aria-pressed={!nouvelObjectif&&!choixVersementRequis&&g.goal_id===objectif?.goal_id}');
  expect(css).toContain('.finance-choix-objectifs button[aria-pressed="true"]');
  expect(css).toContain('background:#eee8fc!important');
  expect(css).toContain('color:#151b36!important');
  expect(css).toContain('-webkit-text-fill-color:#151b36!important');
  expect(css).toContain('border:2px solid var(--accent,#49439b)!important');
  expect(contraste('#151b36','#eee8fc')).toBeGreaterThan(7);
  const dernier=css.slice(css.indexOf('/* Objectif sélectionné en mode sombre (Voiture'));
  expect(dernier).toContain('data-apparence="sombre"');
  expect(dernier).not.toContain('data-apparence="clair"');
 });
 it('ne modifie pas les autres pages ni les calculs',()=>{
  expect(css).not.toContain('data-apparence="clair"');
  expect(css).not.toContain('.bb-page');
  expect(css).not.toContain('.journal-page');
  expect(css).not.toContain('.parcours-page');
 });
});
