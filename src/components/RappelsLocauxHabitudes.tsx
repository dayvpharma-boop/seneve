import {useEffect,useRef,useState} from 'react';
import {chargerHorairesHabitudes,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {HABITUDES_EXPORTABLES} from '@/lib/habitudes-calendrier-export';
import {preparerRappelsLocaux} from '@/lib/rappels-locaux-planning';
import {arreterRappelsLocaux,etatRappelsLocaux,ouvrirReglageAlarmes,programmerRappelsLocaux,rappelsLocauxDisponibles,ReglageAlarmesRequis,AutorisationRappelsRefusee} from '@/lib/rappels-locaux';
import {supabase} from '@/lib/supabase';

type Props={enrollmentId:string;participantId:string;dateLocale:string;finAcces:string;langue:string};
export function RappelsLocauxHabitudes(props:Props){
 const [ouvert,setOuvert]=useState(false);
 if(!rappelsLocauxDisponibles())return null;
 return <details className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md mx-hd-margin mb-hd-space-lg"
   onToggle={e=>setOuvert(e.currentTarget.open)}>
  <summary className="min-h-[48px] cursor-pointer font-hd-label-lg text-hd-label-lg">{props.langue==='en'?'Reminders without Internet':'Mes rappels sans Internet'}</summary>
  {ouvert&&<FormulaireLocal key={[props.enrollmentId,props.participantId,props.dateLocale,props.finAcces].join(':')} {...props}/>}
 </details>;
}
function FormulaireLocal({enrollmentId,participantId,dateLocale,finAcces,langue}:Props){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<ConfigurationHoraires|null>(null),[etat,setEtat]=useState<Awaited<ReturnType<typeof etatRappelsLocaux>>|null>(null);
 const [cles,setCles]=useState<string[]>(['priere_matin','priere_midi','priere_soir']);
 const [accord,setAccord]=useState(false),[busy,setBusy]=useState(false),[erreur,setErreur]=useState(''),[message,setMessage]=useState(''),[tour,setTour]=useState(0),[reglage,setReglage]=useState(false);
 const vivant=useRef(true),verrou=useRef(false);
 useEffect(()=>{vivant.current=true;return()=>{vivant.current=false;};},[]);
 useEffect(()=>{
  let actif=true;setData(null);setEtat(null);setErreur('');
  void Promise.all([chargerHorairesHabitudes(enrollmentId),etatRappelsLocaux()])
   .then(([d,e])=>{if(actif){setData(d);setEtat(e);}})
   .catch(()=>{if(actif)setErreur(l('Tes horaires ou les rappels du téléphone ne peuvent pas être vérifiés. Réessaie.','Your schedule or phone reminders could not be checked. Try again.'));});
  return()=>{actif=false;};
 },[enrollmentId,tour]);
 useEffect(()=>{const retour=()=>{if(document.visibilityState==='visible'){
   void etatRappelsLocaux().then(e=>{if(vivant.current)setEtat(e);}).catch(()=>{});
 }};document.addEventListener('visibilitychange',retour);return()=>document.removeEventListener('visibilitychange',retour);},[]);
 let plan:ReturnType<typeof preparerRappelsLocaux>|null=null,erreurPlan='';
 try{if(data&&cles.length)plan=preparerRappelsLocaux(data,participantId,dateLocale,cles,finAcces);}
 catch{erreurPlan=l('Actualise tes horaires et ton accès avant de programmer les rappels. Un horaire absent ou ambigu au changement d’heure doit être adapté.','Refresh your schedule and access before scheduling reminders. An ambiguous or missing time during a clock change must be adjusted.');}
 const modeles=data?.modeles.filter(m=>HABITUDES_EXPORTABLES.some(k=>k===m.habit_key))??[];
 async function action(type:'activer'|'arreter'|'reglages'){
  if(verrou.current)return;verrou.current=true;setBusy(true);setErreur('');setMessage('');setReglage(false);
  try{
   if(type==='arreter'){
    await arreterRappelsLocaux();if(vivant.current)setMessage(l('Les rappels locaux de SÉNEVÉ ont été arrêtés sur ce téléphone.','SÉNEVÉ local reminders have been stopped on this phone.'));
   }else if(type==='reglages'){
    await ouvrirReglageAlarmes();
   }else{
    if(!accord||!plan?.rappels.length)throw Error('Sélection requise');
    const s=await supabase.auth.getSession();
    if(s.error||!s.data.session||!vivant.current)throw Error('Session à vérifier');
    const resultat=await programmerRappelsLocaux(plan,s.data.session.user.id,enrollmentId,()=>vivant.current);
    if(vivant.current)setMessage(l(`${resultat.nombre} rappels confirmés par le téléphone. Dernier rendez-vous : ${new Date(resultat.jusqua).toLocaleString('fr-FR',{timeZone:data!.fuseau})} (${data!.fuseau}).`,`${resultat.nombre} reminders confirmed by the phone. Last appointment: ${new Date(resultat.jusqua).toLocaleString('en-GB',{timeZone:data!.fuseau})} (${data!.fuseau}).`));
   }
  }catch(e){
   if(vivant.current){
    if(e instanceof ReglageAlarmesRequis){setReglage(true);setErreur(l('Android : autorise « Alarmes et rappels » pour SÉNEVÉ, puis reviens et appuie de nouveau sur Programmer.','Android: allow “Alarms & reminders” for SÉNEVÉ, return, then tap Schedule again.'));}
    else if(e instanceof AutorisationRappelsRefusee)setErreur(l('Les notifications ne sont pas autorisées. Vérifie Réglages → Notifications → SÉNEVÉ sur iPhone, ou Paramètres → Applications → SÉNEVÉ → Notifications sur Android.','Notifications are not allowed. Check Settings → Notifications → SÉNEVÉ on iPhone, or Settings → Apps → SÉNEVÉ → Notifications on Android.'));
    else setErreur(l('L’opération n’est pas confirmée. Actualise et vérifie les rappels dans les réglages du téléphone avant de réessayer.','The operation is not confirmed. Refresh and check reminders in your phone settings before retrying.'));
   }
  }finally{
   try{const e=await etatRappelsLocaux();if(vivant.current)setEtat(e);}catch{if(vivant.current)setEtat(null);}
   verrou.current=false;if(vivant.current)setBusy(false);
  }
 }
 return <div className="flex flex-col gap-3 text-hd-body-sm font-hd-body-sm pt-2">
  <p>{l('Après ton autorisation, SÉNEVÉ programme ces rendez-vous sur ce téléphone. Ils peuvent se déclencher sans Internet et lorsque l’application est fermée. Le son et l’affichage dépendent des réglages du téléphone.','With your permission, SÉNEVÉ schedules these appointments on this phone. They can fire without Internet and with the app closed. Sound and display depend on phone settings.')}</p>
  {etat&&<p>{etat.nombre} {l('rappels en attente sur ce téléphone.','pending reminders on this phone.')} {!etat.autorise&&l('Les notifications ne sont pas autorisées.','Notifications are not allowed.')} {etat.autorise&&!etat.exact&&l('Les alarmes exactes doivent être autorisées sur Android.','Exact alarms must be allowed on Android.')}</p>}
  {!data&&!erreur&&<p role="status">{l('Chargement des horaires…','Loading schedule…')}</p>}
  {data&&<>
   <p>{l('Fuseau des horaires :','Schedule time zone:')} {data.fuseau}.</p>
   <fieldset disabled={busy} className="flex flex-col gap-1"><legend>{l('Rendez-vous à programmer','Appointments to schedule')}</legend>
    {modeles.map(m=><label key={m.habit_key} className="flex items-center gap-2 min-h-[44px]"><input type="checkbox" checked={cles.includes(m.habit_key)} onChange={e=>{setCles(k=>e.target.checked?[...k,m.habit_key]:k.filter(x=>x!==m.habit_key));setMessage('');}}/>{m.libelle}</label>)}
   </fieldset>
   {plan&&<p>{plan.rappels.length} {l('alertes proposées sur les sept prochains jours, dans la limite de ton accès actuel. Les rendez-vous à la même heure sont regroupés.','proposed alerts over the next seven days, within your current access. Appointments at the same time are grouped.')}</p>}
   {plan?.limiteAtteinte&&<p>{l('Seules les 60 premières alertes seront programmées. Reviens avant le dernier rappel pour renouveler la période.','Only the first 60 alerts will be scheduled. Return before the last reminder to renew the period.')}</p>}
   <label className="flex gap-2 items-start min-h-[44px]"><input type="checkbox" checked={accord} disabled={busy} onChange={e=>setAccord(e.target.checked)}/>{l('Pour ces rendez-vous, j’ai désactivé les autres rappels du site et retiré les copies du calendrier, ou je n’en utilise pas.','For these appointments, I disabled other website reminders and removed calendar copies, or I do not use them.')}</label>
   <button type="button" className="min-h-[48px] rounded-xl px-3 bg-hd-secondary text-hd-on-secondary disabled:opacity-50" disabled={busy||!accord||!plan?.rappels.length||!!erreurPlan} onClick={()=>void action('activer')}>{l('Autoriser et programmer sur ce téléphone','Allow and schedule on this phone')}</button>
  </>}
  {erreurPlan&&<p role="alert">{erreurPlan}</p>}{erreur&&<p role="alert">{erreur}</p>}{message&&<p role="status">{message}</p>}
  {reglage&&<button type="button" disabled={busy} className="min-h-[48px] underline" onClick={()=>void action('reglages')}>{l('Ouvrir « Alarmes et rappels »','Open “Alarms & reminders”')}</button>}
  <button type="button" disabled={busy} className="min-h-[44px] underline" onClick={()=>{setMessage('');setTour(t=>t+1);}}>{l('Actualiser les horaires et l’état des rappels','Refresh schedule and reminder status')}</button>
  <button type="button" disabled={busy} className="min-h-[44px] underline" onClick={()=>void action('arreter')}>{l('Arrêter les rappels locaux de ce téléphone','Stop local reminders on this phone')}</button>
  <p>{l('Programmation limitée : reviens pour renouveler les prochains jours et appuie de nouveau sur Programmer après un changement d’horaire. La nouvelle programmation remplace la précédente. La déconnexion ou un changement de compte arrête les rappels locaux.','Scheduling is limited: return to renew upcoming days and tap Schedule again after changing times. A new schedule replaces the previous one. Signing out or changing accounts stops local reminders.')}</p>
  <p>{l('Une alerte ne déclare aucune activité comme faite. Pour tester : programme un prochain rendez-vous, ferme l’application puis coupe Internet.','An alert does not mark any activity as completed. To test: schedule an upcoming appointment, close the app, then turn off Internet.')}</p>
 </div>;
}

