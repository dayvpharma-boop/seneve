import type {PlanningInscription} from '@/lib/habitudes-inscription-api';
import {creneauxRespectentFrequence} from '@/lib/habitudes-creneaux';
import './SemaineAvantInscription.css';

/** Lecture des choix en cours uniquement : aucune date de début ni activité validée. */
export function SemaineAvantInscription({planning,frequences,fuseau,langue}:{planning:PlanningInscription;frequences:Readonly<Record<string,number>>;fuseau:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const jours=en?['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
 const complet=planning.length>0&&planning.every(h=>creneauxRespectentFrequence(h.habit_key,h.creneaux,frequences[h.habit_key]??0));
 return <details className="hd-semaine-avant"><summary>{l('Vérifier ma semaine avant de confirmer','Review my week before confirming')}</summary>
  <p>{l('Semaine type','Typical week')} · {fuseau}</p>
  {!complet?<p>{l('Termine les jours et les heures de chaque habitude pour afficher ta semaine complète.','Complete the days and times for each habit to display your full week.')}</p>:<>
   {jours.map((jour,i)=>{
    const rdv=planning.flatMap(h=>h.creneaux.filter(s=>s.jours_iso.includes(i+1)).map(s=>({habit_key:h.habit_key,libelle:h.libelle,...s}))).sort((a,b)=>a.heure_locale.localeCompare(b.heure_locale)||a.habit_key.localeCompare(b.habit_key)||a.creneau_id.localeCompare(b.creneau_id));
    const heures=new Map<string,number>();for(const r of rdv)heures.set(r.heure_locale,(heures.get(r.heure_locale)??0)+1);
    const simultanes=[...heures.entries()].filter(([,n])=>n>1).map(([h])=>h);
    return <details key={jour}><summary>{jour} · {rdv.length} {l('rendez-vous','appointments')}</summary>
     {rdv.length?<ol>{rdv.map(r=><li key={`${r.habit_key}:${r.creneau_id}`}><time dateTime={r.heure_locale}>{r.heure_locale}</time><span>{r.libelle}</span></li>)}</ol>:<p>{l('Aucun rendez-vous prévu ce jour.','No appointment scheduled for this day.')}</p>}
     {!!simultanes.length&&<p className="hd-semaine-simultanes">{l('Plusieurs rendez-vous à la même heure :','Several appointments at the same time:')} {simultanes.join(', ')}. {l('Tu peux ajuster tes choix avant de confirmer.','You can adjust your choices before confirming.')}</p>}
    </details>;
   })}
   <p>{l('Ce récapitulatif suit tes choix. L’enregistrement aura lieu uniquement après la confirmation de ton inscription.','This summary follows your choices. They will only be saved after your enrollment is confirmed.')}</p>
  </>}
 </details>;
}
