import type {JourRecette} from './habitudes-jour-recette';
import {lundi} from './profil-pas';

/** Résumé de la semaine du dimanche (demande de Dr Justin du 04/11/2026) : lecture seule, jamais compté dans les bilans.
 * Activités requises faites, journées complètes, cultes et dîme, du lundi au jour affiché. */
export type ResumeSemaine={jours:number;faites:number;requises:number;journeesCompletes:number;cultes:number;dime:boolean};
export function resumeSemaine(historique:readonly JourRecette[],dateLocale:string):ResumeSemaine{
 const debut=lundi(dateLocale);
 const semaine=historique.filter(j=>j.date>=debut&&j.date<=dateLocale);
 let faites=0,requises=0,journeesCompletes=0,cultes=0,dime=false;
 for(const j of semaine){
  const req=j.activites.filter(a=>a.occurrence.requise);
  const ok=req.filter(a=>a.etat?.etat==='realisee').length;
  faites+=ok;requises+=req.length;if(req.length&&ok===req.length)journeesCompletes++;
  for(const a of j.activites){
   if(a.etat?.etat!=='realisee')continue;
   if(a.habit_key?.startsWith('culte_'))cultes++;
   if(a.habit_key==='dime')dime=true;
  }
 }
 return {jours:semaine.length,faites,requises,journeesCompletes,cultes,dime};
}
