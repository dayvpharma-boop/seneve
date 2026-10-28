import {useEffect,useRef,useState} from 'react';
import {rappelsLocauxDisponibles} from '@/lib/rappels-locaux';
import {chargerHorairesHabitudes,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {HABITUDES_EXPORTABLES,rendezVousCalendrier,creerCalendrierHabitudes,telechargerCalendrierHabitudes} from '@/lib/habitudes-calendrier-export';
export function ExportCalendrierHabitudes(props:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const [ouvert,setOuvert]=useState(false),en=props.langue==='en';
 if(rappelsLocauxDisponibles())return null; // Le fichier calendrier reste proposé sur le site.
 return <details className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md mb-hd-space-lg" onToggle={e=>setOuvert(e.currentTarget.open)}><summary className="min-h-[48px] cursor-pointer font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center">{en?'Add reminders to my calendar':'Ajouter mes rappels au calendrier'}</summary>{ouvert&&<FormulaireExport key={[props.enrollmentId,props.participantId,props.dateLocale].join(':')} {...props}/>}</details>;
}
function FormulaireExport({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<ConfigurationHoraires|null>(null),[echec,setEchec]=useState(false),[tour,setTour]=useState(0);
 const [cles,setCles]=useState<string[]>(['priere_matin','priere_midi','priere_soir']),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[erreur,setErreur]=useState('');
 const verrou=useRef(false),vivant=useRef(true);
 useEffect(()=>{vivant.current=true;return()=>{vivant.current=false;};},[]);
 useEffect(()=>{let actif=true;setData(null);setEchec(false);setMessage('');setErreur('');
  void chargerHorairesHabitudes(enrollmentId).then(d=>{if(d.date_locale!==dateLocale)throw Error('Date à actualiser');if(actif)setData(d);}).catch(()=>{if(actif)setEchec(true);});
  return()=>{actif=false;};
 },[enrollmentId,dateLocale,tour]);
 const modeles=data?.modeles.filter(m=>HABITUDES_EXPORTABLES.some(k=>k===m.habit_key))??[];
 const selection=cles.filter(k=>modeles.some(m=>m.habit_key===k));
 let rdv:ReturnType<typeof rendezVousCalendrier>=[],erreurPlanning='';
 try{if(data&&selection.length)rdv=rendezVousCalendrier(data,participantId,dateLocale,selection);}catch{erreurPlanning=l('Les horaires ne peuvent pas être exportés. Actualise les horaires ; en cas de changement d’heure, vérifie les créneaux concernés.','The schedule cannot be exported. Refresh the schedule; around daylight saving changes, check the affected times.');}
 async function exporter(){
  if(verrou.current||!data||!rdv.length||erreurPlanning)return;verrou.current=true;setBusy(true);setMessage('');setErreur('');
  try{const fichier=await creerCalendrierHabitudes(rdv,enrollmentId,langue);if(!vivant.current)return;telechargerCalendrierHabitudes(fichier);setMessage(l('Fichier généré. Termine l’ajout dans ton calendrier et vérifie ses alertes. SÉNEVÉ ne peut pas confirmer l’importation.','File generated. Finish adding it in your calendar and check its alerts. SÉNEVÉ cannot confirm the import.'));}
  catch{if(vivant.current)setErreur(l('Le fichier n’a pas pu être généré. Réessaie.','The file could not be generated. Try again.'));}
  finally{verrou.current=false;if(vivant.current)setBusy(false);}
 }
 return <div className="flex flex-col gap-3 pt-2 font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">
  <p>{l('Crée une copie des rendez-vous des 7 prochains jours dans ton calendrier, avec une alerte à l’heure prévue. Après importation, les alertes dépendent du calendrier et des réglages du téléphone.','Copy appointments for the next 7 days to your calendar, with an alert at the scheduled time. After importing, alerts depend on your calendar and phone settings.')}</p>
  {echec?<p role="alert">{l('Tes horaires ne peuvent pas être chargés. Vérifie ta connexion puis réessaie.','Your schedule could not be loaded. Check your connection and try again.')}</p>:!data?<p role="status">{l('Chargement de tes horaires…','Loading your schedule…')}</p>:<>
   <p>{l('Fuseau des horaires :','Schedule time zone:')} <strong>{data.fuseau}</strong>. {l('Les rendez-vous sont exportés aux instants correspondants ; ton calendrier les affiche dans son propre fuseau.','Appointments keep the corresponding instants; your calendar displays them in its own time zone.')}</p>
   <fieldset disabled={busy} className="flex flex-col gap-1"><legend className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Rendez-vous à exporter','Appointments to export')}</legend>{modeles.map(m=><label key={m.habit_key} className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={selection.includes(m.habit_key)} onChange={e=>{setCles(k=>e.target.checked?[...k.filter(x=>x!==m.habit_key),m.habit_key]:k.filter(x=>x!==m.habit_key));setMessage('');}}/>{m.libelle}</label>)}</fieldset>
   {erreurPlanning?<p role="alert">{erreurPlanning}</p>:<p>{rdv.length} {l('rendez-vous à venir sélectionnés. Les horaires déjà passés sont exclus.','upcoming appointments selected. Past times are excluded.')}</p>}
   {!!rdv.length&&<details><summary className="min-h-[44px] cursor-pointer">{l('Voir les rendez-vous du fichier','View appointments in the file')}</summary><ul className="flex flex-col gap-1">{rdv.map(r=><li key={[r.date,r.cle,r.creneau].join(':')}>{r.date} · {r.heure} · SÉNEVÉ — {r.titre}</li>)}</ul></details>}
   <button type="button" className="min-h-[48px] rounded-xl px-3 bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg disabled:opacity-50" disabled={busy||!rdv.length||!!erreurPlanning} onClick={()=>void exporter()}>{busy?l('Préparation…','Preparing…'):l('Exporter les 7 prochains jours (.ics)','Export the next 7 days (.ics)')}</button>
  </>}
  {message&&<p role="status">{message}</p>}{erreur&&<p role="alert">{erreur}</p>}
  <button type="button" className="min-h-[44px] px-3 rounded-xl bg-hd-surface-container text-hd-on-surface" disabled={busy} onClick={()=>setTour(t=>t+1)}>{l('Actualiser les horaires pour l’export','Refresh schedule for export')}</button>
  <details><summary className="min-h-[44px] cursor-pointer">{l('Comment ajouter les rappels sur mon téléphone ?','How do I add reminders on my phone?')}</summary><div className="flex flex-col gap-2">
   <p>{l('iPhone : ouvre le fichier avec Calendrier si cette option est proposée. Si tu ne vois qu’un aperçu, tu peux ouvrir le fichier depuis Mail ou l’importer avec Calendrier sur Mac, puis synchroniser le calendrier sur ton iPhone.','iPhone: open the file with Calendar if offered. If you only see a preview, open the file from Mail or import it with Calendar on Mac, then sync the calendar to your iPhone.')}</p>
   <p>{l('Android : ouvre le fichier avec ton application de calendrier si elle propose l’importation. Pour Google Agenda, importe le fichier depuis un ordinateur (Paramètres → Importer et exporter), puis synchronise ce calendrier sur ton téléphone.','Android: open the file with your calendar app if it supports importing. For Google Calendar, import from a computer (Settings → Import & export), then sync that calendar to your phone.')}</p>
   <p>{l('Vérifie qu’une alerte est présente sur les rendez-vous et que les notifications du calendrier sont autorisées. Une fois les événements disponibles sur le téléphone, teste une alerte avec Internet coupé.','Check that appointments have an alert and calendar notifications are allowed. Once events are available on your phone, test an alert with Internet turned off.')}</p>
  </div></details>
  <p>{l('Copie ponctuelle, sans synchronisation automatique. Pour éviter les doublons, utilise un calendrier dédié et retire l’ancien export avant de réimporter une période identique. Les changements d’horaires et l’arrêt des rappels dans SÉNEVÉ ne modifient pas ces copies : gère-les dans le calendrier.','One-time copy, without automatic sync. To avoid duplicates, use a dedicated calendar and remove the old export before importing the same period again. Schedule changes or stopping reminders in SÉNEVÉ do not change these copies: manage them in your calendar.')}</p>
  <p>{l('Exporter ou recevoir une alerte ne déclare aucune activité réalisée.','Exporting or receiving an alert does not record any activity as completed.')}</p>
 </div>;
}
