// Outil ponctuel : texte de chaque page d'un PDF du livre (pour relever le sommaire et la page de chaque section).
// Usage : node scripts/extraire-pages-livre.mjs "<fichier.pdf>" > sortie.txt
import fs from 'node:fs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const data=new Uint8Array(fs.readFileSync(process.argv[2]));
const doc=await getDocument({data,useSystemFonts:true}).promise;
const plan=await doc.getOutline();
console.log('=== PLAN INTÉGRÉ ===');
for(const p of plan??[]){let page='?';try{const d=typeof p.dest==='string'?await doc.getDestination(p.dest):p.dest;if(d)page=(await doc.getPageIndex(d[0]))+1;}catch{/* destination illisible */}console.log(`${page}\t${p.title}`);for(const s of p.items??[]){let sp='?';try{const d=typeof s.dest==='string'?await doc.getDestination(s.dest):s.dest;if(d)sp=(await doc.getPageIndex(d[0]))+1;}catch{/* */}console.log(`${sp}\t  ${s.title}`);}}
for(let i=1;i<=doc.numPages;i++){const t=await (await doc.getPage(i)).getTextContent();console.log(`=== PAGE ${i} ===`);console.log(t.items.map(x=>'str'in x?x.str:'').join(' ').replace(/\s+/g,' ').trim().slice(0,400));}
