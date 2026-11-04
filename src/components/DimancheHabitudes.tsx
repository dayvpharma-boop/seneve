import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {chargerHistoriqueRecette} from '@/lib/habitudes-jour-recette';
import {resumeSemaine,type ResumeSemaine} from '@/lib/habitudes-resume-semaine';
import {IconeHD} from './IconeHabitudes';

/** Extras du dimanche (demande de Dr Justin du 04/11/2026), tous facultatifs et jamais comptés :
 * ce que je retiens du culte (journal privé), temps en famille (gardé sur l'appareil), résumé de la semaine. */
export function DimancheHabitudes({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const navigate=useNavigate();
 const jourLong=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(dateLocale+'T12:00:00Z'));
 const cleFamille=`seneve:hd:famille:v1:${participantId}:${dateLocale}`;
 const [famille,setFamille]=useState(()=>{try{return localStorage.getItem(cleFamille)==='1';}catch{return false;}});
 function basculerFamille(v:boolean){setFamille(v);try{if(v)localStorage.setItem(cleFamille,'1');else localStorage.removeItem(cleFamille);}catch{/* reste affiché pour cette visite */}}
 const carte='rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm flex flex-col gap-2';
 const titre='font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2';
 const texte='font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant';
 return <section className="mb-hd-space-lg flex flex-col gap-hd-space-sm" aria-label={l('Pour ton dimanche','For your Sunday')}>
  <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{l('Pour ton dimanche · facultatif','For your Sunday · optional')}</span>
  <div className={carte}>
   <p className={titre}><IconeHD nom="edit_note" className="text-[20px] text-hd-secondary"/>{l('Ce que je retiens du culte','What I take from the service')}</p>
   <p className={texte}>{l('Quelques mots sur le message ou un verset, dans ton journal privé.','A few words about the message or a verse, in your private journal.')}</p>
   <button type="button" className="self-start min-h-[44px] px-3.5 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-md text-hd-label-md flex items-center gap-1.5 hd-appui" onClick={()=>navigate(en?'/journal?ecrire=1&lang=en':'/journal?ecrire=1',{state:{citationBiblique:l(`Ce que je retiens du culte — ${jourLong} :`,`What I take from the service — ${jourLong}:`)}})}><IconeHD nom="edit_note" className="text-[16px]"/>{l('Écrire dans mon journal','Write in my journal')}</button>
  </div>
  <div className={carte}>
   <p className={titre}><IconeHD nom="favorite" className="text-[20px] text-hd-secondary"/>{l('Temps en famille','Family time')}</p>
   <label className="flex items-center gap-2.5 min-h-[44px] font-hd-label-md text-hd-label-md text-hd-on-surface cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0 accent-current text-hd-secondary" checked={famille} onChange={e=>basculerFamille(e.target.checked)}/>{l('J’ai pris du temps avec ma famille','I spent time with my family')}</label>
   <p className={texte}>{l('Gardé seulement sur cet appareil. Jamais compté dans ta progression.','Kept only on this device. Never counted in your progress.')}</p>
  </div>
  <ResumeSemaineHabitudes {...{enrollmentId,participantId,dateLocale,langue}}/>
 </section>;
}

function ResumeSemaineHabitudes({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false),[resume,setResume]=useState<ResumeSemaine|null>(null),[erreur,setErreur]=useState(false);
 useEffect(()=>{if(!ouvert)return;let actif=true;setResume(null);setErreur(false);
  void chargerHistoriqueRecette(enrollmentId,participantId,dateLocale).then(h=>{if(actif)setResume(resumeSemaine(h,dateLocale));},()=>{if(actif)setErreur(true);});
  return()=>{actif=false;};},[ouvert,enrollmentId,participantId,dateLocale]);
 const ligne=(icone:string,texte:string)=><li className="flex items-center gap-2.5 font-hd-body-sm text-hd-body-sm text-hd-on-surface"><IconeHD nom={icone} className="text-[18px] text-hd-secondary shrink-0"/>{texte}</li>;
 return <details className="hd-volet rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm" onToggle={e=>setOuvert(e.currentTarget.open)}>
  <summary className="list-none [&::-webkit-details-marker]:hidden min-h-[48px] cursor-pointer flex items-center gap-2 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeHD nom="event_note" className="text-[20px] text-hd-secondary"/><span className="flex-1">{l('Résumé de ma semaine','My week in summary')}</span><IconeHD nom="expand_more" className="hd-volet-chevron text-[22px] text-hd-on-surface-variant"/></summary>
  {ouvert&&<div className="flex flex-col gap-2 pt-1">
   {erreur?<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{l('Résumé indisponible pour le moment. Réessaie plus tard.','Summary unavailable right now. Try again later.')}</p>
   :!resume?<p role="status" className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Chargement de ta semaine…','Loading your week…')}</p>
   :<ul className="flex flex-col gap-2">
     {ligne('done_all',l(`${resume.faites} activités faites sur ${resume.requises}`,`${resume.faites} of ${resume.requises} activities done`))}
     {ligne('spa',l(`${resume.journeesCompletes} ${resume.journeesCompletes>1?'journées complètes':'journée complète'} sur ${resume.jours}`,`${resume.journeesCompletes} full ${resume.journeesCompletes===1?'day':'days'} out of ${resume.jours}`))}
     {ligne('church',l(`${resume.cultes} ${resume.cultes>1?'cultes':'culte'} cette semaine`,`${resume.cultes} ${resume.cultes===1?'service':'services'} this week`))}
     {ligne('volunteer_activism',resume.dime?l('Dîme donnée cette semaine','Tithe given this week'):l('Dîme pas encore cochée cette semaine','Tithe not yet checked this week'))}
    </ul>}
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant italic">{l('Un regard sur ta semaine, sans note ni jugement.','A look at your week, with no score or judgement.')}</p>
  </div>}
 </details>;
}
