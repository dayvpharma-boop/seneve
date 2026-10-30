import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {IconeHD} from './IconeHabitudes';
/** Choix de notification uniquement : aucune réalisation ni changement de progression. */
export function IgnorerRappelHabitude({enrollmentId,activityId,langue,dansCarte=false}:{enrollmentId:string;activityId:string;langue:string;dansCarte?:boolean}){
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
 // Dans la carte de l'activité (demande de Dr Justin du 30/10/2026) : en bas, séparé par un filet discret.
 return <div className={dansCarte?'mt-1 pt-1.5 border-t border-hd-outline-variant/50 text-hd-on-surface-variant font-hd-body-sm text-hd-body-sm flex flex-wrap items-center gap-x-2':'px-3 py-1 text-hd-on-surface-variant font-hd-body-sm text-hd-body-sm'}>
  {ignore===true?<p role="status" className={dansCarte?'flex items-center gap-1.5 min-h-[44px]':undefined}>{dansCarte&&<IconeHD nom="notifications_off" className="text-[16px] shrink-0"/>}{en?'Reminders skipped for today. This activity is not marked completed.':'Rappels ignorés pour aujourd’hui. L’activité n’est pas comptée comme réalisée.'}</p>
  :ignore===false?<button type="button" disabled={occupe} onClick={()=>void ignorer()} className={dansCarte?'min-h-[44px] flex items-center gap-1.5 underline underline-offset-4 disabled:opacity-50':'min-h-[44px] underline underline-offset-4 disabled:opacity-50'}>{dansCarte&&<IconeHD nom="notifications_off" className="text-[16px] shrink-0"/>}{occupe?(en?'Saving…':'Enregistrement…'):(en?'Skip reminders for today':'Ignorer les rappels pour aujourd’hui')}</button>:null}
  {erreur&&<p role="alert">{en?'The reminder setting could not be confirmed.':'Le choix du rappel n’a pas pu être confirmé.'} <button className="min-h-[44px] underline" onClick={()=>setTour(t=>t+1)}>{en?'Retry':'Réessayer'}</button></p>}
 </div>;
}
