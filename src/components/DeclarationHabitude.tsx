import {useEffect,useRef,useState} from 'react';
import {enregistrerHabitude,type ActionHabitude,type TransportProgression} from '@/lib/habitudes-api';
import type {EtatOccurrence,OccurrenceHabitude} from '@/lib/habitudes';
import {cleSaisie,lireSaisie,preparerSaisie,type SaisieEnAttente} from '@/lib/habitudes-saisie';
import {IconeHD} from './IconeHabitudes';

export function DeclarationHabitude({userId,occurrence,consigne,critere,lienLecture,lienEcriture,etat,langue,lectureSeule,transport,onConfirme,onDemanderLecture,aideDisponible=true,variante,heure,attenue=false}:{
 /** « stitch » : carte des maquettes Stitch HD (même mécanisme d'enregistrement). */
 variante?:'stitch'|'priere';heure?:string;attenue?:boolean;
 onDemanderLecture?:()=>void;
 lienLecture?:{href:string;label:string};lienEcriture?:{href:string;label:string};aideDisponible?:boolean;userId:string;occurrence:OccurrenceHabitude;consigne:string;critere?:string|null;etat?:EtatOccurrence;langue:string;lectureSeule:boolean;transport:TransportProgression;onConfirme:(e:EtatOccurrence)=>void;
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
  if(onDemanderLecture&&!attente&&(action==='partielle'||action==='realisee')){onDemanderLecture();return;}
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
 const [autres,setAutres]=useState(false),[deplie,setDeplie]=useState(false);
 if(variante==='stitch')return <CarteStitch {...{en,consigne,critere,lienLecture,lienEcriture,heure,valeur,aide:!!aide,synchronise:courant?.synchronisation==='synchronise',attente:!!attente,nettoyageIncomplet,erreur,occupe,lectureSeule,aideDisponible,autres,setAutres,attenue:attenue&&!deplie&&!attente&&!aide&&valeur==='non_commencee',deplier:()=>setDeplie(true)}} declarer={a=>void declarer(a)} rejouer={()=>attente&&void declarer(attente.action)}/>;
 const labels=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 if(variante==='priere')return <section className="ap-actions" aria-label={consigne} aria-busy={occupe}>
  <p role="status" className="ap-etat">{valeur==='realisee'?(en?'Prayer recorded · Synchronised':'Prière déclarée · Synchronisée'):attente?(nettoyageIncomplet?(en?'Record confirmed. Retry to finish updating this device.':'Enregistrement confirmé. Réessaie pour terminer la mise à jour sur cet appareil.'):(en?'Waiting for server confirmation.':'En attente de confirmation du serveur.')):labels[valeur]}</p>
  <div className="ap-boutons">
   <button type="button" disabled aria-label={en?'Audio unavailable':'Audio indisponible'}><IconeHD nom="headphones"/><span>{en?'Unavailable':'Indisponible'}</span></button>
   <a href={`${import.meta.env.BASE_URL}journal?ecrire=1&lang=${en?'en':'fr'}`} onClick={e=>{if(occupe)e.preventDefault();}} aria-disabled={occupe}><IconeHD nom="edit_note"/><span>{en?'In my own words':'Avec mes mots'}</span></a>
   <button type="button" className="ap-confirmer" disabled={occupe||lectureSeule||(!attente&&valeur==='realisee')} onClick={()=>void declarer(attente?.action??'realisee')}><IconeHD nom={valeur==='realisee'?'done_all':'check'}/><span>{occupe?(en?'Saving…':'Enregistrement…'):attente?(en?'Retry declaration':'Réessayer la déclaration'):valeur==='realisee'?(en?'Prayer recorded':'Prière déclarée'):(en?'I prayed':'J’ai prié')}</span></button>
  </div>
  {erreur&&<p role="alert" className="ap-erreur">{nettoyageIncomplet?(en?'Already confirmed. Retry to finish updating this device.':'Déjà confirmé. Réessaie pour terminer la mise à jour sur cet appareil.'):(en?'Not confirmed. Check your connection and retry the same declaration.':'Non confirmé. Vérifie ta connexion et réessaie cette même déclaration.')}</p>}
 </section>;
 return <section className="card hd-declaration" aria-label={consigne} aria-busy={occupe}>
  <h3>{consigne}</h3>{critere&&<p>{critere}</p>}{lienLecture&&<a className="btn-secondaire" href={lienLecture.href}>{lienLecture.label}</a>}
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

type ValeurEtat='non_commencee'|'preparee'|'partielle'|'realisee';
/** Rendu Stitch : mêmes actions, mêmes messages d'attente et d'erreur que la carte d'origine. */
function CarteStitch(p:{en:boolean;consigne:string;lienEcriture?:{href:string;label:string};lienLecture?:{href:string;label:string};critere?:string|null;heure?:string;valeur:ValeurEtat;aide:boolean;synchronise:boolean;attente:boolean;nettoyageIncomplet:boolean;erreur:boolean;occupe:boolean;lectureSeule:boolean;aideDisponible:boolean;autres:boolean;setAutres:(b:boolean)=>void;attenue:boolean;deplier:()=>void;declarer:(a:ActionHabitude)=>void;rejouer:()=>void}){
 const {en,consigne,critere,heure,valeur,aide}=p,l=(fr:string,english:string)=>en?english:fr;
 const etatTexte={non_commencee:l('Pas encore enregistrée','Not recorded yet'),preparee:l('Préparée','Prepared'),partielle:l('Réalisée en partie','Partly done'),realisee:l('Réalisée','Completed')}[valeur]+(p.synchronise?l(' · Synchronisée',' · Synchronised'):'');
 const heureEl=heure?<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant shrink-0"><time dateTime={heure}>{heure}</time></span>:null;
 const statut=<p role="status" className="sr-only">{etatTexte}</p>;
 const lien=p.lienEcriture??p.lienLecture;
 const lecture=lien?<a href={lien.href} aria-label={lien.label} className="relative z-10 min-h-[44px] px-3 rounded-xl bg-hd-surface-container hover:bg-hd-surface-container-high text-hd-secondary font-hd-label-md text-hd-label-md font-medium shrink-0 inline-flex items-center justify-center gap-1.5"><IconeHD nom={p.lienEcriture?'edit_note':'menu_book'} className="text-[17px]"/><span>{p.lienEcriture?l('Écrire','Write'):l('Lire','Read')}</span></a>:null;
 if(p.attenue)return <article aria-label={consigne} className="relative bg-hd-surface-container/60 rounded-xl px-hd-space-md py-2.5 flex items-center justify-between">
  {statut}<div className="flex items-center gap-3 min-w-0">
   <IconeHD nom="radio_button_unchecked" className="text-[18px] text-hd-outline"/>
   <div className="flex items-baseline gap-2 truncate">{heureEl}<h3 className="font-hd-label-md text-hd-label-md text-hd-on-surface truncate">{consigne}</h3></div>
  </div>
  <span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant shrink-0">{l('À faire','To do')}</span>
  <button type="button" onClick={p.deplier} aria-expanded={false} aria-label={l(`Déclarer : ${consigne}`,`Record: ${consigne}`)} className="absolute inset-0 rounded-xl"/>
  {lecture}
 </article>;
 if(valeur==='realisee'&&!aide&&!p.attente&&!p.erreur)return <article aria-label={consigne} className="bg-hd-surface-container-lowest rounded-2xl px-hd-space-md py-3 shadow-[0_1px_6px_rgba(29,28,19,0.03)] flex items-center justify-between">
  {statut}<div className="flex items-center gap-3 min-w-0">
   <span className="w-7 h-7 rounded-full bg-hd-secondary-container/40 text-hd-secondary flex items-center justify-center shrink-0"><IconeHD nom="done" className="text-[17px]"/></span>
   <div className="flex items-baseline gap-2 min-w-0 truncate">{heureEl}<h3 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface truncate">{consigne}</h3></div>
  </div>
  <div className="flex items-center gap-2"><div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hd-surface-container text-hd-secondary shrink-0"><IconeHD nom="verified" className="text-[15px]"/><span className="font-hd-label-sm text-hd-label-sm">{l('Fait','Done')}</span></div>{lecture}</div>
 </article>;
 const cercle=aide?<span className="w-7 h-7 rounded-full bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0"><IconeHD nom="support_agent" className="text-[18px]"/></span>
  :valeur==='realisee'?<span className="w-7 h-7 rounded-full bg-hd-secondary-container/40 text-hd-secondary flex items-center justify-center shrink-0"><IconeHD nom="done" className="text-[17px]"/></span>
  :valeur==='partielle'?<span className="w-7 h-7 rounded-full bg-hd-secondary-container/30 text-hd-secondary flex items-center justify-center shrink-0"><IconeHD nom="pie_chart" className="text-[18px]"/></span>
  :valeur==='preparee'?<span className="w-7 h-7 rounded-full bg-hd-secondary-container/30 text-hd-secondary flex items-center justify-center shrink-0"><IconeHD nom="check" className="text-[18px]"/></span>
  :<span className="w-7 h-7 rounded-full bg-hd-surface-container text-hd-outline flex items-center justify-center shrink-0"><IconeHD nom="radio_button_unchecked" className="text-[18px]"/></span>;
 const pastille=aide?<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] font-hd-label-sm text-hd-label-sm font-medium shrink-0"><IconeHD nom="info" className="text-[14px]"/>{l('Aide demandée','Help requested')}</span>
  :valeur==='realisee'?<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hd-surface-container text-hd-secondary font-hd-label-sm text-hd-label-sm shrink-0"><IconeHD nom="verified" className="text-[15px]"/>{l('Fait','Done')}</span>
  :valeur==='partielle'?<span className="font-hd-label-sm text-hd-label-sm text-hd-secondary bg-hd-secondary-container/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><IconeHD nom="timelapse" className="text-[14px]"/>{l('En partie','Partly done')}</span>
  :valeur==='preparee'?<span className="font-hd-label-sm text-hd-label-sm text-hd-secondary bg-hd-secondary-container/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"><IconeHD nom="check" className="text-[14px]"/>{l('Prête','Prepared')}</span>
  :<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant px-2 py-0.5 rounded-full bg-hd-surface-container flex items-center gap-1 shrink-0"><IconeHD nom="hourglass_empty" className="text-[14px]"/>{l('À faire','To do')}</span>;
 const nomFait=l('J’ai réalisé cette activité','I completed this activity');
 const principal=p.lectureSeule?<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{l('Lecture seule','Read only')}</span>
  :p.attente?<button type="button" disabled={p.occupe} onClick={p.rejouer} className="min-h-[44px] px-3.5 rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-md text-hd-label-md font-medium shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-60"><IconeHD nom="refresh" className="text-[16px]"/><span>{p.occupe?l('Enregistrement…','Saving…'):l('Réessayer cette déclaration','Retry this declaration')}</span></button>
  :valeur==='realisee'?null
  :valeur==='partielle'?<button type="button" aria-label={nomFait} disabled={p.occupe} onClick={()=>p.declarer('realisee')} className="min-h-[44px] px-3.5 rounded-xl bg-hd-surface-container hover:bg-hd-surface-container-high text-hd-on-surface font-hd-label-md text-hd-label-md font-medium shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-60"><IconeHD nom="edit_calendar" className="text-[16px]"/><span>{l('Compléter','Complete')}</span></button>
  :<button type="button" aria-label={nomFait} disabled={p.occupe} onClick={()=>p.declarer('realisee')} className="min-h-[44px] px-3.5 rounded-xl bg-hd-secondary hover:bg-hd-on-secondary-fixed-variant text-hd-on-secondary font-hd-label-md text-hd-label-md font-medium shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-60"><IconeHD nom="done" className="text-[16px]"/><span>{l('Fait','Done')}</span></button>;
 const choix=[aide&&valeur!=='realisee'&&!p.lectureSeule&&{a:'realisee' as const,t:nomFait},valeur==='non_commencee'&&{a:'preparee' as const,t:l('Je l’ai préparée','I prepared it')},['non_commencee','preparee'].includes(valeur)&&{a:'partielle' as const,t:l('Je l’ai réalisée en partie','I did part of it')},p.aideDisponible&&!aide&&{a:'aide_demandee' as const,t:l('J’ai besoin d’aide','I need help')}].filter(Boolean) as {a:ActionHabitude;t:string}[];
 return <article aria-label={consigne} aria-busy={p.occupe} className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-2.5">
  {statut}
  <div className="flex items-center justify-between gap-2">
   <div className="flex items-center gap-2.5 min-w-0">{cercle}<div className="flex items-baseline gap-2 min-w-0">{heureEl}<h3 className="font-hd-label-lg text-hd-label-lg font-medium text-hd-on-surface truncate">{consigne}</h3></div></div>
   {pastille}
  </div>
  {(()=>{const reglages=!p.lectureSeule&&!p.attente&&choix.length>0?<button type="button" aria-expanded={p.autres} aria-label={l('Autres choix','Other choices')} onClick={()=>p.setAutres(!p.autres)} className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors shrink-0 ${p.autres?'bg-hd-surface-container-high text-hd-on-surface':'bg-hd-surface-container hover:bg-hd-surface-container-high text-hd-on-surface-variant'}`}><IconeHD nom="tune" className="text-[20px]"/></button>:null;
   return aide?<div className="flex items-center justify-between gap-2 text-hd-on-surface-variant pl-9"><span className="font-hd-body-sm text-hd-body-sm italic flex items-center gap-1.5">{l('Demande envoyée à l’équipe','Request sent to the team')}<IconeHD nom="mark_email_read" className="text-[16px] text-[#0369A1]"/></span><div className="flex items-center gap-2 shrink-0">{lecture}{reglages}</div></div>
   :(critere||principal||reglages||lecture)&&<div className="flex items-center justify-between gap-hd-space-sm pt-1"><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant min-w-0 flex-1">{critere}</p><div className="flex items-center gap-2 shrink-0">{lecture}{principal}{reglages}</div></div>;})()}
  {p.attente&&<p role="status" className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{p.nettoyageIncomplet?l('Enregistrement confirmé. Réessaie pour terminer la mise à jour sur cet appareil.','Record confirmed. Retry to finish updating this device.'):l('En attente de confirmation du serveur. Cette déclaration n’est pas encore confirmée.','Waiting for server confirmation. This declaration is not confirmed yet.')}</p>}
  {p.autres&&!p.lectureSeule&&!p.attente&&choix.length>0&&<div className="flex flex-wrap gap-2">{choix.map(c=><button key={c.a} type="button" disabled={p.occupe} onClick={()=>p.declarer(c.a)} className="min-h-[44px] px-3.5 rounded-xl bg-hd-surface-container-low hover:bg-hd-surface-container text-hd-on-surface font-hd-label-md text-hd-label-md font-medium disabled:opacity-60">{c.t}</button>)}</div>}
  {p.erreur&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{p.nettoyageIncomplet?l('L’enregistrement est déjà confirmé. Réessaie pour terminer la mise à jour.','The record is already confirmed. Retry to finish the update.'):l('Confirmation indisponible. Réessaie cette même déclaration quand tu peux.','Confirmation unavailable. Retry this same declaration when you can.')}</p>}
 </article>;
}
