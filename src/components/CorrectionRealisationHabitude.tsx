import {useState} from 'react';
import type {EtatOccurrence,OccurrenceHabitude} from '@/lib/habitudes';
import type {TransportProgression} from '@/lib/habitudes-api';

type Attente={eventId:string;confirmation:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[0-9a-f]{32}$/;
export function CorrectionRealisationHabitude({userId,occurrence,langue,transport,onConfirme}:{
 userId:string;occurrence:OccurrenceHabitude;langue:string;transport:TransportProgression;onConfirme:(e:EtatOccurrence)=>void;
}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const cle='seneve:habitudes:correction:v1:'+userId+':'+occurrence.enrollment_id+':'+occurrence.occurrence_id;
 const [attente,setAttente]=useState<Attente|null>(()=>{try{const s=JSON.parse(sessionStorage.getItem(cle)??'null');return s&&UUID.test(s.eventId)&&TOKEN.test(s.confirmation)?s:null;}catch{return null;}});
 const [confirmation,setConfirmation]=useState<string|null>(attente?.confirmation??null);
 const [occupe,setOccupe]=useState(false),[erreur,setErreur]=useState<string|null>(null);
 const [conflit,setConflit]=useState(false);
 async function preparer(){
  if(occupe)return;setOccupe(true);setErreur(null);setConflit(false);
  try{
   const r=await transport.rpc('hd_corriger_realisation',{p_enrollment_id:occurrence.enrollment_id,p_activity_id:occurrence.occurrence_id});
   if(r.error)throw r.error;
   const jeton=(r.data as {confirmation?:unknown}|null)?.confirmation;
   if(typeof jeton!=='string'||!TOKEN.test(jeton))throw Error();
   setConfirmation(jeton);
  }catch{setErreur(l('Impossible de préparer la correction. Actualise les activités et réessaie.','Unable to prepare this correction. Refresh activities and try again.'));}
  finally{setOccupe(false);}
 }
 async function confirmer(){
  if(occupe||!confirmation)return;setOccupe(true);setErreur(null);
  try{
   const s=attente??{eventId:crypto.randomUUID(),confirmation};
   sessionStorage.setItem(cle,JSON.stringify(s));setAttente(s);
   const r=await transport.rpc('hd_corriger_realisation',{p_enrollment_id:occurrence.enrollment_id,p_activity_id:occurrence.occurrence_id,p_client_event_id:s.eventId,p_confirmation:s.confirmation});
   if(r.error){
    if((r.error as {code?:string}).code==='40001'){sessionStorage.removeItem(cle);setAttente(null);setConfirmation(null);setConflit(true);}
    throw r.error;
   }
   const x=r.data as {etat?:unknown;aide_demandee?:unknown;event_id?:unknown;repetition?:unknown}|null;
   if(!x||!['non_commencee','preparee','partielle','realisee'].includes(String(x.etat))||typeof x.aide_demandee!=='boolean'||x.event_id!==s.eventId||typeof x.repetition!=='boolean'||(!x.repetition&&x.etat!=='non_commencee'))throw Error();
   // La confirmation serveur reste vraie même si le nettoyage local échoue.
   try{sessionStorage.removeItem(cle);}catch{/* le rejeu reste sans effet */}
   setAttente(null);setConfirmation(null);
   onConfirme({...occurrence,etat:x.etat as EtatOccurrence['etat'],aide_demandee:x.aide_demandee,synchronisation:'synchronise'});
  }catch{setErreur(l('Correction non confirmée. Réessaie la même demande ; si l’activité a changé, actualise les activités.','Correction not confirmed. Retry this request; if the activity changed, refresh activities.'));}
  finally{setOccupe(false);}
 }
 const style='min-h-[44px] px-3 rounded-xl font-hd-label-md text-hd-label-md bg-hd-surface-container text-hd-on-surface disabled:opacity-60';
 return <div aria-busy={occupe} className="flex flex-col gap-2 mt-1">
  {!confirmation?<button type="button" disabled={occupe||conflit} className={style} onClick={()=>void preparer()}>{l('Corriger ce « Fait »','Correct this completion')}</button>:<div role="group" aria-label={l('Corriger une réalisation','Correct a completion')} className="p-3 rounded-xl bg-hd-surface-container-low flex flex-col gap-2">
   <p className="font-hd-body-sm text-hd-body-sm">{l('Tu as appuyé sur « Fait » par erreur ? Confirme pour remettre cette activité à « À faire ». Sa durée de lecture éventuelle sera retirée des bilans.','Marked this done by mistake? Confirm to mark this activity as not done. Any recorded reading time will be removed from summaries.')}</p>
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={occupe} className={style} onClick={()=>void confirmer()}>{attente?l('Réessayer la correction','Retry correction'):l('Confirmer la correction','Confirm correction')}</button>
    {!attente&&<button type="button" disabled={occupe} className={style} onClick={()=>{setConfirmation(null);setErreur(null);}}>{l('Garder « Fait »','Keep completed')}</button>}
   </div>
  </div>}
  {erreur&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{erreur}</p>}
 </div>;
}
