/** Données fictives uniquement pour la galerie locale. Jamais importé par le site publié. */
import {supabase as historique,siteUrl} from './supabase-fictif';
export {siteUrl};
const actif=location.hash.startsWith('#design-'),en=new URLSearchParams(location.search).get('lang')==='en',langue=en?'en':'fr';
const p=en?'PROSPECT_LIVRE_7J_EN_V1':'PROSPECT_LIVRE_7J_FR_V1';
const debut=new Date(Date.now()-864e5).toISOString().slice(0,10);
const tables:Record<string,unknown[]>={
 participants:[{participant_id:'GALERIE',prenom:'Justin',langue,fuseau:'Africa/Kinshasa',preferences:{}}],
 enrollments:[{enrollment_id:'GALERIE',programme_id:p,version:1,langue,date_debut:debut,etat:'active'}],
 programmes:[{programme_id:p,nom:en?'Discovery — 7 days':'Découverte du livre en français — 7 jours',duree_jours:7}],
 contents:Array.from({length:7},(_,i)=>({content_id:`C${i+1}`,programme_id:p,version:1,langue,jour:i+1,numero_message:1,theme:en?'Example teaching':'Enseignement d’exemple',texte_officiel:en?'Example text for visual checks.':'Texte d’exemple pour la vérification visuelle.',reference_livre:null,explication:null})),
 activities:[{activity_id:'A2',content_id:'C2',type_activite:'action',consigne:en?'Take a moment to reflect.':'Prends un moment pour réfléchir.',obligatoire:true}],
};
function builder(table:string){const b:any={};for(const m of ['select','eq','neq','in','order','range','limit'])b[m]=()=>b;b.maybeSingle=async()=>({data:tables[table]?.[0]??null,error:null});b.then=(ok:any,ko:any)=>Promise.resolve({data:tables[table]??[],error:null}).then(ok,ko);return b;}
export const supabase:any=actif?{from:builder,rpc:async(nom:string)=>({data:nom==='ensure_participant'?'GALERIE':null,error:null}),auth:{getSession:async()=>({data:{session:{user:{id:'GALERIE',user_metadata:{prenom:'Justin',langue}}}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}:historique;
