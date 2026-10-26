import type {JourHabitudesLecture} from './habitudes-lecture';
export type SemaineHabitudes={numero:number;de:number;a:number;joursDisponibles:number;total:number;realisees:number;partielles:number;preparees:number;aides:number;enAttente:number;journeesCompletes:number};
/** Semaines de sept jours depuis le début, sans définir la durée des mois commerciaux. */
export function semainesHabitudes(jours:readonly JourHabitudesLecture[]):SemaineHabitudes[]{
 const groupes=new Map<number,SemaineHabitudes>();
 for(const j of jours){
  const numero=Math.floor((j.jour-1)/7)+1;
  let s=groupes.get(numero);
  if(!s){s={numero,de:(numero-1)*7+1,a:numero*7,joursDisponibles:0,total:0,realisees:0,partielles:0,preparees:0,aides:0,enAttente:0,journeesCompletes:0};groupes.set(numero,s);}
  s.joursDisponibles++;s.total+=j.activites.length;
  const requises=j.activites.filter(a=>a.requise);
  if(requises.length&&requises.every(a=>a.confirmee&&a.etat==='realisee'))s.journeesCompletes++;
  for(const a of j.activites){
   if(!a.confirmee){if(a.etat!=='non_commencee'||a.aide)s.enAttente++;continue;}
   if(a.etat==='realisee')s.realisees++;else if(a.etat==='partielle')s.partielles++;else if(a.etat==='preparee')s.preparees++;
   if(a.aide)s.aides++;
  }
 }
 return [...groupes.values()].sort((a,b)=>a.numero-b.numero);
}
