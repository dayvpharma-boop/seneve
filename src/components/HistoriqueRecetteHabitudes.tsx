import {BilansMensuelsHabitudes} from './BilansMensuelsHabitudes';
import {DureesSemaineHabitudes} from './DureesSemaineHabitudes';
import {useEffect,useRef,useState} from 'react';
import {chargerHistoriqueRecette,type JourRecette} from '@/lib/habitudes-jour-recette';
import {bilanHabitudes} from '@/lib/habitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import {BilansHebdomadairesHabitudes} from './BilansHebdomadairesHabitudes';
import {LecturesHistoriqueHabitudes} from './LecturesHistoriqueHabitudes';
import {IconeHD} from './IconeHabitudes';

export function HistoriqueRecetteHabitudes({enrollmentId,participantId,dateLocale,langue,revision}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;revision:number}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(()=>new URLSearchParams(window.location.search).get('historique')==='1'),[lecture,setLecture]=useState<{cle:string;jours:JourRecette[]}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const retourBilan=useRef(new URLSearchParams(window.location.search).get('historique')==='1');
 const cle=`${enrollmentId}:${participantId}:${dateLocale}:${revision}`;
 useEffect(()=>{if(!ouvert)return;let actif=true;setLecture(null);setErreur(false);void chargerHistoriqueRecette(enrollmentId,participantId,dateLocale).then(jours=>{if(actif)setLecture({cle,jours});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[ouvert,cle,tour]);
 useEffect(()=>{if(ouvert&&lecture?.cle===cle&&retourBilan.current){retourBilan.current=false;document.getElementById('hd-historique')?.scrollIntoView?.({block:'start'});}},[ouvert,lecture,cle]);
 const jours:JourHabitudesLecture[]=(lecture?.cle===cle?lecture.jours:[]).map(j=>({jour:j.jour,date_locale:j.date,bilan:bilanHabitudes({enrollment_id:enrollmentId,version:1,date_locale:j.date},j.activites.map(a=>a.occurrence),j.activites.flatMap(a=>a.etat?[a.etat]:[])),activites:j.activites.map(a=>({id:a.occurrence.occurrence_id,habit_key:a.habit_key,consigne:a.consigne,requise:a.occurrence.requise,etat:a.etat?.etat??'non_commencee',aide:a.etat?.aide_demandee??false,confirmee:a.etat?.synchronisation==='synchronise'}))}));
 const labels=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 const secondaire='min-h-[48px] px-4 rounded-xl bg-hd-surface-container hover:bg-hd-surface-container-high text-hd-on-surface font-hd-label-lg text-hd-label-lg font-medium flex items-center justify-center gap-2 transition-colors';
 return <section id="hd-historique" className="hd-historique-recette hd-stitch mt-hd-space-lg flex flex-col gap-hd-space-md" aria-label={l('Mon historique et mes bilans','My history and reviews')}>
  <button type="button" className={`w-full ${secondaire}`} aria-expanded={ouvert} onClick={()=>setOuvert(v=>!v)}><IconeHD nom="history" className="text-[20px] text-hd-secondary"/>{ouvert?l('Fermer mon historique','Close my history'):l('Voir mon historique et mes bilans','View my history and reviews')}</button>
  {ouvert&&<div className="flex flex-col gap-hd-space-md">
   <header className="flex flex-col gap-1"><span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary">{l('Habitudes & Défis · Bilan','Habits & Challenges · Review')}</span><h2 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface">{l('Mon chemin jusqu’ici','My journey so far')}</h2><p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Retrouve les déclarations confirmées pour les journées ouvertes de ton parcours. Les jours à venir ne sont pas comptés.','View confirmed records for the open days of your journey. Future days are not counted.')}</p></header>
   {erreur?<div className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md flex flex-col gap-hd-space-sm"><p role="alert" className="font-hd-body-md text-hd-body-md">{l('L’historique ne peut pas être vérifié pour le moment.','Your history cannot be verified right now.')}</p><button type="button" className={secondaire} onClick={()=>setTour(n=>n+1)}>{l('Réessayer la lecture','Retry loading')}</button></div>:lecture?.cle!==cle?<p role="status" className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Chargement de l’historique…','Loading history…')}</p>:<>
    <BilansMensuelsHabitudes jours={jours} langue={langue} inscription={enrollmentId}/>
    <BilansHebdomadairesHabitudes jours={jours} langue={langue} inscription={enrollmentId} complementSemaine={(de,a)=><DureesSemaineHabitudes key={cle+tour} jours={(lecture?.cle===cle?lecture.jours:[]).filter(j=>j.jour>=de&&j.jour<=a)} langue={langue}/>}/>
    <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Mes journées','My days')}</h3>
    <div className="flex flex-col gap-2">{[...jours].reverse().map(j=><details key={j.date_locale} className="hd-historique-jour group bg-hd-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(29,28,19,0.03)]"><summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[52px] px-3 flex items-center gap-2 font-hd-label-md text-hd-label-md text-hd-on-surface"><IconeHD nom="calendar_today" className="text-[16px] text-hd-secondary"/><span className="flex-1">{l('Jour','Day')} {j.jour} · {new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(j.date_locale+'T12:00:00Z'))} · {j.bilan.realisees}/{j.bilan.total} {l('réalisées','completed')}</span><IconeHD nom="chevron_right" className="text-[18px] text-hd-outline transition-transform group-open:rotate-90"/></summary>
     <ul className="px-3 pb-3 flex flex-col">{j.activites.map(a=><li key={a.id} className="flex items-baseline justify-between gap-2 py-2 border-b border-hd-outline-variant/40 last:border-0"><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface">{a.consigne}</span><strong className={`font-hd-label-sm text-hd-label-sm px-2 py-0.5 rounded-full ${a.etat==='realisee'?'bg-hd-surface-container text-hd-secondary':a.etat==='partielle'?'bg-hd-secondary-container/40 text-hd-secondary':'bg-hd-surface-container text-hd-on-surface-variant'}`}>{labels[a.etat]}</strong></li>)}</ul>
     {lecture?.cle===cle&&lecture.jours.find(x=>x.date===j.date_locale)&&<LecturesHistoriqueHabitudes key={cle} jour={lecture.jours.find(x=>x.date===j.date_locale)!} langue={langue}/>}
    </details>)}</div>
    <button type="button" className={secondaire} onClick={()=>setTour(n=>n+1)}><IconeHD nom="refresh" className="text-[18px]"/>{l('Actualiser mon historique','Refresh my history')}</button>
   </>}
  </div>}
 </section>;
}
