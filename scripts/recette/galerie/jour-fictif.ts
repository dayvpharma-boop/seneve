// Remplace src/lib/habitudes-jour-recette.ts dans la galerie : une journée fictive, états variés.
import type {EtatOccurrence,OccurrenceHabitude} from '@/lib/habitudes';
type JourRecette={userId:string;date:string;jour:number;activites:{occurrence:OccurrenceHabitude;habit_key?:string;consigne:string;critere:string|null;heure:string;etat?:EtatOccurrence}[]};
import {rythmeProposeHabitudes} from '@/lib/habitudes-rythme-propose';
const E='11111111-1111-4111-8111-111111111111';
const etats:Record<string,'realisee'|'partielle'|'aide'>={priere_matin:'realisee',bible_matin:'realisee',exercice:'partielle',predication:'aide',gratitude_matin:'realisee',reveil:'realisee'};
const criteres:Record<string,string>={exercice:'10 à 15 minutes, selon tes capacités.',lecture_pro:'30 minutes de lecture utile à ton métier.',priere_midi:'Amidah complète par défaut ; durée personnelle.'};
export async function chargerJourRecette():Promise<JourRecette>{
 return {userId:'10000000-0000-4000-8000-000000000001',date:'2026-10-26',jour:12,activites:rythmeProposeHabitudes.filter(h=>h.jours_iso.includes(1)).map((h,i)=>{
  const occurrence={occurrence_id:`3000000${(i%10)}-0000-4000-8000-0000000000${String(i).padStart(2,'0')}`,enrollment_id:E,version:1,date_locale:'2026-10-26',requise:true};
  const e=etats[h.habit_key];
  return {occurrence,habit_key:h.habit_key,consigne:h.libelle,critere:criteres[h.habit_key]??null,heure:h.heure_proposee!.slice(0,5),etat:e?{...occurrence,etat:e==='aide'?'non_commencee':e,aide_demandee:e==='aide',synchronisation:'synchronise' as const}:undefined};
 })};
}
// Historique fictif : 12 jours, états variés et réguliers (aucun hasard, pour des captures stables).
export async function chargerHistoriqueRecette():Promise<JourRecette[]>{
 const base=Date.parse('2026-10-15T12:00:00Z'),cycle=['realisee','realisee','partielle','non_commencee'] as const;
 return Array.from({length:12},(_,d)=>{const date=new Date(base+d*864e5).toISOString().slice(0,10);
  return {userId:'10000000-0000-4000-8000-000000000001',date,jour:d+1,activites:rythmeProposeHabitudes.filter(h=>h.jours_iso.includes(((new Date(date+'T12:00:00Z').getUTCDay()+6)%7)+1)).map((h,i)=>{
   const occurrence={occurrence_id:`4${String(d).padStart(2,'0')}00000-0000-4000-8000-0000000000${String(i).padStart(2,'0')}`,enrollment_id:E,version:1,date_locale:date,requise:true};
   const e=cycle[(d+i)%cycle.length]!;
   return {occurrence,consigne:h.libelle,critere:null,heure:h.heure_proposee!.slice(0,5),etat:e==='non_commencee'?undefined:{...occurrence,etat:e,aide_demandee:false,synchronisation:'synchronise' as const}};
  })};});
}
