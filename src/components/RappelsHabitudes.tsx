import './RappelsHabitudes.css';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {lireRappelsHabitudes,reglerRappelsHabitudes,type EtatRappelsHabitudes} from '@/lib/habitudes-rappels';

/** Réglage « Mes rappels d'habitudes » : un interrupteur, puis toutes les habitudes cochées par défaut.
 * Chaque changement est enregistré aussitôt par le serveur ; un appui pendant un enregistrement est ignoré. */
export function RappelsHabitudes({langue}:{langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [etat,setEtat]=useState<EtatRappelsHabitudes|null>(null),[erreur,setErreur]=useState(false),[occupe,setOccupe]=useState(false),[annonce,setAnnonce]=useState('');
 const verrou=useRef(false);
 useEffect(()=>{let actif=true;void lireRappelsHabitudes().then(e=>{if(actif)setEtat(e);}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[]);
 async function regler(actif:boolean,coupees:string[],message:string){
  if(verrou.current)return;verrou.current=true;setOccupe(true);setErreur(false);setAnnonce('');
  try{setEtat(await reglerRappelsHabitudes(actif,coupees));setAnnonce(message);}catch{setErreur(true);}finally{verrou.current=false;setOccupe(false);}
 }
 if(etat&&!etat.inscrit)return null;
 const titre=<h2>{l('Mes rappels d’habitudes','My habit reminders')}</h2>;
 const alerte=erreur&&<p role="alert">{l('Le réglage n’a pas pu être enregistré. Réessaie dans un instant.','The setting could not be saved. Please try again in a moment.')}</p>;
 if(!etat)return <section className="rn-section hd-rappels">{titre}{alerte||<p>{l('Chargement…','Loading…')}</p>}</section>;
 const coupees=etat.habitudes.filter(h=>!h.recu).map(h=>h.habit_key);
 return <section className="rn-section hd-rappels">{titre}
  {import.meta.env.VITE_HABITUDES_RELANCES==='true'?<p>{l('Chaque rappel indique son activité. Relance toutes les 30 minutes dans la journée, jusqu’à réalisation ou « Ignorer les rappels pour aujourd’hui », selon tes heures de silence.','Each reminder names its activity. Reminders repeat every 30 minutes during the day until completed or skipped for today, respecting your quiet hours.')}</p>:<p>{l('Une notification à l’heure de chaque habitude, selon tes horaires. Le texte reste neutre sur l’écran verrouillé, et aucun rappel ne part pour une activité déjà faite.','One notification at the time of each habit, following your schedule. The text stays neutral on the lock screen, and no reminder is sent for an activity already done.')}</p>}
  {!etat.push_pret?<p role="status">{l('Pour recevoir ces rappels, active d’abord les notifications sur ce téléphone.','To get these reminders, first turn on notifications on this phone.')} <Link to={`/profil${en?'?lang=en':''}#notifications`}>{l('Activer les notifications','Turn on notifications')}</Link></p>
  :<>
   <label className="hd-rappels-interrupteur"><input type="checkbox" role="switch" checked={etat.actif} disabled={occupe}
    onChange={e=>void regler(e.target.checked,coupees,e.target.checked?l('Rappels d’habitudes activés.','Habit reminders turned on.'):l('Rappels d’habitudes arrêtés.','Habit reminders turned off.'))}/>
    {l('Recevoir les rappels de mes habitudes','Get reminders for my habits')}</label>
   {etat.actif&&<fieldset disabled={occupe}><legend>{l('Habitudes rappelées','Habits reminded')}</legend>
    <p>{l('Toutes sont cochées au départ. Décoche celles pour lesquelles tu ne veux pas de rappel.','All are ticked to start with. Untick those you do not want a reminder for.')}</p>
    <ul className="hd-rappels-liste">{etat.habitudes.map(h=><li key={h.habit_key}><label><input type="checkbox" checked={h.recu}
     onChange={e=>void regler(true,e.target.checked?coupees.filter(k=>k!==h.habit_key):[...coupees,h.habit_key],e.target.checked?l(`Rappel rétabli : ${h.libelle}.`,`Reminder restored: ${h.libelle}.`):l(`Plus de rappel : ${h.libelle}.`,`No more reminder: ${h.libelle}.`))}/>{h.libelle}</label></li>)}</ul>
   </fieldset>}
  </>}
  {alerte}
  <p role="status" aria-live="polite" className="hd-rappels-annonce">{annonce}</p>
 </section>;
}
