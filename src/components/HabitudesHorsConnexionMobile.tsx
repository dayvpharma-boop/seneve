import {useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {arreterRappelsLocaux,etatRappelsLocaux,rappelsLocauxDisponibles} from '@/lib/rappels-locaux';
import {constructionMobile,VERSION_MOBILE} from '@/lib/mobile';

/** Une entrée locale, sans copie des contenus HD et sans accorder de droit hors ligne. */
export function HabitudesHorsConnexionMobile(){
 const [horsLigne,setHorsLigne]=useState(()=>navigator.onLine===false);
 const [etat,setEtat]=useState<Awaited<ReturnType<typeof etatRappelsLocaux>>|null>(null);
 const [erreur,setErreur]=useState(false),[busy,setBusy]=useState(false),[tour,setTour]=useState(0);
 const location=useLocation();
 const natif=constructionMobile(),en=new URLSearchParams(location.search).get('lang')==='en'||document.documentElement.lang==='en';
 const l=(fr:string,english:string)=>en?english:fr;
 useEffect(()=>{
  const off=()=>setHorsLigne(true),on=()=>setHorsLigne(false);
  window.addEventListener('offline',off);window.addEventListener('online',on);
  return()=>{window.removeEventListener('offline',off);window.removeEventListener('online',on);};
 },[]);
 useEffect(()=>{
  let vivant=true;setEtat(null);setErreur(false);
  if(natif)void (async()=>{if(!rappelsLocauxDisponibles())throw Error('Notifications locales indisponibles');return etatRappelsLocaux();})().then(e=>{if(vivant)setEtat(e);}).catch(()=>{if(vivant)setErreur(true);});
  return()=>{vivant=false;};
 },[natif,horsLigne,tour]);
 if(!natif)return null;
 async function arreter(){
  if(busy)return;setBusy(true);setErreur(false);
  try{await arreterRappelsLocaux();setTour(t=>t+1);}catch{setErreur(true);}finally{setBusy(false);}
 }
 return <aside aria-label={l('Habitudes & Défis hors connexion','Habits & Challenges offline')} style={{maxWidth:640,margin:'12px auto',padding:'16px 20px',background:'#f4f1e5',color:'#243b2c',borderRadius:16,lineHeight:1.5}}>
  <strong>{l('Habitudes & Défis','Habits & Challenges')}</strong>
  <p>{l('Version mobile','Mobile version')} {VERSION_MOBILE}{horsLigne?l(' · Hors connexion',' · Offline'):''}</p>
  <p>{l('Les activités et ton accès nécessitent une connexion pour être chargés. Ce point d’entrée reste toujours visible ; tu peux y vérifier les rappels enregistrés sur ce téléphone.','Loading activities and checking access require a connection. This entry point always stays visible; you can check reminders stored on this phone here.')}</p>
  <Link to={'/habitudes/aujourdhui'+(en?'?lang=en':'')} style={{display:'inline-flex',alignItems:'center',minHeight:44,textDecoration:'underline'}}>{l('Ouvrir Habitudes & Défis','Open Habits & Challenges')}</Link>
  {!etat&&!erreur&&<p role="status">{l('Vérification des rappels du téléphone…','Checking phone reminders…')}</p>}
  {etat&&<p role="status">{etat.nombre} {l('rappels locaux en attente sur ce téléphone.','local reminders pending on this phone.')} {!etat.autorise?l('Les notifications ne sont pas autorisées dans les réglages du téléphone.','Notifications are not allowed in phone settings.'):!etat.exact?l('Les alarmes exactes ne sont pas autorisées. Vérifie les réglages du téléphone.','Exact alarms are not allowed. Check phone settings.'):etat.nombre>0?l('Leur programmation ne dépend pas d’une connexion Internet. Leur réception reste soumise aux réglages du téléphone.','Their schedule does not depend on an Internet connection. Delivery still depends on phone settings.'):l('Aucun rappel en attente n’est confirmé. Reconnecte-toi à Internet pour en programmer.','No pending reminder is confirmed. Reconnect to the Internet to schedule reminders.')}</p>}
  {erreur&&<p role="alert">{l('L’état ou l’arrêt des rappels n’a pas pu être confirmé. Vérifie les réglages du téléphone puis réessaie.','Reminder status or cancellation could not be confirmed. Check phone settings and retry.')}</p>}
  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <button type="button" disabled={busy} style={{minHeight:44}} onClick={()=>setTour(t=>t+1)}>{l('Vérifier les rappels','Check reminders')}</button>
   <button type="button" disabled={busy} style={{minHeight:44}} onClick={()=>void arreter()}>{l('Arrêter les rappels de ce téléphone','Stop reminders on this phone')}</button>
  </div>
 </aside>;
}

