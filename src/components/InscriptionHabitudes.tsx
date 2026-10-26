import {useRef,useState,type FormEvent} from 'react';
import {inscrireHabitudesGratuit,type DemandeInscription,type PlanningInscription,type ResultatInscription} from '@/lib/habitudes-inscription-api';
import {creneauxRespectentFrequence} from '@/lib/habitudes-creneaux';
import {SemaineAvantInscription} from '@/components/SemaineAvantInscription';
import './HorairesHabitudes.css';

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
 return <section className="rn-section hd-horaires"><h2>{l('Commencer mes 30 jours gratuits','Start my 30 free days')}</h2>
  <p>{l('Les 30 jours gratuits n’incluent pas de coach IA. Il est prévu dans les mois d’abonnement payants, selon les conditions de l’offre.','The 30 free days do not include an AI coach. It is planned for paid subscription months, under the offer’s terms.')}</p>
  <p>{l('Les 30 jours commencent dès la confirmation de ton inscription par le serveur. Cet accès gratuit est accordé une seule fois par participant. Aucun paiement automatique ne suit cette période.','The 30 days begin when the server confirms your enrollment. This free access is granted once per participant. No automatic payment follows this period.')}</p>
  {resultat?<div role="status">{'motif'in resultat?<p>{l('Ton accès gratuit a déjà été utilisé. Consulte tes accès pour retrouver ton parcours.','Your free access has already been used. Check your access page to find your journey.')}</p>:<>
   <p>{resultat.cree?l('Inscription confirmée. Tes horaires ont été enregistrés.','Enrollment confirmed. Your schedule has been saved.'):l('Une inscription existe déjà. Ses dates et ses horaires ont été conservés.','An enrollment already exists. Its dates and schedule have been preserved.')}</p>
   <p>{l('Fin de la période gratuite :','Free period ends:')} <time dateTime={resultat.fin_exclue}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:c.fuseau,dateStyle:'long',timeStyle:'short'}).format(new Date(resultat.fin_exclue))}</time> ({c.fuseau}).</p>
   <p>{l('Consulte tes accès pour vérifier l’état actuel du parcours.','Check your access page for the current journey status.')}</p>
  </>}<a className="oa-primary" href={`${import.meta.env.BASE_URL}acces?lang=${en?'en':'fr'}`}>{l('Consulter mes accès','View my access')}</a></div>:<form onSubmit={e=>void soumettre(e)}>
   <fieldset disabled={occupe||attente||refus}><legend>{l('Mes horaires','My schedule')} ({c.fuseau})</legend>
    {planning.map((h,i)=><details key={h.habit_key}><summary>{h.libelle}</summary>
     <p>{l(`Rendez-vous par semaine : ${frequence(i)}.`,`Weekly appointments: ${frequence(i)}.`)}</p>
     {h.creneaux.map((s,k)=><fieldset className="hd-horaire-creneau" key={s.creneau_id}><legend>{l(`${h.libelle} — créneau ${k+1}`,`${h.libelle} — slot ${k+1}`)}</legend>
      <label>{h.libelle} — {s.jours_iso.map(j=>jours[j-1]).join(', ')}<input type="time" required value={s.heure_locale} onChange={e=>modifier(i,h.creneaux.map((t,m)=>m===k?{...t,heure_locale:e.target.value}:t))}/></label>
      <div className="hd-horaire-jours">{jours.map((j,n)=><label key={j}><input type="checkbox" checked={s.jours_iso.includes(n+1)} onChange={e=>modifier(i,h.creneaux.map((t,m)=>m===k?{...t,jours_iso:e.target.checked?[...t.jours_iso,n+1].sort((a,b)=>a-b):t.jours_iso.filter(v=>v!==n+1)}:t))}/>{j}</label>)}</div>
      {h.creneaux.length>1&&<button type="button" className="oa-secondary" onClick={()=>modifier(i,h.creneaux.filter((_,n)=>n!==k))}>{l(`Retirer le créneau ${k+1}`,`Remove slot ${k+1}`)}</button>}
     </fieldset>)}
     {h.creneaux.length<Math.min(7,frequence(i))&&<button type="button" className="oa-secondary" onClick={()=>modifier(i,[...h.creneaux,{creneau_id:'c_'+crypto.randomUUID().replaceAll('-','').slice(0,16),heure_locale:'',jours_iso:[]}])}>{l('Ajouter un créneau','Add a time slot')}</button>}
    </details>)}
    <p>{l('Adapte les jours et les heures à ton rythme. Ces horaires n’activent aucun rappel.','Adjust days and times to your rhythm. These times do not enable reminders.')}</p>
    <SemaineAvantInscription planning={planning} frequences={Object.fromEntries(c.planning.map((h,i)=>[h.habit_key,frequence(i)]))} fuseau={c.fuseau} langue={c.langue}/>
    <label className="hd-inscription-accord"><input type="checkbox" checked={accord} onChange={e=>setAccord(e.target.checked)}/><span>{l('Je confirme mon inscription aux 30 jours gratuits à partir de maintenant.','I confirm my enrollment in the 30 free days starting now.')}</span></label>
   </fieldset>
   {erreur&&<p role="alert">{erreur}</p>}
   <button type="submit" className="oa-primary" disabled={!accord||occupe||refus}>{occupe?l('Vérification…','Checking…'):attente?l('Vérifier mon inscription','Verify my enrollment'):l('Commencer mes 30 jours gratuits','Start my 30 free days')}</button>
  </form>}
 </section>;
}
