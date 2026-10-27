import type {JourHabitudesLecture} from './habitudes-lecture';
/** Seules les activités de culte identifiées et confirmées comptent comme participations. */
export function bilanCultes(jours:readonly JourHabitudesLecture[]){
 const disponibles=jours.filter(j=>j.activites.some(a=>a.habit_key));
 if(!disponibles.length)return null;
 const cultes=disponibles.flatMap(j=>j.activites).filter(a=>a.habit_key==='culte_semaine'||a.habit_key==='culte_dimanche');
 return {jours:disponibles.length,realisees:cultes.filter(a=>a.confirmee&&a.etat==='realisee').length,partielles:cultes.filter(a=>a.confirmee&&a.etat==='partielle').length};
}
