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
 },self:{location:new URL('https://example.org/seneve/sw.js'),addEventListener:(n,f)=>listeners[n]=f,skipWaiting:()=>{skipped=true;},clients:{claim:async()=>{}}}});
 vm.runInContext(source,context);
 return {listeners,entries,context,skipped:()=>skipped};
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
