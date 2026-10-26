import {useRef,useState,type FormEvent} from 'react';
import {inscrireHabitudesGratuit,type DemandeInscription,type PlanningInscription,type ResultatInscription} from '@/lib/habitudes-inscription-api';
import {creneauxRespectentFrequence} from '@/lib/habitudes-creneaux';
import {SemaineAvantInscription} from '@/components/SemaineAvantInscription';
import './HorairesHabitudes.css';
import {IconeHD} from './IconeHabitudes';

// Le parent doit fournir le catalogue autorisé par le serveur, jamais une offre de démonstration.
// La clé inclut le compte pour ne pas réutiliser un formulaire après un changement de session.
export type ConfigurationInscriptionHabitudes={compteId:string;programmeId:string;version:number;langue:string;offreId:string;fuseau:string;planning:PlanningInscription};
export function InscriptionHabitudes({configuration}:{configuration:ConfigurationInscriptionHabitudes}){
 const c=configuration;
 return <FormulaireInscription key={JSON.stringify([c.compteId,c.programmeId,c.version,c.langue,c.offreId,c.fuseau,c.planning])} configuration={c}/>;
}
function FormulaireInscription({configuration:c}:{configuration:ConfigurationInscriptionHabitudes}){
 const en=c.langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [planning,setPlanning]=useState(()=>c.planning.map(h=>({...h,creneaux:h.creneaux.map(s=>({...s,jours_iso:[...s.jours_iso]}))})));
 const [accord,setAccord]=useState(false),[occupe,setOccupe]=useState(false),[attente,setAttente]=useState(false),[erreur,setErreur]=useState(''),[resultat,setResultat]=useState<ResultatInscription|null>(null),[refus,setRefus]=useState(false);
 const verrou=useRef(false),demande=useRef<DemandeInscription|null>(null);
 const jours=en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
 const frequence=(i:number)=>c.planning[i]!.creneaux.reduce((n,s)=>n+s.jours_iso.length,0);
 function modifier(i:number,creneaux:PlanningInscription[number]['creneaux']){setAccord(false);setErreur('');setPlanning(p=>p.map((h,n)=>n===i?{...h,creneaux}:h));}
 async function soumettre(e:FormEvent){
  e.preventDefault();if(verrou.current||resultat||refus||!accord)return;
  if(!demande.current){
   if(!planning.length||planning.some((h,i)=>!creneauxRespectentFrequence(h.habit_key,h.creneaux,frequence(i)))){setErreur(l('Vérifie les jours et les heures : conserve la fréquence proposée pour chaque habitude.','Check days and times: keep the suggested frequency for each habit.'));return;}
   demande.current={p_programme_id:c.programmeId,p_version:c.version,p_langue:c.langue,p_offre_id:c.offreId,p_confirmation:true,p_horaires:planning.map(h=>({habit_key:h.habit_key,creneaux:h.creneaux.map(s=>({...s,jours_iso:[...s.jours_iso]}))}))};
  }
  verrou.current=true;setOccupe(true);setAttente(true);setErreur('');
  try{setResultat(await inscrireHabitudesGratuit(demande.current));}
  catch(e){const code=e&&typeof e==='object'&&'code'in e?String(e.code):'';
   if(code==='42501'||code==='22023'){setRefus(true);setErreur(l('L’inscription a été refusée. Recharge la page pour vérifier ton compte et la disponibilité du parcours.','Enrollment was declined. Reload the page to check your account and journey availability.'));}
   else setErreur(l('Inscription non confirmée. Réessaie pour vérifier le résultat de la même demande.','Enrollment is not confirmed. Retry to verify the result of the same request.'));
  }finally{verrou.current=false;setOccupe(false);}
 }
 const priere=(k:string)=>k.startsWith('priere_');
 const sousTitre:Record<string,[string,string]>={priere_matin:['Temps réservé','Set-apart time'],priere_midi:['Pause sanctifiée','Midday pause'],priere_soir:['Repose en Dieu','Rest in God']};
 const culte=(k:string)=>k.startsWith('culte_');
 const resume=(h:PlanningInscription[number])=>h.creneaux.map(s=>s.heure_locale||'--:--').join(' · ');
 const carteHabitude=(h:PlanningInscription[number],i:number)=>{const fort=priere(h.habit_key);
  return <details key={h.habit_key} className={`group w-full bg-hd-surface-container-lowest rounded-xl ${fort?'shadow-[0_2px_8px_rgba(117,91,0,0.06)] relative overflow-hidden':'shadow-[0_1px_4px_rgba(29,28,19,0.03)]'}`}>
   {fort&&<span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-hd-secondary rounded-l-xl"/>}
   <summary className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer p-3 flex items-center justify-between gap-3 min-h-[56px] ${fort?'pl-4.5':''}`}>
    <span className="flex items-center gap-3 min-w-0">
     <span className={`px-2.5 py-1.5 rounded-lg ${fort?'bg-hd-surface-container text-hd-secondary':'bg-hd-surface-container-low text-hd-on-surface'} font-hd-label-md text-hd-label-md tracking-wide flex items-center gap-1.5 shrink-0`}><span className={fort?'font-semibold':''}>{culte(h.habit_key)?h.creneaux.map(s=>s.jours_iso.map(j=>jours[j-1]).join(', ')).join(' · '):resume(h)}</span><IconeHD nom="edit" className={`text-[14px] ${fort?'text-hd-secondary':'text-hd-outline'}`}/></span>
     <span className="flex flex-col min-w-0"><span className={`font-hd-label-lg text-hd-label-lg text-hd-on-surface truncate ${fort?'font-medium':''}`}>{h.libelle}</span>{culte(h.habit_key)?<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{resume(h)}</span>:sousTitre[h.habit_key]&&<span className="font-hd-label-sm text-[10px] text-hd-secondary tracking-wider uppercase">{l(...sousTitre[h.habit_key]!)}</span>}</span>
    </span>
    <IconeHD nom="chevron_right" className="text-[20px] text-hd-outline transition-transform group-open:rotate-90"/>
   </summary>
   <div className="px-3 pb-3 flex flex-col gap-2.5">
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l(`Rendez-vous par semaine : ${frequence(i)}.`,`Weekly appointments: ${frequence(i)}.`)}</p>
    {h.creneaux.map((s,k)=><fieldset className="border border-hd-outline-variant/60 rounded-xl p-3 flex flex-col gap-2.5 min-w-0" key={s.creneau_id}><legend className="px-1 font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{l(`${h.libelle} — créneau ${k+1}`,`${h.libelle} — slot ${k+1}`)}</legend>
     <label className="flex flex-col gap-1.5 font-hd-label-md text-hd-label-md text-hd-on-surface-variant">{h.libelle} — {s.jours_iso.map(j=>jours[j-1]).join(', ')}<input type="time" required value={s.heure_locale} onChange={e=>modifier(i,h.creneaux.map((t,m)=>m===k?{...t,heure_locale:e.target.value}:t))} className="min-h-[44px] w-full rounded-lg bg-hd-surface-container-low px-3 text-hd-on-surface font-hd-label-lg text-hd-label-lg font-semibold tracking-wide border border-hd-outline-variant/60 focus:outline-2 focus:outline-hd-secondary"/></label>
     <div className="flex flex-wrap gap-1.5">{jours.map((j,n)=><label key={j} className="relative cursor-pointer"><input type="checkbox" className="peer sr-only" checked={s.jours_iso.includes(n+1)} onChange={e=>modifier(i,h.creneaux.map((t,m)=>m===k?{...t,jours_iso:e.target.checked?[...t.jours_iso,n+1].sort((a,b)=>a-b):t.jours_iso.filter(v=>v!==n+1)}:t))}/><span className="flex items-center justify-center min-w-[44px] min-h-[40px] px-2 rounded-lg border border-hd-outline-variant/60 bg-hd-surface-container-lowest text-hd-on-surface-variant font-hd-label-md text-hd-label-md peer-checked:bg-hd-secondary-container/40 peer-checked:border-hd-secondary peer-checked:text-hd-secondary peer-focus-visible:outline-2 peer-focus-visible:outline-hd-secondary">{j}</span></label>)}</div>
     {h.creneaux.length>1&&<button type="button" className="self-start min-h-[44px] px-3 rounded-lg bg-hd-surface-container text-hd-on-surface font-hd-label-md text-hd-label-md" onClick={()=>modifier(i,h.creneaux.filter((_,n)=>n!==k))}>{l(`Retirer le créneau ${k+1}`,`Remove slot ${k+1}`)}</button>}
    </fieldset>)}
    {h.creneaux.length<Math.min(7,frequence(i))&&<button type="button" className="self-start min-h-[44px] px-3 rounded-lg bg-hd-surface-container-low text-hd-secondary font-hd-label-md text-hd-label-md flex items-center gap-1.5" onClick={()=>modifier(i,[...h.creneaux,{creneau_id:'c_'+crypto.randomUUID().replaceAll('-','').slice(0,16),heure_locale:'',jours_iso:[]}])}><IconeHD nom="schedule" className="text-[16px]"/>{l('Ajouter un créneau','Add a time slot')}</button>}
   </div>
  </details>;};
 const bouton='w-full min-h-[52px] bg-hd-secondary hover:bg-hd-on-secondary-fixed-variant text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-55';
 return <section className="hd-inscription-stitch flex flex-col w-full">
  <div className="flex flex-col mb-5">
   <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-hd-surface-container-high text-hd-secondary mb-2"><IconeHD nom="schedule" className="text-[14px]"/><span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider">{l('Rythme quotidien','Daily rhythm')}</span></div>
   <h2 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface tracking-tight mb-1.5">{l('Commencer mes 30 jours gratuits','Start my 30 free days')}</h2>
   <div className="flex items-start gap-1.5 text-hd-on-surface-variant font-hd-body-sm text-hd-body-sm"><IconeHD nom="public" className="text-[16px] text-hd-outline mt-0.5"/><span>{l(`Tes horaires sont proposés par défaut et modifiables. Fuseau : ${c.fuseau}.`,`Your times are suggested and can be changed. Time zone: ${c.fuseau}.`)}</span></div>
  </div>
  <div className="p-3.5 mb-4 rounded-xl bg-hd-surface-container-low flex items-start gap-3"><IconeHD nom="spa" className="text-hd-secondary text-[20px] mt-0.5 shrink-0"/><div className="flex flex-col gap-2">
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant italic leading-relaxed">{l('Les 30 jours gratuits n’incluent pas de coach IA. Il est prévu dans les mois d’abonnement payants, selon les conditions de l’offre.','The 30 free days do not include an AI coach. It is planned for paid subscription months, under the offer’s terms.')}</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Les 30 jours commencent dès la confirmation de ton inscription par le serveur. Cet accès gratuit est accordé une seule fois par participant. Aucun paiement automatique ne suit cette période.','The 30 days begin when the server confirms your enrollment. This free access is granted once per participant. No automatic payment follows this period.')}</p>
  </div></div>
  {resultat?<div role="status" className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-sm">{'motif'in resultat?<p className="font-hd-body-md text-hd-body-md">{l('Ton accès gratuit a déjà été utilisé. Consulte tes accès pour retrouver ton parcours.','Your free access has already been used. Check your access page to find your journey.')}</p>:<>
   <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-hd-secondary-container/40 text-hd-secondary flex items-center justify-center"><IconeHD nom="check_circle" className="text-[20px]"/></span><p className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{resultat.cree?l('Inscription confirmée. Tes horaires ont été enregistrés.','Enrollment confirmed. Your schedule has been saved.'):l('Une inscription existe déjà. Ses dates et ses horaires ont été conservés.','An enrollment already exists. Its dates and schedule have been preserved.')}</p></div>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Fin de la période gratuite :','Free period ends:')} <time dateTime={resultat.fin_exclue}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:c.fuseau,dateStyle:'long',timeStyle:'short'}).format(new Date(resultat.fin_exclue))}</time> ({c.fuseau}).</p>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Consulte tes accès pour vérifier l’état actuel du parcours.','Check your access page for the current journey status.')}</p>
  </>}<a className={bouton} href={`${import.meta.env.BASE_URL}acces?lang=${en?'en':'fr'}`}>{l('Consulter mes accès','View my access')}<IconeHD nom="arrow_forward" className="text-[20px]"/></a></div>:<form onSubmit={e=>void soumettre(e)} className="flex flex-col">
   <fieldset disabled={occupe||attente||refus} className="min-w-0 border-0 p-0 m-0 flex flex-col disabled:opacity-70"><legend className="mb-2 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant uppercase tracking-wider">{l('Mes horaires','My schedule')} ({c.fuseau})</legend>
    <div className="flex flex-col gap-2.5 mb-5">{planning.map((h,i)=>culte(h.habit_key)?null:carteHabitude(h,i))}</div>
    {planning.some(h=>culte(h.habit_key))&&<div className="bg-hd-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(29,28,19,0.04)] mb-5">
     <div className="px-4 py-3 bg-hd-surface-container-low flex items-center gap-2"><IconeHD nom="church" className="text-[20px] text-hd-secondary"/><h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Mes cultes','My worship services')}</h3></div>
     <div className="p-3 flex flex-col gap-2.5">{planning.map((h,i)=>culte(h.habit_key)?carteHabitude(h,i):null)}
      <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-center gap-1.5 px-1"><IconeHD nom="info" className="text-[16px] text-hd-outline"/>{l('Selon les horaires de ton église.','Following your church’s times.')}</p></div>
    </div>}
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant flex items-start gap-1.5 mb-4"><IconeHD nom="notifications_off" className="text-[16px] text-hd-outline mt-0.5"/>{l('Adapte les jours et les heures à ton rythme. Ces horaires n’activent aucun rappel.','Adjust days and times to your rhythm. These times do not enable reminders.')}</p>
    <div className="hd-classique mb-4"><SemaineAvantInscription planning={planning} frequences={Object.fromEntries(c.planning.map((h,i)=>[h.habit_key,frequence(i)]))} fuseau={c.fuseau} langue={c.langue}/></div>
    <label className="flex items-start gap-3 p-3.5 rounded-xl bg-hd-secondary-container/30 cursor-pointer min-h-[44px]"><input type="checkbox" className="mt-0.5 w-5 h-5 accent-hd-secondary shrink-0" checked={accord} onChange={e=>setAccord(e.target.checked)}/><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface">{l('Je confirme mon inscription aux 30 jours gratuits à partir de maintenant.','I confirm my enrollment in the 30 free days starting now.')}</span></label>
   </fieldset>
   {erreur&&<p role="alert" className="mt-3 font-hd-body-sm text-hd-body-sm text-hd-error">{erreur}</p>}
   <div className="sticky bottom-0 -mx-hd-margin px-hd-margin pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] mt-4 bg-gradient-to-t from-hd-surface via-hd-surface/95 to-transparent">
    <button type="submit" className={bouton} disabled={!accord||occupe||refus}>{occupe?l('Vérification…','Checking…'):attente?l('Vérifier mon inscription','Verify my enrollment'):l('Commencer mes 30 jours gratuits','Start my 30 free days')}<IconeHD nom="arrow_forward" className="text-[20px]"/></button>
   </div>
  </form>}
 </section>;
}
