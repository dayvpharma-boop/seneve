import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ActivitesJourRecette} from './ActivitesJourRecette';
import {PlanningJourHabitudes} from './PlanningJourHabitudes';
import {calendrierHabitudes} from '@/lib/habitudes-calendrier';
import {supabase} from '@/lib/supabase';
import {chargerCatalogueAcces,etatDroit,type CatalogueAcces} from '@/lib/offres-acces';
import {CadreHabitudes} from './CadreHabitudes';
import {IconeHD} from './IconeHabitudes';

/** Lecture des droits existants seulement : aucune création ou reprise de période.
 * `reel` : écran du site réel, pour le programme publié HABITUDES_DEFIS_30J_FR_V1 (sinon : essai technique de la recette). */
export const PROGRAMME_HD_REEL='HABITUDES_DEFIS_30J_FR_V1';
export function AccesRecetteHabitudes({reel=false}:{reel?:boolean}={}){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr';
 const l=(fr:string,english:string)=>en?english:fr;
 const m=(testFr:string,testEn:string,reelFr:string,reelEn:string)=>reel?l(reelFr,reelEn):l(testFr,testEn);
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
 useEffect(()=>{document.title=m('Mes accès de test','My test access','Habitudes & Défis','Habits & Challenges')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 const inscriptions=data?.inscriptions.filter(e=>e.programme_id===(reel?PROGRAMME_HD_REEL:'HD_RECETTE_INSCRIPTION_FR_20261026'))??[];
 const carte='bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-sm';
 const bouton='min-h-[48px] w-full bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2';
 return <CadreHabitudes titre={l('Aujourd’hui','Today')} langue={langue} actif="aujourdhui" liens={{aujourdhui:reel?`/habitudes/aujourdhui?lang=${langue}`:`/acces?lang=${langue}`}}>
 <h1 className="sr-only">{m('Mes accès de test','My test access','Habitudes & Défis','Habits & Challenges')}</h1>
 {erreur?<section className="px-hd-margin py-hd-space-md"><div className={carte}><p role="alert" className="font-hd-body-md text-hd-body-md">{l('Tes accès ne peuvent pas être vérifiés pour le moment.','Your access cannot be verified right now.')}</p><button className={bouton} onClick={()=>setTour(t=>t+1)}><IconeHD nom="refresh" className="text-[20px]"/>{l('Réessayer','Try again')}</button></div></section>
 :!data?<p role="status" className="px-hd-margin py-hd-space-md font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Vérification de ton accès…','Checking your access…')}</p>
 :!data.connecte?<section className="px-hd-margin py-hd-space-md"><div className={carte}><p className="font-hd-body-md text-hd-body-md">{m('Connecte-toi pour consulter ton accès de test.','Sign in to view your test access.','Connecte-toi pour retrouver ton parcours.','Sign in to view your journey.')}</p><Link className={bouton} to={`/connexion?mode=signin&suite=habitudes&lang=${langue}`}>{l('Se connecter','Sign in')}</Link></div></section>:<>
 {inscriptions.length===0&&<p className="px-hd-margin py-hd-space-md font-hd-body-md text-hd-body-md">{m('Aucune inscription à cet essai n’est enregistrée pour ton compte.','No enrollment in this test is recorded for your account.','Aucune inscription à Habitudes & Défis n’est enregistrée pour ton compte.','No Habits & Challenges enrollment is recorded for your account.')}</p>}
 {inscriptions.map(e=>{
  const p=data.periodesGratuitesHabitudes?.find(p=>p.enrollment_id===e.enrollment_id&&p.entitlement_id===e.entitlement_id);
  const d=data.droits.find(d=>d.entitlement_id===e.entitlement_id);
  let fin:string|null=null;
  const coherent=p&&d&&Date.parse(p.fin_exclue)-Date.parse(p.debut)===720*3600000&&p.debut===d.debut&&p.fin_exclue===d.fin;
  try{if(coherent&&data.fuseauHabitudes)fin=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:data.fuseauHabitudes,dateStyle:'long',timeStyle:'short'}).format(new Date(p.fin_exclue));}catch{/* Ne pas annoncer de date trompeuse. */}
  let dateLocale:string|null=null;
  try{if(data.fuseauHabitudes)dateLocale=calendrierHabitudes('2000-01-01',1,data.fuseauHabitudes,new Date(maintenant)).date_locale;}catch{/* Planning fermé si le fuseau est invalide. */}
  const etat=coherent&&fin&&d?etatDroit(d,maintenant):'attente';
  const actif=etat==='actif'&&e.etat==='active';
  return <div key={e.enrollment_id} className="flex flex-col">
   {actif&&data.participantIdHabitudes&&dateLocale&&<div><h2 className="sr-only">{l('Ma journée','My day')}</h2><ActivitesJourRecette key={`${e.enrollment_id}:${data.participantIdHabitudes}:${dateLocale}`} enrollmentId={e.enrollment_id} participantId={data.participantIdHabitudes} dateLocale={dateLocale} langue={langue} fuseau={data.fuseauHabitudes}/></div>}
   <section className="px-hd-margin pb-hd-space-lg flex flex-col gap-hd-space-sm" aria-label={l('Mon accès','My access')}>
    <div className="relative bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm overflow-hidden flex flex-col gap-1">
     <div className="flex items-center justify-between gap-2 mb-1"><span className="font-hd-label-sm text-hd-label-sm text-hd-secondary tracking-wide uppercase">{m('Habitudes & Défis — essai technique','Habits & Challenges — technical test','Habitudes & Défis','Habits & Challenges')}</span>{actif&&<span className="font-hd-label-sm text-hd-label-sm text-hd-secondary bg-hd-secondary-container/40 px-2 py-0.5 rounded-full">{l('Actif','Active')}</span>}</div>
     <p className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{actif?m('Tes 30 jours de test sont en cours.','Your 30 test days are in progress.','Tes 30 jours gratuits sont en cours.','Your 30 free days are in progress.'):etat==='expire'?m('Tes 30 jours de test sont terminés.','Your 30 test days have ended.','Tes 30 jours gratuits sont terminés.','Your 30 free days have ended.'):etat==='ferme'?m('Cet accès de test est fermé.','This test access is closed.','Cet accès gratuit est fermé.','This free access is closed.'):e.etat==='en_pause'?m('Ton inscription de test est en pause.','Your test enrollment is paused.','Ton parcours est en pause.','Your journey is paused.'):l('Ton accès doit être vérifié.','Your access needs verification.')}</p>
     {fin&&p&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-start gap-1"><IconeHD nom="schedule" className="text-[16px] text-hd-secondary mt-0.5"/><span>{l('Fin de la période :','Period ends:')} <time dateTime={p.fin_exclue}>{fin}</time> ({data.fuseauHabitudes}).</span></p>}
     <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{m('Cet essai ne comprend pas de coach IA et ne déclenche aucun paiement automatique.','This test does not include an AI coach and does not trigger an automatic payment.','Les 30 jours gratuits ne comprennent pas de coach IA. Aucun paiement automatique.','The 30 free days do not include the AI coach. No automatic payment.')}</p>
     <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Tu peux déclarer tes habitudes quotidiennes et les cultes prévus dans ton planning personnel.','You can record your daily habits and the worship appointments in your personal schedule.')}</p>
    </div>
    {actif&&data.participantIdHabitudes&&dateLocale&&<details className="bg-hd-surface-container-lowest rounded-xl shadow-sm"><summary className="min-h-[48px] px-hd-space-md flex items-center gap-2 font-hd-label-lg text-hd-label-lg text-hd-on-surface cursor-pointer"><IconeHD nom="calendar_month" className="text-[18px] text-hd-secondary"/>{l('Mes repères horaires','My schedule')}</summary><div className="hd-classique px-4 pb-4"><PlanningJourHabitudes key={`${e.enrollment_id}:${data.participantIdHabitudes}`} enrollmentId={e.enrollment_id} participantId={data.participantIdHabitudes} dateLocale={dateLocale} langue={langue}/></div></details>}
   </section>
  </div>;
 })}</>}
 <div className="px-hd-margin pb-hd-space-lg"><Link className="font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4" to={reel?`/espace${en?'?lang=en':''}`:`/habitudes/inscription?lang=${langue}`}>{m('Revenir à l’inscription de test','Back to test enrollment','Revenir à mon espace','Back to my space')}</Link></div>
 </CadreHabitudes>;
}
