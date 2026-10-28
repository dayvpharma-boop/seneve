import {useEffect,useState} from 'react';
import type {JourRecette} from '@/lib/habitudes-jour-recette';
import {chargerDetailsLectures,type DetailLecture} from '@/lib/habitudes-lectures-api';
import {supabase} from '@/lib/supabase';

/** Lecture privée à la demande ; aucun changement de progression. */
export function LecturesHistoriqueHabitudes({jour,langue}:{jour:JourRecette;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const lectures=jour.activites.filter(a=>['bible_matin','lecture_pro','predication','lecture_personnelle','bible_soir'].includes(a.habit_key??''));
 const cle=[jour.userId,jour.date,...lectures.map(a=>a.occurrence.enrollment_id+':'+a.occurrence.occurrence_id)].join(':');
 const [ouvert,setOuvert]=useState(false),[resultat,setResultat]=useState<{cle:string;lignes:DetailLecture[]}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 useEffect(()=>{if(!ouvert||!lectures.length)return;let actif=true;setResultat(null);setErreur(false);
  void chargerDetailsLectures({rpc:(nom,params)=>supabase.rpc(nom,params)},lectures[0]!.occurrence.enrollment_id,lectures.map(a=>a.occurrence.occurrence_id)).then(lignes=>{if(actif)setResultat({cle,lignes});}).catch(()=>{if(actif)setErreur(true);});
  return()=>{actif=false;};
 },[ouvert,cle,tour]);
 if(!lectures.length)return null;
 return <div className="px-3 pb-3 flex flex-col gap-2">
  <button type="button" aria-expanded={ouvert} className="min-h-[44px] rounded-xl px-3 bg-hd-surface-container text-hd-secondary" onClick={()=>setOuvert(v=>!v)}>{ouvert?l('Masquer les durées de lecture','Hide reading times'):l('Voir mes durées de lecture','View my reading times')}</button>
  {ouvert&&(erreur?<div><p role="alert">{l('Les durées ne peuvent pas être vérifiées.','Reading times cannot be verified.')}</p><button type="button" className="min-h-[44px] px-3" onClick={()=>setTour(n=>n+1)}>{l('Réessayer','Retry')}</button></div>:resultat?.cle!==cle?<p role="status">{l('Chargement des durées…','Loading reading times…')}</p>:<>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Durées déclarées pour cette journée · titres privés.','Recorded times for this day · private titles.')}</p>
   <ul>{lectures.map(a=>{const d=resultat.lignes.find(x=>x.activity_id===a.occurrence.occurrence_id);return <li key={a.occurrence.occurrence_id} className="py-2 border-b border-hd-outline-variant/40 last:border-0 min-w-0 [overflow-wrap:anywhere]"><p className="font-hd-label-md text-hd-label-md">{a.consigne}</p><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{d?`${d.minutes} min${d.titre?' · '+d.titre:''}`:l('Aucune durée déclarée','No recorded time')}</p></li>;})}</ul>
  </>)}
 </div>;
}
