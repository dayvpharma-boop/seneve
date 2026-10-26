// Captures de comparaison Habitudes & Défis : maquettes Stitch (référence) et vrais composants.
// Usage (GitHub Actions) : node scripts/recette/captures-hd.mjs dossier-galerie dossier-sortie
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const [galerie,sortie]=process.argv.slice(2).map(p=>path.resolve(p));
await fs.mkdir(sortie,{recursive:true});
const b=await chromium.launch();
const rapport=[];
async function page(mode){const p=await b.newPage({viewport:{width:390,height:844},colorScheme:mode,deviceScaleFactor:2});const e=[];p.on('pageerror',x=>e.push(x.message));return [p,e];}
// 1. Références Stitch
for(const f of (await fs.readdir('design/stitch-hd')).filter(n=>n.endsWith('.html')).sort()){
 const [p,e]=await page('light');
 await p.goto('file://'+path.resolve('design/stitch-hd',f),{waitUntil:'networkidle'}).catch(x=>e.push(x.message));
 await p.waitForTimeout(800);
 await p.screenshot({path:path.join(sortie,'stitch-'+f.replace('.html','.png')),fullPage:true});
 rapport.push(`stitch ${f} : ${e.length?e.join(' | '):'ok'}`);await p.close();
}
// 2. Vrais composants, un écran par adresse (#nom)
const ecrans=JSON.parse(await fs.readFile(path.join(galerie,'ecrans.json'),'utf8'));
for(const mode of ['light','dark'])for(const nom of ecrans){
 const [p,e]=await page(mode);
 await p.goto('file://'+path.join(galerie,'galerie.html')+'#'+nom,{waitUntil:'networkidle'});
 await p.waitForSelector('body[data-pret="1"]',{timeout:10000}).catch(()=>e.push('page non prête'));
 await p.waitForTimeout(800);
 await p.screenshot({path:path.join(sortie,`site-${nom}-${mode}.png`),fullPage:true});
 rapport.push(`site ${nom} ${mode} : ${e.length?e.join(' | '):'ok'}`);await p.close();
}
await b.close();
await fs.writeFile(path.join(sortie,'rapport.txt'),rapport.join('\n')+'\n');
console.log(rapport.join('\n'));
