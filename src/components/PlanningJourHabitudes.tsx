import {useEffect,useState} from 'react';
import {chargerHorairesHabitudes,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {planningHabitudesPourDate} from '@/lib/habitudes-planning';
import './PlanningJourHabitudes.css';

/** Repères horaires uniquement : aucune correspondance activité/habitude n’est inventée. */
export function PlanningJourHabitudes({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [lecture,setLecture]=useState<{enrollmentId:string;data:ConfigurationHoraires|null;erreur:boolean}|null>(null),[actualisation,setActualisation]=useState(0);
 useEffect(()=>{let actif=true;setLecture(null);void chargerHorairesHabitudes(enrollmentId).then(data=>{if(actif)setLecture({enrollmentId,data,erreur:false});}).catch(()=>{if(actif)setLecture({enrollmentId,data:null,erreur:true});});return()=>{actif=false;};},[enrollmentId,actualisation]);
 const courante=lecture?.enrollmentId===enrollmentId?lecture:null;
 const data=courante?.data??null;
 let planning:ReturnType<typeof planningHabitudesPourDate>|null=null,invalide=false;
 if(data){try{
  const modele=data.modeles[0];
  if(modele)planning=planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:dateLocale,fuseau:data.fuseau},data.modeles,data.horaires);
 }catch{invalide=true;}}
 const indisponible=!!courante&&(courante.erreur||invalide);
 return <section className="hd-planning-jour" aria-label={l('Mes repères horaires','My schedule')}><h3>{l('Mes repères horaires','My schedule')}</h3>
  {indisponible?<p role="status">{l('Le planning ne peut pas être vérifié pour cette journée. Aucun horaire n’est supposé.','The schedule cannot be verified for this day. No times are assumed.')}</p>:!courante?<p role="status">{l('Chargement du planning…','Loading schedule…')}</p>:<>
   <p className="hd-planning-contexte"><time dateTime={dateLocale}>{dateLocale}</time> · {data?.fuseau}</p>
   {planning?.rendezVous.length?<ol>{planning.rendezVous.map(r=><li key={`${r.habit_key}:${r.creneau_id}`}><time dateTime={r.heure_locale}>{r.heure_locale}</time><div><span>{r.libelle}</span><small>{r.origine==='personnel'?l('Horaire personnel','Personal time'):l('Horaire proposé','Suggested time')}</small></div></li>)}</ol>:<p>{l('Aucun repère horaire pour cette journée.','No scheduled time for this day.')}</p>}
   {!!planning?.simultanes.length&&<p className="hd-planning-chevauchement">{l('Plusieurs rendez-vous ont la même heure :','Several appointments share a time:')} {planning.simultanes.map(g=>g[0]!.heure_locale).join(', ')}. {l('Tu peux ajuster tes horaires dans les réglages.','You can adjust your times in settings.')}</p>}
   <p className="hd-planning-note">{l('Les heures t’aident à t’organiser. Elles ne valident aucune activité et ne déclenchent aucun rappel.','These times help you organise your day. They do not complete activities or trigger reminders.')}</p>
  </>}
  <button type="button" className="link" disabled={!courante} onClick={()=>setActualisation(n=>n+1)}>{l('Actualiser mon planning','Refresh my schedule')}</button>
 </section>;
}
