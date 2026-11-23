// Exécution CI : vrai Chromium, Auth et notes fictifs, aucune connexion externe autorisée.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const racine=path.resolve('dist-recette-journal');
const serveur=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');let fichier=path.resolve(racine,'.'+decodeURIComponent(url.pathname));
 if(!fichier.startsWith(racine+path.sep))fichier=path.join(racine,'index.html');
 let data;try{data=await readFile(fichier);}catch{fichier=path.join(racine,'index.html');data=await readFile(fichier);}
 res.setHeader('Content-Type',fichier.endsWith('.js')?'text/javascript':fichier.endsWith('.css')?'text/css':'text/html');res.end(data);
 }catch{res.writeHead(500);res.end();}});
await new Promise(r=>serveur.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+serveur.address().port;
const browser=await chromium.launch({channel:'chrome'});const resultats=[];
try{for(const langue of ['fr','en']){
 const context=await browser.newContext();const externes=[];
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();externes.push(route.request().url());return route.abort();});
 const p=await context.newPage();await p.goto(origin+'/?lang='+langue);
 await p.evaluate(()=>{localStorage.setItem('recette-journal:note:A','NOTE SYNCHRONISEE FICTIVE');localStorage.setItem('seneve:journal:libre','ANCIEN BROUILLON');});
 await p.getByRole('button',{name:'Compte A',exact:true}).click();await p.goto(origin+'/?lang='+langue);
 await p.getByRole('textbox').fill('BROUILLON FICTIF A');
 await p.getByRole('button',{name:'Renouveler',exact:true}).click();assert.equal(await p.getByRole('textbox').inputValue(),'BROUILLON FICTIF A');
 await p.reload();await p.getByRole('textbox').waitFor();assert.equal(await p.getByRole('textbox').inputValue(),'BROUILLON FICTIF A');
 const autre=await context.newPage();await autre.goto(origin+'/?lang='+langue);await autre.getByRole('textbox').waitFor();
 await autre.getByRole('button',{name:'Déconnexion',exact:true}).click();await p.getByTestId('ferme').waitFor();
 assert.deepEqual(await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('seneve:compte:')||k.startsWith('seneve:journal:'))),[]);
 await p.getByRole('button',{name:'Compte B',exact:true}).click();await p.goto(origin+'/?lang='+langue);await p.getByRole('textbox').waitFor();
 assert.equal(await p.getByRole('textbox').inputValue(),'');assert.equal(await p.getByTestId('note').textContent(),'');
 await p.getByRole('textbox').fill('BROUILLON FICTIF B');
 await p.getByRole('button',{name:'Compte A',exact:true}).click();await p.getByTestId('compte').filter({hasText:'A'}).waitFor();
 assert.equal(await p.getByRole('textbox').inputValue(),'');assert.equal(await p.getByTestId('note').textContent(),'NOTE SYNCHRONISEE FICTIVE');
 assert.deepEqual(externes,[]);resultats.push({langue,statut:'reussi',onglets:2,requete_externe:0,auth:'fictive',notes:'fictives'});
 await mkdir('preuves-journal',{recursive:true});await writeFile('preuves-journal/'+langue+'.html',await p.content());await context.close();
 }await writeFile('preuves-journal/resultats.json',JSON.stringify({source:process.env.GITHUB_SHA??null,navigateur:'Chrome fourni par GitHub',resultats},null,2));console.log(JSON.stringify(resultats));
}finally{await browser.close();await new Promise(r=>serveur.close(r));}
