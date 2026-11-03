import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {chargerHorairesHabitudes,enregistrerHorairesHabitudes,reglerRythmeDime,type ConfigurationHoraires,type CreneauPersonnel,type DemandeHoraires} from '@/lib/habitudes-horaires-api';
import type {ModelePlanningHabitude,RythmeDime} from '@/lib/habitudes-planning';
import {ChoixRythmeDime} from './ChoixRythmeDime';
import {creneauxDepuisJours,heuresDifferentes,heuresParJour} from '@/lib/habitudes-heures-jour';
import {creneauxRespectentFrequence} from '@/lib/habitudes-creneaux';
import './HorairesHabitudes.css';

export function HorairesHabitudes({enrollmentId,langue}:{enrollmentId:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<ConfigurationHoraires|null>(null),[erreur,setErreur]=useState(false),[annonce,setAnnonce]=useState('');
 // Confirmation affichée près du bouton de l'habitude enregistrée (demande de Dr Justin, 03/11/2026).
 const [confirmation,setConfirmation]=useState<{habit_key:string;texte:string}|null>(null);
 const sequence=useRef(0);
 const charger=useCallback(async()=>{const n=++sequence.current;setErreur(false);try{const d=await chargerHorairesHabitudes(enrollmentId);if(sequence.current===n)setData(d);}catch{if(sequence.current===n){setData(null);setErreur(true);}}},[enrollmentId]);
 useEffect(()=>{setData(null);setAnnonce('');void charger();return()=>{sequence.current++;};},[charger]);
 return <section className="rn-section hd-horaires"><h2>{l('Mes horaires d’habitudes','My habit schedule')}</h2>
  {annonce&&<p role="status">{annonce}</p>}
  {erreur?<><p role="alert">{l('Tes horaires ne peuvent pas être vérifiés. Vérifie ta connexion et ton accès au parcours.','Your schedule cannot be verified. Check your connection and journey access.')}</p><button type="button" className="oa-secondary" onClick={()=>void charger()}>{l('Réessayer','Try again')}</button></>:!data?<p role="status">{l('Chargement des horaires…','Loading schedule…')}</p>:<>
   <p>{l('Les modifications s’appliquent le','Changes take effect on')} <time dateTime={data.modifications_a_partir_du}>{data.modifications_a_partir_du}</time> ({data.fuseau}). {l('Ta journée en cours et ton historique sont conservés. Ces horaires n’activent aucun rappel.','Your current day and history are preserved. These times do not enable reminders.')}</p>
   {data.modeles.map(modele=><FormulaireHoraire key={`${modele.habit_key}:${data.revisions.find(r=>r.habit_key===modele.habit_key)?.revision??'initial'}`} modele={modele} data={data} langue={langue} confirmation={confirmation?.habit_key===modele.habit_key?confirmation.texte:''} onEnregistre={texte=>{setConfirmation({habit_key:modele.habit_key,texte});void charger();}}/>)}
   {data.modeles.some(m=>m.habit_key==='dime')&&<RythmeDimeHoraires key={JSON.stringify(data.dime)} actuel={data.dime??{rythme:'semaine'}} langue={langue} onEnregistre={()=>{setAnnonce(l('Rythme de la dîme enregistré.','Tithe rhythm saved.'));void charger();}}/>}
  </>}
 </section>;
}
function FormulaireHoraire({modele,data,langue,confirmation,onEnregistre}:{modele:ModelePlanningHabitude;data:ConfigurationHoraires;langue:string;confirmation:string;onEnregistre:(texte:string)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const personnels=data.horaires.filter(h=>h.habit_key===modele.habit_key&&h.valide_du<=data.modifications_a_partir_du&&(h.valide_au===null||h.valide_au>=data.modifications_a_partir_du));
 const [creneaux,setCreneaux]=useState<CreneauPersonnel[]>(()=>personnels.length?personnels.map(h=>({creneau_id:h.creneau_id,heure_locale:h.heure_locale.slice(0,5),jours_iso:[...h.jours_iso]})):[{creneau_id:'principal',heure_locale:modele.heure_proposee?.slice(0,5)??'',jours_iso:[...modele.jours_iso]}]);
 const [occupe,setOccupe]=useState(false),[erreur,setErreur]=useState(''),[enAttente,setEnAttente]=useState(false);
 const verrou=useRef(false),demande=useRef<DemandeHoraires|null>(null);
 const jours=en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
 async function soumettre(e:FormEvent){e.preventDefault();if(verrou.current)return;setErreur('');
  if(!demande.current){
   if(!creneauxRespectentFrequence(modele.habit_key,creneaux,modele.jours_iso.length)){setErreur(l('Vérifie les jours et les heures : conserve la fréquence proposée pour cette habitude.','Check the days and times: keep the suggested frequency for this habit.'));return;}
   demande.current={p_enrollment_id:data.enrollment_id,p_habit_key:modele.habit_key,p_creneaux:creneaux.map(c=>({...c,jours_iso:[...c.jours_iso]})),p_effectif_du:data.modifications_a_partir_du,p_revision_attendue:data.revisions.find(r=>r.habit_key===modele.habit_key)?.revision??null,p_client_event_id:crypto.randomUUID()};setEnAttente(true);
  }
  verrou.current=true;setOccupe(true);
  try{
   const envoye=demande.current;await enregistrerHorairesHabitudes(envoye);demande.current=null;setEnAttente(false);
   const date=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(envoye.p_effectif_du+'T12:00:00Z'));
   const detail=envoye.p_creneaux.map(c=>`${c.jours_iso.map(j=>jours[j-1]).join(', ')} ${l('à','at')} ${c.heure_locale}`).join(' · ');
   onEnregistre(l(`Enregistré : ${detail}. Appliqué à partir du ${date}.`,`Saved: ${detail}. Applies from ${date}.`));
  }
  catch(e){const code=e&&typeof e==='object'&&'code'in e?String(e.code):'';
   if(code==='40001'||code==='42501'||code==='22023'){demande.current=null;setEnAttente(false);setErreur(l('Le planning ou ton accès a changé. Recharge les réglages avant de modifier les horaires.','The schedule or your access has changed. Reload settings before editing the times.'));}
   else setErreur(l('Enregistrement non confirmé. Réessaie la même demande avant de modifier les horaires.','Save not confirmed. Retry the same request before editing the times.'));
  }finally{verrou.current=false;setOccupe(false);}
 }
 const changer=(i:number,p:Partial<CreneauPersonnel>)=>setCreneaux(cs=>cs.map((c,k)=>k===i?{...c,...p}:c));
 return <details open={confirmation?true:undefined}><summary>{modele.libelle}</summary><form onSubmit={e=>void soumettre(e)}>
  {modele.habit_key==='dime'&&<p>{l('Choisis un ou plusieurs jours, par exemple tes jours de culte.','Choose one or more days, for example your worship days.')}</p>}
  {!modele.habit_key.startsWith('culte_')?<HeuresParJourHabitude modele={modele} creneaux={creneaux} onChange={setCreneaux} langue={langue} desactive={occupe||enAttente}/>:
  <fieldset disabled={occupe||enAttente}><legend>{l('Créneaux de la semaine','Weekly time slots')}</legend>
   {creneaux.map((c,i)=><div className="hd-horaire-creneau" key={c.creneau_id}><label>{l(`Heure du créneau ${i+1}`,`Time for slot ${i+1}`)}<input type="time" required value={c.heure_locale} onChange={e=>changer(i,{heure_locale:e.target.value})}/></label>
    <fieldset><legend>{l(`Jours du créneau ${i+1}`,`Days for slot ${i+1}`)}</legend><div className="hd-horaire-jours">{jours.map((j,k)=><label key={j}><input type="checkbox" checked={c.jours_iso.includes(k+1)} onChange={e=>changer(i,{jours_iso:e.target.checked?[...c.jours_iso,k+1].sort((a,b)=>a-b):c.jours_iso.filter(n=>n!==k+1)})}/>{j}</label>)}</div></fieldset>
    {creneaux.length>1&&<button type="button" className="oa-secondary" onClick={()=>setCreneaux(cs=>cs.filter((_,k)=>k!==i))}>{l(`Retirer le créneau ${i+1}`,`Remove slot ${i+1}`)}</button>}
   </div>)}
   {creneaux.length<Math.min(7,modele.jours_iso.length)&&<button type="button" className="oa-secondary" onClick={()=>setCreneaux(cs=>[...cs,{creneau_id:'c_'+crypto.randomUUID().replaceAll('-','').slice(0,16),heure_locale:'',jours_iso:[]}])}>{l('Ajouter un créneau','Add a time slot')}</button>}
  </fieldset>}
  {erreur&&<p role="alert">{erreur}</p>}<button type="submit" className="oa-primary" disabled={occupe}>{occupe?l('Enregistrement…','Saving…'):enAttente?l('Réessayer l’enregistrement','Retry saving'):l('Enregistrer pour demain','Save for tomorrow')}</button>
  {confirmation&&<p role="status" className="hd-horaire-confirme">✓ {confirmation}</p>}
 </form></details>;
}
/** Dîme (03/11/2026) : commerçant chaque semaine (jour et heure ci-dessus), salarié une fois par mois. */
function RythmeDimeHoraires({actuel,langue,onEnregistre}:{actuel:RythmeDime;langue:string;onEnregistre:()=>void}){
 const l=(fr:string,english:string)=>langue==='en'?english:fr;
 const [valeur,setValeur]=useState<RythmeDime>(actuel),[occupe,setOccupe]=useState(false),[erreur,setErreur]=useState('');
 const change=JSON.stringify(valeur)!==JSON.stringify(actuel);
 async function enregistrer(e:FormEvent){e.preventDefault();if(occupe||!change)return;setOccupe(true);setErreur('');
  try{await reglerRythmeDime(valeur);onEnregistre();}catch{setErreur(l('Rythme non enregistré. Vérifie ta connexion et réessaie.','Rhythm not saved. Check your connection and try again.'));}finally{setOccupe(false);}
 }
 return <details><summary>{l('Rythme de la dîme','Tithe rhythm')}</summary><form onSubmit={e=>void enregistrer(e)}>
  <ChoixRythmeDime langue={langue} valeur={valeur} onChange={setValeur} desactive={occupe}/>
  <p>{l('Le jour de la semaine et l’heure se règlent dans « Dîme » ci-dessus ; pour un salaire, seule l’heure est utilisée.','The weekday and time are set in “Tithe” above; for a salary, only the time is used.')}</p>
  {erreur&&<p role="alert">{erreur}</p>}<button type="submit" className="oa-primary" disabled={occupe||!change}>{occupe?l('Enregistrement…','Saving…'):l('Enregistrer le rythme','Save the rhythm')}</button>
 </form></details>;
}
/** Habitudes hors cultes (03/11/2026) : une heure commune, ou une heure différente pour chaque jour.
 * Les jours ne se choisissent que pour la dîme ; les autres habitudes gardent les jours de leur modèle. */
function HeuresParJourHabitude({modele,creneaux,onChange,langue,desactive}:{modele:ModelePlanningHabitude;creneaux:CreneauPersonnel[];onChange:(c:CreneauPersonnel[])=>void;langue:string;desactive:boolean}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const noms=en?['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
 const courts=en?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
 const heures=heuresParJour(creneaux);
 const [parJour,setParJour]=useState(()=>heuresDifferentes(creneaux));
 const premiere=[...heures.values()][0]??modele.heure_proposee?.slice(0,5)??'';
 const choixJours=modele.habit_key==='dime';
 const appliquer=(m:Map<number,string>,p=parJour)=>onChange(creneauxDepuisJours(m,p));
 return <fieldset disabled={desactive}><legend>{l('Jours et heures','Days and times')}</legend>
  {choixJours&&<fieldset><legend>{l('Jours','Days')}</legend><div className="hd-horaire-jours">{courts.map((j,k)=><label key={j}><input type="checkbox" checked={heures.has(k+1)} onChange={e=>{const m=new Map(heures);if(e.target.checked)m.set(k+1,premiere);else m.delete(k+1);appliquer(m);}}/>{j}</label>)}</div></fieldset>}
  <label className="hd-horaire-parjour"><input type="checkbox" checked={parJour} onChange={e=>{setParJour(e.target.checked);appliquer(new Map([...heures].map(([j])=>[j,e.target.checked?(heures.get(j)??premiere):premiere])),e.target.checked);}}/>{l('Une heure différente selon le jour','A different time for each day')}</label>
  {parJour?<div className="hd-horaire-jourliste">{[...heures].map(([j,h])=><label key={j}>{noms[j-1]}<input type="time" required value={h} onChange={e=>{const m=new Map(heures);m.set(j,e.target.value);appliquer(m);}}/></label>)}</div>
   :<label>{l('Heure','Time')}{heures.size>0&&<span className="hd-horaire-resume"> — {[...heures.keys()].map(j=>courts[j-1]).join(', ')}</span>}<input type="time" required value={premiere} onChange={e=>appliquer(new Map([...heures.keys()].map(j=>[j,e.target.value])))}/></label>}
 </fieldset>;
}
