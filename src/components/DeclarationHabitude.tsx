import {useEffect,useRef,useState} from 'react';
import {enregistrerHabitude,type ActionHabitude,type TransportProgression} from '@/lib/habitudes-api';
import type {EtatOccurrence,OccurrenceHabitude} from '@/lib/habitudes';
import {cleSaisie,lireSaisie,preparerSaisie,type SaisieEnAttente} from '@/lib/habitudes-saisie';

export function DeclarationHabitude({userId,occurrence,consigne,critere,etat,langue,lectureSeule,transport,onConfirme,aideDisponible=true}:{
 aideDisponible?:boolean;userId:string;occurrence:OccurrenceHabitude;consigne:string;critere?:string|null;etat?:EtatOccurrence;langue:string;lectureSeule:boolean;transport:TransportProgression;onConfirme:(e:EtatOccurrence)=>void;
}){
 const en=langue==='en';const cle=cleSaisie(userId,occurrence.enrollment_id,occurrence.occurrence_id);
 const [attente,setAttente]=useState<SaisieEnAttente|null>(()=>{try{return lireSaisie(sessionStorage,cle);}catch{return null;}});
 const [erreur,setErreur]=useState(false),[occupe,setOccupe]=useState(false);
 const verrou=useRef(false);
 const [nettoyageIncomplet,setNettoyageIncomplet]=useState(false);
 const [confirmation,setConfirmation]=useState<EtatOccurrence|undefined>();
 useEffect(()=>{setConfirmation(etat);},[etat]);
 const courant=confirmation??etat;const valeur=courant?.synchronisation==='synchronise'?courant.etat:'non_commencee';
 const aide=courant?.synchronisation==='synchronise'&&courant.aide_demandee;
 async function declarer(action:ActionHabitude){
  if(lectureSeule||verrou.current)return;
  verrou.current=true;setOccupe(true);setErreur(false);
  try{
   const saisie=preparerSaisie(sessionStorage,cle,action);setAttente(saisie);
   const r=await enregistrerHabitude(transport,occurrence,saisie.eventId,saisie.action);
   setConfirmation(r.etat);onConfirme(r.etat);
   // Un échec de nettoyage conserve la même clé : un rejeu reste idempotent.
   try{sessionStorage.removeItem(cle);setAttente(null);setNettoyageIncomplet(false);}
   catch{setNettoyageIncomplet(true);}
  }catch{setErreur(true);}finally{verrou.current=false;setOccupe(false);}
 }
 const labels=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 return <section className="card hd-declaration" aria-label={consigne} aria-busy={occupe}>
  <h3>{consigne}</h3>{critere&&<p>{critere}</p>}
  <p role="status">{labels[valeur]}{courant?.synchronisation==='synchronise'&&<> · {en?'Synchronised':'Synchronisée'}</>}</p>
  {aide&&<p>{en?'Help requested':'Aide demandée'}</p>}
  {attente&&<p role="status">{nettoyageIncomplet?(en?'Record confirmed. Retry to finish updating this device.':'Enregistrement confirmé. Réessaie pour terminer la mise à jour sur cet appareil.'):(en?'Waiting for server confirmation. This declaration is not confirmed yet.':'En attente de confirmation du serveur. Cette déclaration n’est pas encore confirmée.')}</p>}
  {lectureSeule?<p>{en?'Read only':'Lecture seule'}</p>:attente?<button type="button" className="btn action-btn" disabled={occupe} onClick={()=>void declarer(attente.action)}>{occupe?(en?'Saving…':'Enregistrement…'):(en?'Retry this declaration':'Réessayer cette déclaration')}</button>:<div className="choix-row">
   {valeur!=='realisee'&&<button type="button" className="btn action-btn" disabled={occupe} onClick={()=>void declarer('realisee')}>{en?'I completed this activity':'J’ai réalisé cette activité'}</button>}
   {valeur==='non_commencee'&&<button type="button" className="btn-secondaire" disabled={occupe} onClick={()=>void declarer('preparee')}>{en?'I prepared it':'Je l’ai préparée'}</button>}
   {['non_commencee','preparee'].includes(valeur)&&<button type="button" className="btn-secondaire" disabled={occupe} onClick={()=>void declarer('partielle')}>{en?'I did part of it':'Je l’ai réalisée en partie'}</button>}
   {aideDisponible&&!aide&&<button type="button" className="btn-secondaire" disabled={occupe} onClick={()=>void declarer('aide_demandee')}>{en?'I need help':'J’ai besoin d’aide'}</button>}
  </div>}
  {erreur&&<p role="alert">{nettoyageIncomplet?(en?'The record is already confirmed. Retry to finish the update.':'L’enregistrement est déjà confirmé. Réessaie pour terminer la mise à jour.'):(en?'Confirmation unavailable. Retry this same declaration when you can.':'Confirmation indisponible. Réessaie cette même déclaration quand tu peux.')}</p>}
 </section>;
}
