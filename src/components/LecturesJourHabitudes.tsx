import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import type {ActiviteJourRecette} from '@/lib/habitudes-jour-recette';
import type {EtatOccurrence} from '@/lib/habitudes';
import type {TransportProgression} from '@/lib/habitudes-api';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';

const CLES=['bible_matin','lecture_pro','predication','lecture_personnelle','bible_soir'];
export const estLectureHabitudes=(cle?:string)=>!!cle&&CLES.includes(cle);

/** Vue des activités déjà vérifiées de la journée : aucune lecture ni déclaration supplémentaire à l'ouverture. */
export function LecturesJourHabitudes({activites,userId,langue,transport,onConfirme,onFermer}:{activites:ActiviteJourRecette[];userId:string;langue:string;transport:TransportProgression;onConfirme:(etat:EtatOccurrence)=>void;onFermer:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const lectures=activites.filter(a=>estLectureHabitudes(a.habit_key)).sort((a,b)=>a.heure.localeCompare(b.heure));
 const faites=lectures.filter(a=>a.etat?.synchronisation==='synchronise'&&a.etat.etat==='realisee').length;
 useEffect(()=>{const d=dialog.current;if(!d)return;const avant=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return()=>{document.body.style.overflow=overflow;if(d.open&&typeof d.close==='function')d.close();if(avant instanceof HTMLElement&&avant.isConnected)avant.focus();};
 },[]);
 return createPortal(<dialog ref={dialog} aria-label={l('Lectures du jour','Today’s readings')} className="fixed inset-0 m-0 p-0 border-0 w-full h-[100dvh] max-w-none max-h-none bg-hd-surface text-hd-on-surface open:flex open:flex-col backdrop:bg-hd-inverse-surface/50" onCancel={e=>{e.preventDefault();onFermer();}}>
  <header className="flex items-center gap-3 px-hd-margin py-2 border-b border-hd-outline-variant shrink-0">
   <button type="button" onClick={onFermer} aria-label={l('Revenir à ma journée','Back to my day')} className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full"><IconeHD nom="arrow_back"/></button>
   <h2 className="font-hd-headline-sm text-hd-headline-sm">{l('Lectures du jour','Today’s readings')}</h2>
  </header>
  <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-hd-margin py-hd-space-lg">
   <div className="max-w-2xl mx-auto flex flex-col gap-hd-space-md pb-hd-space-lg">
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Bible, livres et prédication : un temps pour lire, écouter et réfléchir.','Bible, books and preaching: time to read, listen and reflect.')}</p>
    <p role="status" className="font-hd-label-md text-hd-label-md text-hd-secondary">{l(`${faites} sur ${lectures.length} réalisées`,`${faites} of ${lectures.length} completed`)}</p>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Ouvrir cet écran ou un passage ne valide rien. Déclare seulement ce que tu as réellement pratiqué.','Opening this screen or a passage completes nothing. Record only what you actually practised.')}</p>
    {lectures.map(a=>{
     const bible=a.habit_key==='bible_matin'||a.habit_key==='bible_soir',matin=a.habit_key==='bible_matin';
     return <section key={a.occurrence.occurrence_id} className="flex flex-col gap-2" aria-label={l(`Repères — ${a.consigne}`,`Guidance — ${a.consigne}`)}>
      <p className="flex items-center gap-2 font-hd-label-sm text-hd-label-sm text-hd-secondary"><IconeHD nom={a.habit_key==='predication'?'headphones':'menu_book'}/>{bible?l('Livre et chapitre au choix · durée personnelle','Choose a book and chapter · your own pace'):l('Objectif : 30 minutes par jour','Goal: 30 minutes a day')}</p>
      <DeclarationHabitude variante="stitch" userId={userId} occurrence={a.occurrence} consigne={a.consigne} critere={a.critere} heure={a.heure} etat={a.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={transport} onConfirme={onConfirme} lienLecture={bible?{href:`${import.meta.env.BASE_URL}bible/livres?depuis=habitudes&moment=${matin?'matin':'soir'}&lang=${en?'en':'fr'}`,label:matin?l('Lire la Bible du matin','Read the morning Bible reading'):l('Lire la Bible du soir','Read the evening Bible reading')}:undefined}/>
     </section>;
    })}
    <aside className="rounded-2xl bg-hd-surface-container p-hd-space-md font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">
     <h3 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Recommandations bientôt disponibles','Recommendations coming later')}</h3>
     <p>{l('Tu peux utiliser les livres et prédications de ton choix. Les suggestions de l’application seront proposées après validation éditoriale.','You can use books and preaching of your choice. App suggestions will be offered after editorial approval.')}</p>
    </aside>
   </div>
  </div>
 </dialog>,document.body);
}
