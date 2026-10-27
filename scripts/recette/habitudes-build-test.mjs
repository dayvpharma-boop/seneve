// Construction distincte : aucun déploiement ni appel Auth, aucun e-mail envoyé.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const racine=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const testUrl='https://rlojnuaajeubzlwofwhn.supabase.co';
if(process.env.VITE_SUPABASE_URL!==testUrl)throw new Error('URL seneve-test exacte obligatoire ; aucun repli vers PROD.');
if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(process.env.VITE_SUPABASE_KEY??''))throw new Error('Une clé publiable TEST est requise ; aucune clé privilégiée acceptée.');
const base='/seneve/recette-hd/';
const env={...process.env,SENEVE_BASE:base,VITE_HABITUDES_DEFIS:'true',NODE_ENV:'production'};
const resultat=spawnSync(process.execPath,[path.join(racine,'node_modules/vite/bin/vite.js'),'build','--config','scripts/recette/vite-habitudes.config.ts'],{cwd:racine,env,stdio:'inherit'});
if(resultat.status!==0)throw new Error('Construction TEST échouée.');
const sortie=path.join(racine,'dist-recette-hd');
const html=await fs.readFile(path.join(sortie,'recette-hd.html'),'utf8');
await fs.rename(path.join(sortie,'recette-hd.html'),path.join(sortie,'index.html'));
for(const route of ['404','connexion','habitudes/inscription','confidentialite','acces','rappels']){
 const cible=path.join(sortie,route+'.html');await fs.mkdir(path.dirname(cible),{recursive:true});await fs.writeFile(cible,html);
}
// Service worker de notifications seulement, sans cache : celui de public/ partagerait le cache du site réel.
await fs.copyFile(path.join(racine,'scripts/recette/sw-recette.js'),path.join(sortie,'sw.js'));
// Sur iPhone, l'icône de l'écran d'accueil doit ouvrir cette version de test, pas le site réel.
const manifeste=JSON.parse(await fs.readFile(path.join(sortie,'manifest.webmanifest'),'utf8'));
await fs.writeFile(path.join(sortie,'manifest.webmanifest'),JSON.stringify({...manifeste,name:'SÉNEVÉ — Version de test',short_name:'SÉNEVÉ test',start_url:'./rappels',scope:'./'},null,2));
let testTrouve=false;
for(const fichier of await fs.readdir(path.join(sortie,'assets'))){
 if(!fichier.endsWith('.js'))continue;
 const js=await fs.readFile(path.join(sortie,'assets',fichier),'utf8');
 if(js.includes('lclquncbhrmpwxgsthhk'))throw new Error('Une référence au projet PROD a été trouvée dans le JavaScript TEST.');
 if(js.includes('rlojnuaajeubzlwofwhn'))testTrouve=true;
}
if(!testTrouve)throw new Error('Le projet TEST est absent de la sortie.');
await fs.writeFile(path.join(sortie,'recette-hd.json'),JSON.stringify({environnement:'seneve-test',project_id:'rlojnuaajeubzlwofwhn',base,perimetre:['connexion','preinscription','lecture_acces','rappels_habitudes'],publie:false,email_envoye:false},null,2));
console.log('Version TEST construite dans dist-recette-hd. Aucune publication ni aucun e-mail.');
