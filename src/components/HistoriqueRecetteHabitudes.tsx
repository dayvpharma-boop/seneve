import {useEffect,useState} from 'react';
import {chargerHistoriqueRecette,type JourRecette} from '@/lib/habitudes-jour-recette';
import {bilanHabitudes} from '@/lib/habitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import {BilansHebdomadairesHabitudes} from './BilansHebdomadairesHabitudes';

export function HistoriqueRecetteHabitudes({enrollmentId,participantId,dateLocale,langue,revision}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;revision:number}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false),[lecture,setLecture]=useState<{cle:string;jours:JourRecette[]}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}:${revision}`;
 useEffect(()=>{if(!ouvert)return;let actif=true;setLecture(null);setErreur(false);void chargerHistoriqueRecette(enrollmentId,participantId,dateLocale).then(jours=>{if(actif)setLecture({cle,jours});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[ouvert,cle,tour]);
 const jours:JourHabitudesLecture[]=(lecture?.cle===cle?lecture.jours:[]).map(j=>({jour:j.jour,date_locale:j.date,bilan:bilanHabitudes({enrollment_id:enrollmentId,version:1,date_locale:j.date},j.activites.map(a=>a.occurrence),j.activites.flatMap(a=>a.etat?[a.etat]:[])),activites:j.activites.map(a=>({id:a.occurrence.occurrence_id,consigne:a.consigne,requise:a.occurrence.requise,etat:a.etat?.etat??'non_commencee',aide:a.etat?.aide_demandee??false,confirmee:a.etat?.synchronisation==='synchronise'}))}));
 const labels=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 return <section className="hd-historique-recette" aria-label={l('Mon historique et mes bilans','My history and reviews')}>
  <button type="button" className="oa-primary" aria-expanded={ouvert} onClick={()=>setOuvert(v=>!v)}>{ouvert?l('Fermer mon historique','Close my history'):l('Voir mon historique et mes bilans','View my history and reviews')}</button>
  {ouvert&&<div><h2>{l('Mon chemin jusqu’ici','My journey so far')}</h2><p>{l('Retrouve les déclarations confirmées pour les journées ouvertes de ton parcours. Les jours à venir ne sont pas comptés.','View confirmed records for the open days of your journey. Future days are not counted.')}</p>
   {erreur?<><p role="alert">{l('L’historique ne peut pas être vérifié pour le moment.','Your history cannot be verified right now.')}</p><button type="button" onClick={()=>setTour(n=>n+1)}>{l('Réessayer la lecture','Retry loading')}</button></>:lecture?.cle!==cle?<p role="status">{l('Chargement de l’historique…','Loading history…')}</p>:<>
    <BilansHebdomadairesHabitudes jours={jours} langue={langue}/>
    <h3>{l('Mes journées','My days')}</h3>
    {[...jours].reverse().map(j=><details key={j.date_locale} className="hd-historique-jour"><summary>{l('Jour','Day')} {j.jour} · {new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(j.date_locale+'T12:00:00Z'))} · {j.bilan.realisees}/{j.bilan.total} {l('réalisées','completed')}</summary>
     <ul>{j.activites.map(a=><li key={a.id}><span>{a.consigne}</span><strong>{labels[a.etat]}</strong></li>)}</ul>
    </details>)}
    <button type="button" onClick={()=>setTour(n=>n+1)}>{l('Actualiser mon historique','Refresh my history')}</button>
   </>}
  </div>}
 </section>;
}
