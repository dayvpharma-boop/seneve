import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const css=readFileSync(`${process.cwd()}/src/components/SimulateurEpargne.css`,'utf8');
const page=readFileSync(`${process.cwd()}/src/components/SuiviEpargneDettes.tsx`,'utf8');

function luminance(hex:string){
 const c=hex.slice(1);
 const v=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255)
   .map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return v[0]!*.2126+v[1]!*.7152+v[2]!*.0722;
}
function ratio(a:string,b:string){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}

describe('Objectifs SÉNEVÉ Finance — bouton sélectionné en mode sombre',()=>{
 it('repère le groupe des objectifs FR et EN sans toucher à leur comportement',()=>{
  expect(page).toContain('finance-choix-objectifs');
  expect(page).toContain("aria-label={l('Mes objectifs','My goals')}");
  expect(page).toContain('aria-pressed={!nouvelObjectif&&!choixVersementRequis&&g.goal_id===objectif?.goal_id}');
  expect(page).toContain('aria-pressed={nouvelObjectif}');
 });
 it('distingue clairement l’objectif actif noir/blanc et les autres blancs/foncés',()=>{
  expect(css).toContain('.finance-choix-objectifs button[aria-pressed="true"]');
  expect(css).toContain('.finance-choix-objectifs button[aria-pressed="false"]');
  expect(css).toContain('background:#202331!important;');
  expect(css).toContain('color:#ffffff!important;');
  expect(css).toContain('background:#ffffff!important;');
  expect(css).toContain('color:#202331!important;');
  expect(ratio('#ffffff','#202331')).toBeGreaterThan(10);
  expect(ratio('#202331','#ffffff')).toBeGreaterThan(10);
 });
 it('limite les modifications au thème sombre de SÉNEVÉ Finance',()=>{
  const nouveau=css.slice(css.indexOf('/* Écran Finance, choix de l\'objectif en mode sombre'));
  expect(nouveau).toContain('data-apparence="sombre"');
  expect(nouveau).toContain('.hd-ecran.ios');
  expect(nouveau).toContain('.finance-cartes-lisibles .finance-choix-objectifs');
  expect(nouveau).not.toContain('data-apparence="clair"');
  expect(nouveau).not.toContain('.bl-page');
  expect(nouveau).not.toContain('.journal-page');
 });
});
