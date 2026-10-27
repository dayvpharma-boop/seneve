import {useEffect,useState} from 'react';
import type {JourRecette} from '@/lib/habitudes-jour-recette';
import {chargerDetailsLectures} from '@/lib/habitudes-lectures-api';
import {supabase} from '@/lib/supabase';

const CLES=['bible_matin','lecture_pro','predication','lecture_personnelle','bible_soir'];
const LIBELLES=[['Bible du matin','Morning Bible reading'],['Lecture professionnelle','Professional reading'],['Écoute d’une prédication','Sermon listening'],['Développement personnel','Personal growth'],['Bible du soir','Evening Bible reading']];
/** Total des dernières durées déclarées, pour les journées effectivement disponibles du bilan. */
export function DureesSemaineHabitudes({jours,langue}:{jours:JourRecette[];langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const groupes=jours.map(j=>({jour:j,lectures:j.activites.filter(a=>CLES.includes(a.habit_key??''))})).filter(g=>g.lectures.length);
 const cle=groupes.map(g=>[g.jour.userId,g.jour.date,...g.lectures.map(a=>a.occurrence.enrollment_id+':'+a.occurrence.occurrence_id)].join(':')).join('|');
 const [ouvert,setOuvert]=useState(false),[resultat,setResultat]=useState<{cle:string;totaux:number[];nombre:number}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 useEffect(()=>{if(!ouvert||!groupes.length)return;let actif=true;setErreur(false);setResultat(null);
  void (async()=>{
   if(groupes.length>7)throw Error('Semaine invalide');
   const ids=groupes.flatMap(g=>g.lectures.map(a=>a.occurrence.occurrence_id));if(new Set(ids).size!==ids.length)throw Error('Activités dupliquées');
   const lignes=await Promise.all(groupes.map(g=>chargerDetailsLectures({rpc:(nom,params)=>supabase.rpc(nom,params)},g.lectures[0]!.occurrence.enrollment_id,g.lectures.map(a=>a.occurrence.occurrence_id))));
   const totaux=CLES.map(c=>groupes.reduce((total,g,i)=>total+g.lectures.filter(a=>a.habit_key===c).reduce((s,a)=>s+(lignes[i]!.find(d=>d.activity_id===a.occurrence.occurrence_id)?.minutes??0),0),0));
   if(actif)setResultat({cle,totaux,nombre:lignes.reduce((n,l)=>n+l.length,0)});
  })().catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};
 },[ouvert,cle,tour]);
 if(!groupes.length)return null;
 return <div className="rounded-xl bg-hd-surface-container-low p-3 flex flex-col gap-2">
  <button type="button" aria-expanded={ouvert} className="min-h-[44px] text-hd-secondary font-hd-label-lg text-hd-label-lg" onClick={()=>setOuvert(v=>!v)}>{ouvert?l('Masquer mon temps de lecture','Hide my reading time'):l('Voir mon temps de lecture de la semaine','View my weekly reading time')}</button>
  {ouvert&&(erreur?<div><p role="alert">{l('Le total ne peut pas être vérifié. Aucune somme partielle n’est affichée.','The total cannot be verified. No incomplete total is shown.')}</p><button type="button" className="min-h-[44px] px-3" onClick={()=>setTour(n=>n+1)}>{l('Réessayer le total','Retry total')}</button></div>:resultat?.cle!==cle?<p role="status">{l('Vérification des durées de la semaine…','Checking weekly reading times…')}</p>:<>
   <p className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{resultat.totaux.reduce((a,b)=>a+b,0)} min · {l('temps déclaré','recorded time')}</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{groupes.length} {l('journée(s) disponible(s)','available day(s)')} · {resultat.nombre} {l('durée(s) renseignée(s)','recorded time(s)')}. {l('Les activités en partie sont incluses. Une durée absente ne signifie pas que tu n’as pas lu.','Partly completed activities are included. A missing time does not mean you did not read.')}</p>
   {resultat.nombre>0?<dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">{LIBELLES.map(([fr,english],i)=><div className="contents" key={CLES[i]}><dt className="font-hd-body-sm text-hd-body-sm">{en?english:fr}</dt><dd className="font-hd-label-md text-hd-label-md text-right">{resultat.totaux[i]} min</dd></div>)}</dl>:<p>{l('Aucune durée déclarée pour ces journées.','No recorded time for these days.')}</p>}
  </>)}
 </div>;
}
