// Galerie de recette visuelle du thème Stitch : composants réels, données fictives, aucun réseau.
// Usage : node scripts/recette/habitudes-visuel-stitch.mjs /dossier/temporaire [--sans-theme]
// --sans-theme produit la même galerie sans le thème, pour comparer avant/après.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const racine=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sortie=path.resolve(process.argv[2]);await fs.mkdir(sortie,{recursive:true});
const theme=!process.argv.includes('--sans-theme');
const entry=`
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import '@fontsource/poppins/latin-400.css';import '@fontsource/poppins/latin-500.css';import '@fontsource/literata/latin-400.css';
import './src/styles-recette-habitudes.css';
${theme?"import './src/styles-habitudes-stitch.css';":''}
import {InscriptionHabitudes} from './src/components/InscriptionHabitudes';
import {PlanningJourHabitudes} from './src/components/PlanningJourHabitudes';
import {DeclarationHabitude} from './src/components/DeclarationHabitude';
import {LectureTexteHabitude} from './src/components/LectureTexteHabitude';
import {BilanHabitudes} from './src/components/BilanHabitudes';
import {AccesGratuitHabitudes} from './src/components/AccesGratuitHabitudes';
import {SimulateurDime} from './src/components/SimulateurDime';
import {rythmeProposeHabitudes} from './src/lib/habitudes-rythme-propose';
const E='11111111-1111-4111-8111-111111111111',P='33333333-3333-4333-8333-333333333333',D='22222222-2222-4222-8222-222222222222';
const occ=(n)=>({occurrence_id:'4444444'+n+'-4444-4444-8444-444444444444',enrollment_id:E,version:1,date_locale:'2026-10-26',requise:true});
const etat=(n,e,aide=false)=>({...occ(n),etat:e,aide_demandee:aide,synchronisation:'synchronise'});
const transport={rpc:async()=>({data:null,error:{message:'recette'}})};
const configuration={compteId:'RECETTE_VISUELLE',programmeId:'RECETTE',version:1,langue:'fr',offreId:'RECETTE',fuseau:'Africa/Kinshasa',planning:rythmeProposeHabitudes.map(h=>({habit_key:h.habit_key,libelle:h.libelle,creneaux:[{creneau_id:'principal',heure_locale:h.heure_proposee.slice(0,5),jours_iso:[...h.jours_iso]}]}))};
const vide={total:0,realisees:0,partielles:0,preparees:0,non_commencees:0,aides:0,en_attente:0,requises:0,requises_realisees:0};
const jours=[{jour:12,date_locale:'2026-10-26',bilan:{...vide,total:4,realisees:2,partielles:1,non_commencees:1,requises:4,requises_realisees:2},activites:[
 {id:'a1',consigne:'Prière du matin',requise:true,etat:'realisee',aide:false,confirmee:true},
 {id:'a2',consigne:'Bible du matin',requise:true,etat:'realisee',aide:false,confirmee:true},
 {id:'a3',consigne:'Exercice adapté',requise:true,etat:'partielle',aide:false,confirmee:true},
 {id:'a4',consigne:'Écoute d’une prédication',requise:true,etat:'non_commencee',aide:true,confirmee:true}]}];
const debut=new Date(Date.now()-11*864e5);debut.setUTCMinutes(0,0,0);const fin=new Date(+debut+720*3600000);
const droit={entitlement_id:D,offre_id:'RECETTE',etat:'actif',debut:debut.toISOString(),fin:fin.toISOString()};
const periode={enrollment_id:E,entitlement_id:D,debut:debut.toISOString(),fin_exclue:fin.toISOString()};
const ecrans={
 horaires:()=><><h1>Habitudes & Défis</h1><InscriptionHabitudes configuration={configuration}/></>,
 aujourdhui:()=><><h1>Ma journée</h1><PlanningJourHabitudes enrollmentId={E} participantId={P} dateLocale="2026-10-26" langue="fr"/>
  <div className="hd-activites-recette">
   <DeclarationHabitude userId="u" occurrence={occ(1)} consigne="Prière du matin" etat={etat(1,'realisee')} langue="fr" lectureSeule={false} transport={transport} onConfirme={()=>{}}/>
   <DeclarationHabitude userId="u" occurrence={occ(2)} consigne="Exercice adapté" critere="10 à 15 minutes, selon tes capacités." etat={etat(2,'partielle')} langue="fr" lectureSeule={false} transport={transport} onConfirme={()=>{}}/>
   <DeclarationHabitude userId="u" occurrence={occ(3)} consigne="Lecture professionnelle" langue="fr" lectureSeule={false} transport={transport} onConfirme={()=>{}}/>
   <DeclarationHabitude userId="u" occurrence={occ(4)} consigne="Écoute d’une prédication" etat={etat(4,'non_commencee',true)} langue="fr" lectureSeule={false} transport={transport} onConfirme={()=>{}}/>
  </div></>,
 'lecture-bilan':()=><><LectureTexteHabitude titre="Lecture du jour 12" texte={"Texte d’exemple.\\nLe texte approuvé sera affiché ici en entier."} langue="fr"/><BilanHabitudes jours={jours} langue="fr" inscription={E}/></>,
 'acces-dime':()=><><AccesGratuitHabitudes droit={droit} periode={periode} langue="fr" fuseau="Africa/Kinshasa"/><SimulateurDime langue="fr"/></>,
};
const nom=decodeURIComponent(location.hash.slice(1));
const Ecran=ecrans[nom];
createRoot(document.getElementById('root')).render(<MemoryRouter>{Ecran?<div className="recette-hd"><main className="rn-page"><div className="rn-contenu"><Ecran/></div></main></div>:<ul>{Object.keys(ecrans).map(n=><li key={n}><a href={'#'+n} onClick={()=>setTimeout(()=>location.reload())}>{n}</a></li>)}</ul>}</MemoryRouter>);
setTimeout(()=>{document.querySelectorAll('.hd-simulateur,.hd-lecture').forEach(d=>d.open=true);document.body.dataset.pret='1';},300);
`;
const stubSupabase=`import {rythmeProposeHabitudes} from './habitudes-rythme-propose';export const supabase={rpc:async(nom)=>nom==='hd_schedule_settings'?{data:{enrollment_id:'11111111-1111-4111-8111-111111111111',fuseau:'Africa/Kinshasa',date_locale:'2026-10-26',modifications_a_partir_du:'2026-10-27',modeles:rythmeProposeHabitudes,horaires:[],revisions:[]},error:null}:{data:null,error:{message:'recette'}},auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:null},error:null})}};`;
const result=await build({stdin:{contents:entry,resolveDir:racine,loader:'tsx'},absWorkingDir:racine,bundle:true,write:false,outdir:'qa',format:'iife',jsx:'automatic',loader:{'.woff2':'dataurl','.woff':'dataurl'},alias:{'@':path.join(racine,'src')},define:{'import.meta.env.BASE_URL':'"./"','process.env.NODE_ENV':'"production"'},
 plugins:[{name:'recette-sans-reseau',setup(b){b.onLoad({filter:/\/lib\/supabase\.ts$/},()=>({contents:stubSupabase,loader:'js',resolveDir:path.join(racine,'src/lib')}));}}]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
const galerie='body{margin:0}';
await fs.writeFile(path.join(sortie,'ecrans.json'),JSON.stringify(['horaires','aujourdhui','lecture-bilan','acces-dime']));
await fs.writeFile(path.join(sortie,'galerie.html'),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette visuelle Stitch</title><style>${galerie}\n${css}</style><body><div id="root"></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>`);
console.log(`Galerie créée ${theme?'avec':'sans'} le thème ; aucun appel réseau applicatif.`);
