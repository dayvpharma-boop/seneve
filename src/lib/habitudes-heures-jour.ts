import type {CreneauPersonnel} from './habitudes-horaires-api';

/** Demande de Dr Justin (03/11/2026) : une heure différente selon le jour (ex. prière à 16:00 le lundi, 09:00 le mardi).
 * Chaque jour devient alors son propre créneau ; avec une heure commune, un seul créneau couvre tous les jours. */
export function heuresParJour(creneaux:readonly CreneauPersonnel[]):Map<number,string>{
 const m=new Map<number,string>();
 for(const c of creneaux)for(const j of c.jours_iso)m.set(j,c.heure_locale);
 return new Map([...m].sort((a,b)=>a[0]-b[0]));
}
export function heuresDifferentes(creneaux:readonly CreneauPersonnel[]){return new Set(heuresParJour(creneaux).values()).size>1;}
export function creneauxDepuisJours(heures:ReadonlyMap<number,string>,parJour:boolean):CreneauPersonnel[]{
 const jours=[...heures.keys()].sort((a,b)=>a-b);
 if(!jours.length)return [];
 if(!parJour)return [{creneau_id:'principal',heure_locale:heures.get(jours[0]!)??'',jours_iso:jours}];
 return jours.map(j=>({creneau_id:`jour_${j}`,heure_locale:heures.get(j)??'',jours_iso:[j]}));
}
