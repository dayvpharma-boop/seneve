import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ActiviteJourRecette} from '@/lib/habitudes-jour-recette';
import type {EtatOccurrence} from '@/lib/habitudes';
import type {TransportProgression} from '@/lib/habitudes-api';
import {cleLecture,lireLectureEnAttente,preparerLecture,enregistrerLecture,type DetailLecture,type SaisieLecture} from '@/lib/habitudes-lectures-api';
import {IconeHD} from './IconeHabitudes';

export function SaisieLectureHabitudes({activite,userId,langue,detail,transport,onConfirme,onFermer}:{activite:ActiviteJourRecette;userId:string;langue:string;detail?:DetailLecture;transport:TransportProgression;onConfirme:(e:EtatOccurrence,d:DetailLecture)=>void;onFermer:()=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr,dialog=useRef<HTMLDialogElement>(null),verrou=useRef(false);
 const cle=cleLecture(userId,activite.occurrence);
 const [attente,setAttente]=useState(()=>{try{return lireLectureEnAttente(sessionStorage,cle);}catch{return null;}});
 const [minutes,setMinutes]=useState(String(attente?.minutes??detail?.minutes??'')),[titre,setTitre]=useState(attente?.titre??detail?.titre??'');
 const [autre,setAutre]=useState(!['','10','20','30'].includes(minutes)),[occupe,setOccupe]=useState(false),[erreur,setErreur]=useState(false),[confirme,setConfirme]=useState(false);
 const fait=activite.etat?.synchronisation==='synchronise'&&activite.etat.etat==='realisee';
 const valide=/^[0-9]+$/.test(minutes)&&Number(minutes)>=1&&Number(minutes)<=1440&&titre.trim().length<=160;
 useEffect(()=>{const d=dialog.current;if(!d)return;const avant=document.activeElement;
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return()=>{if(d.open&&typeof d.close==='function')d.close();if(avant instanceof HTMLElement&&avant.isConnected)avant.focus();};
 },[]);
 async function envoyer(action:SaisieLecture['action']){
  if(verrou.current||!valide)return;verrou.current=true;setOccupe(true);setErreur(false);
  try{const s=preparerLecture(sessionStorage,cle,action,Number(minutes),titre);setAttente(s);
   const r=await enregistrerLecture(transport,activite.occurrence,s);setConfirme(true);onConfirme(r.etat,r.lecture);
   sessionStorage.removeItem(cle);onFermer();
  }catch{setErreur(true);}finally{verrou.current=false;setOccupe(false);}
 }
 const gele=occupe||!!attente;
 return createPortal(<dialog ref={dialog} aria-label={l('Combien de temps ?','How much time?')} onCancel={e=>{e.preventDefault();if(!verrou.current)onFermer();}} className="hd-stitch fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none max-h-[90dvh] overflow-auto rounded-t-3xl border-0 bg-hd-surface p-hd-space-lg text-hd-on-surface backdrop:bg-hd-inverse-surface/50">
  <div className="max-w-2xl mx-auto flex flex-col gap-4">
   <header className="flex justify-between items-start gap-3"><div><p className="font-hd-label-sm text-hd-label-sm text-hd-secondary">{activite.consigne}</p><h2 className="font-hd-headline-md text-hd-headline-md">{l('Combien de temps ?','How much time?')}</h2></div><button type="button" disabled={occupe} aria-label={l('Fermer la saisie de durée','Close time entry')} onClick={onFermer} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><IconeHD nom="close"/></button></header>
   <fieldset disabled={gele} className="flex flex-col gap-3"><legend className="font-hd-label-lg text-hd-label-lg mb-2">{l('Durée consacrée','Time spent')}</legend>
    <div className="flex flex-wrap gap-2">{['10','20','30','autre'].map(v=><button key={v} type="button" aria-pressed={v==='autre'?autre:!autre&&minutes===v} onClick={()=>{setAutre(v==='autre');setMinutes(v==='autre'?'':v);}} className={`min-h-[44px] px-4 rounded-full font-hd-label-md text-hd-label-md ${v==='autre'?autre?'bg-hd-secondary text-hd-on-secondary':'bg-hd-surface-container':!autre&&minutes===v?'bg-hd-secondary text-hd-on-secondary':'bg-hd-surface-container'}`}>{v==='autre'?l('Autre','Other'):v+' min'}</button>)}</div>
    {autre&&<label className="flex flex-col gap-1 font-hd-label-md text-hd-label-md">{l('Nombre de minutes (1 à 1 440)','Minutes (1 to 1,440)')}<input type="number" min="1" max="1440" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} className="min-h-[48px] px-3 rounded-xl border border-hd-outline-variant bg-hd-surface-container-lowest"/></label>}
    <label className="flex flex-col gap-1 font-hd-label-md text-hd-label-md">{l('Titre ou référence (facultatif)','Title or reference (optional)')}<input type="text" value={titre} maxLength={160} onChange={e=>setTitre(e.target.value)} className="min-h-[48px] px-3 rounded-xl border border-hd-outline-variant bg-hd-surface-container-lowest"/></label>
   </fieldset>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Indique le temps total pour cette activité aujourd’hui. Le titre reste dans ton suivi privé. Choisir une durée ne valide rien : confirme seulement ce que tu as réellement pratiqué.','Enter the total time for this activity today. The title stays in your private record. Choosing a time completes nothing: confirm only what you actually practised.')}</p>
   {erreur&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{confirme?l('Déjà enregistré. Réessaie pour terminer la mise à jour sur cet appareil.','Already saved. Retry to finish updating this device.'):l('Non confirmé. Réessaie la même déclaration ; ta saisie est conservée dans cet onglet.','Not confirmed. Retry the same declaration; your entry is kept in this tab.')}</p>}
   <div className="flex gap-3 pb-safe">{attente?<button type="button" disabled={occupe} onClick={()=>void envoyer(attente.action)} className="min-h-[48px] px-4 flex-1 rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg">{occupe?l('Enregistrement…','Saving…'):l('Réessayer la même déclaration','Retry the same declaration')}</button>:<>
    {!fait&&<button type="button" disabled={!valide||occupe} onClick={()=>void envoyer('partielle')} className="min-h-[48px] px-4 flex-1 rounded-xl bg-hd-surface-container font-hd-label-lg text-hd-label-lg disabled:opacity-40">{l('En partie','Partly done')}</button>}
    <button type="button" disabled={!valide||occupe} onClick={()=>void envoyer('realisee')} className="min-h-[48px] px-4 flex-1 rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg disabled:opacity-40">{fait?l('Enregistrer la durée','Save time'):l('Fait','Done')}</button>
   </>}</div>
  </div>
 </dialog>,document.body);
}
