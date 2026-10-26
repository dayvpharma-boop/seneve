import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ActivitesJourRecette} from './ActivitesJourRecette';
import {PlanningJourHabitudes} from './PlanningJourHabitudes';
import {calendrierHabitudes} from '@/lib/habitudes-calendrier';
import {supabase} from '@/lib/supabase';
import {chargerCatalogueAcces,etatDroit,type CatalogueAcces} from '@/lib/offres-acces';

/** Lecture des droits existants seulement : aucune création ou reprise de période. */
export function AccesRecetteHabitudes(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr';
 const l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<CatalogueAcces|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const [maintenant,setMaintenant]=useState(Date.now);
 const sequence=useRef(0);
 useEffect(()=>{const actualiser=()=>setMaintenant(Date.now());const t=window.setInterval(actualiser,60000);window.addEventListener('focus',actualiser);return()=>{window.clearInterval(t);window.removeEventListener('focus',actualiser);};},[]);
 useEffect(()=>{
  const auth=supabase.auth.onAuthStateChange(()=>{sequence.current++;setData(null);setErreur(false);setTour(t=>t+1);});
  return()=>{sequence.current++;auth.data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{const n=++sequence.current;setData(null);setErreur(false);
  void chargerCatalogueAcces(langue).then(d=>{if(n===sequence.current)setData(d);}).catch(()=>{if(n===sequence.current)setErreur(true);});
  return()=>{sequence.current++;};
 },[langue,tour]);
 useEffect(()=>{document.title=l('Mes accès de test','My test access')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 const inscriptions=data?.inscriptions.filter(e=>e.programme_id==='HD_RECETTE_INSCRIPTION_FR_20261026')??[];
 return <main className="rn-page"><div className="rn-contenu"><h1>{l('Mes accès de test','My test access')}</h1>
 {erreur?<section className="rn-section"><p role="alert">{l('Tes accès ne peuvent pas être vérifiés pour le moment.','Your access cannot be verified right now.')}</p><button className="oa-primary" onClick={()=>setTour(t=>t+1)}>{l('Réessayer','Try again')}</button></section>:!data?<p role="status">{l('Vérification de ton accès…','Checking your access…')}</p>:!data.connecte?<section className="rn-section"><p>{l('Connecte-toi pour consulter ton accès de test.','Sign in to view your test access.')}</p><Link className="oa-primary" to={`/connexion?mode=signin&suite=habitudes&lang=${langue}`}>{l('Se connecter','Sign in')}</Link></section>:<>
 {inscriptions.length===0&&<p>{l('Aucune inscription à cet essai n’est enregistrée pour ton compte.','No enrollment in this test is recorded for your account.')}</p>}
 {inscriptions.map(e=>{
  const p=data.periodesGratuitesHabitudes?.find(p=>p.enrollment_id===e.enrollment_id&&p.entitlement_id===e.entitlement_id);
  const d=data.droits.find(d=>d.entitlement_id===e.entitlement_id);
  let fin:string|null=null;
  const coherent=p&&d&&Date.parse(p.fin_exclue)-Date.parse(p.debut)===720*3600000&&p.debut===d.debut&&p.fin_exclue===d.fin;
  try{if(coherent&&data.fuseauHabitudes)fin=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:data.fuseauHabitudes,dateStyle:'long',timeStyle:'short'}).format(new Date(p.fin_exclue));}catch{/* Ne pas annoncer de date trompeuse. */}
  let dateLocale:string|null=null;
  try{if(data.fuseauHabitudes)dateLocale=calendrierHabitudes('2000-01-01',1,data.fuseauHabitudes,new Date(maintenant)).date_locale;}catch{/* Planning fermé si le fuseau est invalide. */}
  const etat=coherent&&fin&&d?etatDroit(d,maintenant):'attente';
  return <section className="rn-section" key={e.enrollment_id}><h2>{l('Habitudes & Défis — essai technique','Habits & Challenges — technical test')}</h2><p>{etat==='actif'&&e.etat==='active'?l('Tes 30 jours de test sont en cours.','Your 30 test days are in progress.'):etat==='expire'?l('Tes 30 jours de test sont terminés.','Your 30 test days have ended.'):etat==='ferme'?l('Cet accès de test est fermé.','This test access is closed.'):e.etat==='en_pause'?l('Ton inscription de test est en pause.','Your test enrollment is paused.'):l('Ton accès doit être vérifié.','Your access needs verification.')}</p>
   {fin&&p&&<p>{l('Fin de la période :','Period ends:')} <time dateTime={p.fin_exclue}>{fin}</time> ({data.fuseauHabitudes}).</p>}
   <p>{l('Cet essai ne comprend pas de coach IA et ne déclenche aucun paiement automatique.','This test does not include an AI coach and does not trigger an automatic payment.')}</p>
   <p>{l('Tu peux déclarer tes habitudes quotidiennes et les cultes prévus dans ton planning personnel.','You can record your daily habits and the worship appointments in your personal schedule.')}</p>
   {etat==='actif'&&e.etat==='active'&&data.participantIdHabitudes&&dateLocale&&<div><h2>{l('Ma journée','My day')}</h2><PlanningJourHabitudes key={`${e.enrollment_id}:${data.participantIdHabitudes}`} enrollmentId={e.enrollment_id} participantId={data.participantIdHabitudes} dateLocale={dateLocale} langue={langue}/><ActivitesJourRecette key={`${e.enrollment_id}:${data.participantIdHabitudes}:${dateLocale}`} enrollmentId={e.enrollment_id} participantId={data.participantIdHabitudes} dateLocale={dateLocale} langue={langue}/></div>}
  </section>;
 })}</>}
 <Link to={`/habitudes/inscription?lang=${langue}`}>{l('Revenir à l’inscription de test','Back to test enrollment')}</Link>
 </div></main>;
}
