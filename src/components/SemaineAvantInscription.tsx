import type {PlanningInscription} from '@/lib/habitudes-inscription-api';
import {creneauxRespectentFrequence} from '@/lib/habitudes-creneaux';
import './SemaineAvantInscription.css';
import {IconeHD} from './IconeHabitudes';

/** Lecture des choix en cours uniquement : aucune date de début ni activité validée. */
export function SemaineAvantInscription({planning,frequences,fuseau,langue}:{planning:PlanningInscription;frequences:Readonly<Record<string,number>>;fuseau:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const jours=en?['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']:['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
 const complet=planning.length>0&&planning.every(h=>creneauxRespectentFrequence(h.habit_key,h.creneaux,frequences[h.habit_key]??0));
 return <details className="hd-semaine-avant group bg-hd-surface-container-lowest rounded-xl shadow-[0_1px_4px_rgba(29,28,19,0.03)]"><summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[52px] px-3 flex items-center gap-2 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeHD nom="calendar_view_week" className="text-[20px] text-hd-secondary"/><span className="flex-1">{l('Vérifier ma semaine avant de confirmer','Review my week before confirming')}</span><IconeHD nom="chevron_right" className="text-[20px] text-hd-outline transition-transform group-open:rotate-90"/></summary>
  <div className="px-3 pb-3 flex flex-col gap-2">
  <p className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-on-surface-variant">{l('Semaine type','Typical week')} · {fuseau}</p>
  {!complet?<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Termine les jours et les heures de chaque habitude pour afficher ta semaine complète.','Complete the days and times for each habit to display your full week.')}</p>:<>
   {jours.map((jour,i)=>{
    const rdv=planning.flatMap(h=>h.creneaux.filter(s=>s.jours_iso.includes(i+1)).map(s=>({habit_key:h.habit_key,libelle:h.libelle,...s}))).sort((a,b)=>a.heure_locale.localeCompare(b.heure_locale)||a.habit_key.localeCompare(b.habit_key)||a.creneau_id.localeCompare(b.creneau_id));
    const heures=new Map<string,number>();for(const r of rdv)heures.set(r.heure_locale,(heures.get(r.heure_locale)??0)+1);
    const simultanes=[...heures.entries()].filter(([,n])=>n>1).map(([h])=>h);
    return <details key={jour} className="bg-hd-surface-container-low rounded-lg"><summary className="cursor-pointer min-h-[44px] px-3 flex items-center font-hd-label-md text-hd-label-md text-hd-on-surface">{jour} · {rdv.length} {l('rendez-vous','appointments')}</summary>
     {rdv.length?<ol className="px-3 pb-2 flex flex-col">{rdv.map(r=><li key={`${r.habit_key}:${r.creneau_id}`} className="flex items-baseline gap-3 py-1.5 border-b border-hd-outline-variant/40 last:border-0"><time dateTime={r.heure_locale} className="font-hd-label-md text-hd-label-md text-hd-secondary font-semibold w-12 shrink-0">{r.heure_locale}</time><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface">{r.libelle}</span></li>)}</ol>:<p className="px-3 pb-2 font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Aucun rendez-vous prévu ce jour.','No appointment scheduled for this day.')}</p>}
     {!!simultanes.length&&<p className="hd-semaine-simultanes mx-3 mb-2 pl-2 border-l-2 border-hd-secondary font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Plusieurs rendez-vous à la même heure :','Several appointments at the same time:')} {simultanes.join(', ')}. {l('Tu peux ajuster tes choix avant de confirmer.','You can adjust your choices before confirming.')}</p>}
    </details>;
   })}
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Ce récapitulatif suit tes choix. L’enregistrement aura lieu uniquement après la confirmation de ton inscription.','This summary follows your choices. They will only be saved after your enrollment is confirmed.')}</p>
  </>}
  </div>
 </details>;
}
