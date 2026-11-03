import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(failAsset=false){
 const listeners={},entries=new Map();let skipped=false;
 const cache={match:async u=>entries.get(u)?.clone(),put:async(u,r)=>entries.set(u,r.clone()),add:async u=>{if(failAsset&&u.endsWith('.js'))throw Error('offline');entries.set(u,new Response('asset'));}};
 const caches={open:async()=>cache,match:cache.match,keys:async()=>[],delete:async()=>true};
 const context=vm.createContext({URL,Response,Set,Date,Promise,setTimeout,clearTimeout,caches,fetch:async u=>{
  if(String(u).endsWith('index.html'))return new Response('<script src="/seneve/assets/app.js"></script>');
  if(String(u).endsWith('asset-manifest.json'))return Response.json({'src/routes/espace.tsx':{file:'assets/espace.js'}});
  throw Error('offline');
 },self:{location:new URL('https://example.org/seneve/sw.js'),addEventListener:(n,f)=>listeners[n]=f,skipWaiting:()=>{skipped=true;},clients:{claim:async()=>{},matchAll:async()=>fenetres}}});
 const fenetres=[];
 vm.runInContext(source,context);
 return {listeners,entries,context,fenetres,skipped:()=>skipped};
}
test('installation télécharge aussi les pages avant activation',async()=>{
 const w=worker();let p;w.listeners.install({waitUntil:v=>p=v});await p;
 assert(w.skipped());assert(w.entries.has('/seneve/assets/espace.js'));assert(w.entries.has('/seneve/index.html'));
});
test('une installation incomplète ne remplace pas le service précédent',async()=>{
 const w=worker(true);let p;w.listeners.install({waitUntil:v=>p=v});await assert.rejects(p);assert(!w.skipped());assert(!w.entries.has('/seneve/index.html'));
});
for(const status of [0,404,503])test(`navigation avec réseau ${status}: copie disponible`,async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('copie'));
 w.context.fetch=async()=>{if(!status)throw Error('offline');return new Response('erreur',{status});};
 let p;w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:()=>{},respondWith:v=>p=v});
 assert.equal(await(await p).text(),'copie');
});
test('la recette ne reçoit pas la page du site réel',()=>{
 const w=worker();let handled=false;w.listeners.fetch({request:{url:'https://example.org/seneve/recette-hd/acces',method:'GET',mode:'navigate'},respondWith:()=>handled=true});assert(!handled);
});
test('une route ne remplace jamais la copie principale',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('copie'));w.context.fetch=async()=>new Response('route');
 let p;w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:()=>{},respondWith:v=>p=v});await p;
 assert.equal(await w.entries.get('/seneve/index.html').text(),'copie');
});
test('une visite directe de la page Amidah montre son vrai texte HTML, pas la page d’accueil',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('copie du test'));
 w.context.fetch=async()=>new Response('Prière du matin · conclusion publiée');
 let p;
 w.listeners.fetch({request:{url:'https://example.org/seneve/amidah.html',method:'GET',mode:'navigate'},respondWith:v=>p=v});
 assert.match(await(await p).text(),/conclusion publiée/);
});
test('visite de /espace avec réseau : page publiée à jour, copie renouvelée (03/11/2026)',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('ancienne'));
 const base=w.context.fetch;
 w.context.fetch=async u=>{
  const url=String(u.url??u);
  if(url.endsWith('/seneve/espace'))return new Response('page espace');
  if(url.endsWith('/seneve/index.html'))return new Response('<script src="/seneve/assets/nouveau.js"></script>');
  return base(u);
 };
 const attentes=[];let p;
 w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:v=>attentes.push(v),respondWith:v=>p=v});
 assert.equal(await(await p).text(),'page espace');
 await Promise.all(attentes);
 assert.match(await w.entries.get('/seneve/index.html').text(),/nouveau.js/);
});
test('retour dans SÉNEVÉ : réseau trop lent, la copie s’ouvre après au plus 1,5 s (30/10 et 03/11/2026)',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('copie'));
 w.context.fetch=()=>new Promise(()=>{}); // réseau qui ne répond jamais
 let p;w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:()=>{},respondWith:v=>p=v});
 const r=await Promise.race([p,new Promise(ok=>setTimeout(()=>ok('attente'),2000))]);
 assert.notEqual(r,'attente');assert.equal(await r.text(),'copie');
});
test('sans copie sur le téléphone, la page vient du réseau',async()=>{
 const w=worker();w.context.fetch=async()=>new Response('reseau');
 let p;w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:()=>{},respondWith:v=>p=v});
 assert.equal(await(await p).text(),'reseau');
});
test('accueil publié différent de la copie : la nouvelle version s’ouvre tout de suite et est gardée',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('ancienne'));
 const base=w.context.fetch;w.context.fetch=async u=>String(u.url??u).endsWith('/seneve/')?new Response('nouvelle'):base(u);
 const attentes=[];let p;
 w.listeners.fetch({request:{url:'https://example.org/seneve/',method:'GET',mode:'navigate'},waitUntil:v=>attentes.push(v),respondWith:v=>p=v});
 assert.equal(await(await p).text(),'nouvelle');
 await Promise.all(attentes);
 assert.match(await w.entries.get('/seneve/index.html').text(),/app\.js/);
});
test('réseau lent : la copie s’ouvre, puis les pages ouvertes sont prévenues de la nouvelle version',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('ancienne'));
 const messages=[];w.fenetres.push({postMessage:m=>messages.push(m)});
 const base=w.context.fetch;
 w.context.fetch=async u=>{const url=String(u.url??u);
  if(url.endsWith('/seneve/espace'))return new Promise(ok=>setTimeout(()=>ok(new Response('page espace')),1800));
  if(url.endsWith('/seneve/index.html'))return new Response('<script src="/seneve/assets/nouveau.js"></script>');
  return base(u);};
 const attentes=[];let p;
 w.listeners.fetch({request:{url:'https://example.org/seneve/espace',method:'GET',mode:'navigate'},waitUntil:v=>attentes.push(v),respondWith:v=>p=v});
 assert.equal(await(await p).text(),'ancienne');
 await Promise.all(attentes);
 assert.match(await w.entries.get('/seneve/index.html').text(),/nouveau.js/);
 assert.deepEqual(messages.map(m=>m.type),['seneve-nouvelle-version']);
});
test('retour dans l’app ouverte : la page demande une vérification et reçoit la nouvelle version',async()=>{
 const w=worker();w.entries.set('/seneve/index.html',new Response('ancienne'));
 const messages=[];w.fenetres.push({postMessage:m=>messages.push(m)});
 let p;w.listeners.message({data:{type:'seneve-verifier-version'},waitUntil:v=>p=v});await p;
 assert.match(await w.entries.get('/seneve/index.html').text(),/app\.js/);
 assert.deepEqual(messages.map(m=>m.type),['seneve-nouvelle-version']);
});
test('version publiée identique : aucun message',async()=>{
 const w=worker();const html='<script src="/seneve/assets/app.js"></script>';w.entries.set('/seneve/index.html',new Response(html));
 const messages=[];w.fenetres.push({postMessage:m=>messages.push(m)});
 let p;w.listeners.message({data:{type:'seneve-verifier-version'},waitUntil:v=>p=v});await p;
 assert.equal(messages.length,0);
});
