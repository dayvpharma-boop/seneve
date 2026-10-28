import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {ActiviteJourRecette} from '@/lib/habitudes-jour-recette';
import type {EtatOccurrence} from '@/lib/habitudes';
import type {TransportProgression} from '@/lib/habitudes-api';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';
import {SaisieLectureHabitudes} from './SaisieLectureHabitudes';
import {chargerDetailsLectures,type DetailLecture} from '@/lib/habitudes-lectures-api';

const CLES=['bible_matin','lecture_pro','predication','lecture_personnelle','bible_soir'];
export const estLectureHabitudes=(cle?:string)=>!!cle&&CLES.includes(cle);

/** Vue des activités déjà vérifiées de la journée : aucune lecture ni déclaration supplémentaire à l'ouverture. */
export function LecturesJourHabitudes({activites,userId,langue,transport,onConfirme,onFermer,lectureInitialeId}:{activites:ActiviteJourRecette[];userId:string;langue:string;transport:TransportProgression;onConfirme:(etat:EtatOccurrence)=>void;onFermer:()=>void;lectureInitialeId?:string|null}){
 const dialog=useRef<HTMLDialogElement>(null),en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const lectures=activites.filter(a=>estLectureHabitudes(a.habit_key)).sort((a,b)=>a.heure.localeCompare(b.heure));
 const faites=lectures.filter(a=>a.etat?.synchronisation==='synchronise'&&a.etat.etat==='realisee').length;
 const [detailsLus,setDetailsLus]=useState<{cle:string;lignes:DetailLecture[]}|null>(null),[erreurDetails,setErreurDetails]=useState(false),[tour,setTour]=useState(0),[saisieId,setSaisieId]=useState<string|null>(lectureInitialeId??null);
 const transportCourant=useRef(transport);transportCourant.current=transport;
 const ids=lectures.map(a=>a.occurrence.occurrence_id),enrollmentId=lectures[0]?.occurrence.enrollment_id,cle=[userId,enrollmentId,...ids].join(':');
 const details=detailsLus?.cle===cle?detailsLus.lignes:null;
 useEffect(()=>{let actif=true;setDetailsLus(null);setErreurDetails(false);
  if(enrollmentId&&ids.length)void chargerDetailsLectures(transportCourant.current,enrollmentId,ids).then(r=>{if(actif)setDetailsLus({cle,lignes:r});}).catch(()=>{if(actif)setErreurDetails(true);});
  return()=>{actif=false;};
 },[cle,tour]);
 const saisie=lectures.find(a=>a.occurrence.occurrence_id===saisieId);
 useEffect(()=>{const d=dialog.current;if(!d)return;const avant=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return()=>{document.body.style.overflow=overflow;if(d.open&&typeof d.close==='function')d.close();if(avant instanceof HTMLElement&&avant.isConnected)avant.focus();};
 },[]);
 return createPortal(<dialog ref={dialog} aria-label={l('Lectures du jour','Today’s readings')} className="hd-stitch overflow-hidden fixed inset-0 m-0 p-0 border-0 w-full h-[100dvh] max-w-none max-h-none bg-hd-surface text-hd-on-surface open:flex open:flex-col backdrop:bg-hd-inverse-surface/50" onCancel={e=>{e.preventDefault();onFermer();}}>
  <header className="flex items-center gap-3 px-hd-margin py-2 border-b border-hd-outline-variant shrink-0">
   <button type="button" onClick={onFermer} aria-label={l('Revenir à ma journée','Back to my day')} className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full"><IconeHD nom="arrow_back"/></button>
   <h2 className="font-hd-headline-sm text-hd-headline-sm">{l('Lectures du jour','Today’s readings')}</h2>
  </header>
  <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-hd-margin py-hd-space-lg">
   <div className="max-w-2xl mx-auto flex flex-col gap-hd-space-md pb-hd-space-lg">
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Bible, livres et prédication : un temps pour lire, écouter et réfléchir.','Bible, books and preaching: time to read, listen and reflect.')}</p>
    <p role="status" className="font-hd-label-md text-hd-label-md text-hd-secondary">{l(`${faites} sur ${lectures.length} réalisées`,`${faites} of ${lectures.length} completed`)}</p>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Ouvrir cet écran ou un passage ne valide rien. Déclare seulement ce que tu as réellement pratiqué.','Opening this screen or a passage completes nothing. Record only what you actually practised.')}</p>
    {erreurDetails?<div><p role="alert">{l('Les durées ne peuvent pas être vérifiées. Réessaie avant de saisir une durée.','Times cannot be verified. Retry before entering a time.')}</p><button type="button" className="min-h-[44px] underline" onClick={()=>setTour(n=>n+1)}>{l('Actualiser les durées','Refresh times')}</button></div>:details===null&&<p role="status">{l('Chargement des durées…','Loading times…')}</p>}
    {lectures.map(a=>{
     const bible=a.habit_key==='bible_matin'||a.habit_key==='bible_soir',matin=a.habit_key==='bible_matin',info=details?.find(d=>d.activity_id===a.occurrence.occurrence_id);
     return <section key={a.occurrence.occurrence_id} className="flex flex-col gap-2" aria-label={l(`Repères — ${a.consigne}`,`Guidance — ${a.consigne}`)}>
      <p className="flex items-center gap-2 font-hd-label-sm text-hd-label-sm text-hd-secondary"><IconeHD nom={a.habit_key==='predication'?'headphones':'menu_book'}/>{bible?l('Livre et chapitre au choix · durée personnelle','Choose a book and chapter · your own pace'):l('Objectif : 30 minutes par jour','Goal: 30 minutes a day')}</p>
      <fieldset disabled={details===null} className="contents"><DeclarationHabitude variante="stitch" userId={userId} occurrence={a.occurrence} consigne={a.consigne} critere={a.critere} heure={a.heure} etat={a.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={transport} onConfirme={e=>{if(e.etat==='non_commencee')setDetailsLus(ancien=>ancien?.cle===cle?{cle,lignes:ancien.lignes.filter(d=>d.activity_id!==e.occurrence_id)}:ancien);onConfirme(e);}} onDemanderLecture={()=>setSaisieId(a.occurrence.occurrence_id)} lienLecture={bible?{href:`${import.meta.env.BASE_URL}bible/livres?depuis=habitudes&moment=${matin?'matin':'soir'}&lang=${en?'en':'fr'}`,label:matin?l('Lire la Bible du matin','Read the morning Bible reading'):l('Lire la Bible du soir','Read the evening Bible reading')}:undefined}/></fieldset>
      <div className="flex justify-between items-center gap-2 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">
       <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{details===null?l('Durée non vérifiée','Time not verified'):info?<>{info.minutes} min{info.titre&&<> · {info.titre}</>}</>:l('Aucune durée déclarée','No time recorded')}</p>
       <button type="button" disabled={details===null} aria-label={l(`Saisir la durée — ${a.consigne}`,`Enter time — ${a.consigne}`)} onClick={()=>setSaisieId(a.occurrence.occurrence_id)} className="min-h-[44px] px-3 rounded-xl bg-hd-surface-container shrink-0 disabled:opacity-40">{l('Durée','Time')}</button>
      </div>
     </section>;
    })}
    <aside className="rounded-2xl bg-hd-surface-container p-hd-space-md font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">
     <h3 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Recommandations bientôt disponibles','Recommendations coming later')}</h3>
     <p>{l('Tu peux utiliser les livres et prédications de ton choix. Les suggestions de l’application seront proposées après validation éditoriale.','You can use books and preaching of your choice. App suggestions will be offered after editorial approval.')}</p>
    </aside>
   </div>
  </div>
  {saisie&&details!==null&&<SaisieLectureHabitudes key={cle+':'+saisie.occurrence.occurrence_id} activite={saisie} userId={userId} langue={langue} detail={details.find(d=>d.activity_id===saisie.occurrence.occurrence_id)} transport={transport} onConfirme={(e,d)=>{setDetailsLus(ancien=>({cle,lignes:[...(ancien?.cle===cle?ancien.lignes:[]).filter(x=>x.activity_id!==d.activity_id),d]}));onConfirme(e);}} onFermer={()=>setSaisieId(null)}/>}
 </dialog>,document.body);
}
