import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const lire=(f:string)=>readFileSync(`${process.cwd()}/src/${f}`,'utf8');
// Lisibilité vérifiée le 27/11/2026 : la feuille des contrastes doit rester la dernière chargée.
it('charge la feuille des contrastes après toutes les autres',()=>{
 const main=lire('main.tsx'),imports=[...main.matchAll(/^import '\.\/(styles[^']+\.css)';/gm)].map(m=>m[1]);
 expect(imports.at(-1)).toBe('styles-contrastes.css');
});
it('garde un fond sombre au lecteur de prière en mode sombre et des boutons teintés lisibles',()=>{
 const css=lire('styles-contrastes.css'),doux=lire('styles-sombre-doux.css');
 expect(css).toMatch(/\[data-apparence="sombre"\] dialog\.hd-lecteur-priere\{background:rgb\(0 0 0\)!important/);
 expect(doux).toContain('--sd-texte:color-mix(in srgb,var(--sd-teinte) 60%,#f5f5f7)');
 expect(doux).not.toContain('color:var(--sd-teinte)!important;-webkit-text-fill-color:var(--sd-teinte)!important');
});
