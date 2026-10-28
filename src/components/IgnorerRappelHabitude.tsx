import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
/** Choix de notification uniquement : aucune réalisation ni changement de progression. */
export function IgnorerRappelHabitude({enrollmentId,activityId,langue}:{enrollmentId:string;activityId:string;langue:string}){
 const [ignore,setIgnore]=useState<boolean|null>(null),[erreur,setErreur]=useState(false),[occupe,setOccupe]=useState(false),[tour,setTour]=useState(0);
 const verrou=useRef(false),en=langue==='en';
 useEffect(()=>{let vivant=true;setIgnore(null);setErreur(false);
  void supabase.from('hd_reminder_skips').select('activity_id').eq('enrollment_id',enrollmentId).eq('activity_id',activityId).then(({data,error})=>{
   if(!vivant)return;if(error)setErreur(true);else setIgnore(!!data?.length);
  });return()=>{vivant=false;};
 },[enrollmentId,activityId,tour]);
 async function ignorer(){if(verrou.current)return;verrou.current=true;setOccupe(true);setErreur(false);
  try{const {data,error}=await supabase.rpc('hd_ignore_reminder',{p_enrollment_id:enrollmentId,p_activity_id:activityId});if(error||data!==true)throw Error();setIgnore(true);}
  catch{setErreur(true);}finally{verrou.current=false;setOccupe(false);}
 }
 return <div className="px-3 py-1 text-hd-on-surface-variant font-hd-body-sm text-hd-body-sm">
  {ignore===true?<p role="status">{en?'Reminders skipped for today. This activity is not marked completed.':'Rappels ignorés pour aujourd’hui. L’activité n’est pas comptée comme réalisée.'}</p>
  :ignore===false?<button type="button" disabled={occupe} onClick={()=>void ignorer()} className="min-h-[44px] underline underline-offset-4 disabled:opacity-50">{occupe?(en?'Saving…':'Enregistrement…'):(en?'Skip reminders for today':'Ignorer les rappels pour aujourd’hui')}</button>:null}
  {erreur&&<p role="alert">{en?'The reminder setting could not be confirmed.':'Le choix du rappel n’a pas pu être confirmé.'} <button className="min-h-[44px] underline" onClick={()=>setTour(t=>t+1)}>{en?'Retry':'Réessayer'}</button></p>}
 </div>;
}
