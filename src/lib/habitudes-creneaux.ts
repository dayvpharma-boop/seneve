import type {CreneauPersonnel} from './habitudes-horaires-api';
/** Aide de saisie ; le serveur reste responsable de l'autorisation et de la validation. */
export function creneauxRespectentFrequence(habitKey:string,creneaux:readonly CreneauPersonnel[],frequence:number):boolean{
 if(!Number.isInteger(frequence)||frequence<1||!creneaux.length||creneaux.length>7)return false;
 const ids=new Set<string>(),rendezVous=new Set<string>();let total=0;
 for(const c of creneaux){
  if(!/^[a-z0-9_]{1,32}$/.test(c.creneau_id)||ids.has(c.creneau_id)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.heure_locale)||!c.jours_iso.length||c.jours_iso.length>7)return false;
  ids.add(c.creneau_id);const jours=new Set<number>();
  for(const j of c.jours_iso){
   if(!Number.isInteger(j)||j<1||j>7||jours.has(j))return false;
   jours.add(j);const cle=String(j)+(habitKey.startsWith('culte_')?'|'+c.heure_locale:'');
   if(rendezVous.has(cle))return false;rendezVous.add(cle);total++;
  }
 }
 return total===frequence;
}
