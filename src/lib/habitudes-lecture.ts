import {bilanHabitudes, type BilanHabitudes, type EtatHabitude, type EtatOccurrence} from './habitudes.ts';
import {occurrencesDepuisContenus} from './habitudes-api.ts';
import type {FiltreCultes} from './habitudes-cultes.ts';

export type InscriptionLecture = {enrollment_id:string;programme_id:string;version:number;langue:string;date_debut:string};
export type ContenuLecture = {content_id:string;programme_id:string;version:number;langue:string;jour:number;numero_message:number};
export type ActiviteLecture = {activity_id:string;content_id:string;type_activite:string;consigne:string;obligatoire:boolean;note_source?:string|null};
export type EtatLecture = {enrollment_id:string;activity_id:string;etat:EtatHabitude;aide_demandee:boolean};
export type JourHabitudesLecture = {jour:number;date_locale:string;bilan:BilanHabitudes;activites:{id:string;consigne:string;requise:boolean;etat:EtatHabitude;aide:boolean;confirmee:boolean}[]};

/** Lecture des seuls instantanés serveur, filtrés par inscription, version, langue et jour.
 * Aucun calcul à partir d'un clic, du cache local ou d'une écoute audio.
 */
export function joursHabitudesLecture(inscription:InscriptionLecture, joursOuverts:number, contenus:readonly ContenuLecture[], activites:readonly ActiviteLecture[], etats:readonly EtatLecture[],dateDuJour?:(jour:number)=>string,cultes?:FiltreCultes):JourHabitudesLecture[]{
 if(!Number.isInteger(joursOuverts)||joursOuverts<0)throw new Error('Nombre de jours ouverts invalide');
 const debut=new Date(inscription.date_debut+'T00:00:00Z');
 if(Number.isNaN(+debut)||debut.toISOString().slice(0,10)!==inscription.date_debut)throw new Error('Début de parcours invalide');
 const out:JourHabitudesLecture[]=[];
 for(let jour=1;jour<=joursOuverts;jour++){
  // Date du jour d'après les périodes d'accès quand elles sont fournies (reprise après un retard).
  const date=new Date(+debut);date.setUTCDate(date.getUTCDate()+jour-1);
  const ctx={...inscription,jour,date_locale:dateDuJour?dateDuJour(jour):date.toISOString().slice(0,10)};
  const cts=contenus.filter(c=>c.programme_id===ctx.programme_id&&c.version===ctx.version&&c.langue===ctx.langue&&c.jour===jour).sort((a,b)=>a.numero_message-b.numero_message);
  const ids=new Set(cts.map(c=>c.content_id));
  // Conserver l'ordre des messages publiés, jamais déduire les prières de leur position.
  const acts=cts.flatMap(c=>activites.filter(a=>a.content_id===c.content_id&&a.type_activite==='action'))
   // Cultes non prévus ce jour-là : ni affichés, ni comptés parmi les activités requises.
   .filter(a=>!cultes||cultes(a.note_source,ctx.date_locale,etats.some(e=>e.enrollment_id===ctx.enrollment_id&&e.activity_id===a.activity_id)));
  const occurrences=occurrencesDepuisContenus(ctx,cts,acts);
  const states:EtatOccurrence[]=etats.filter(e=>e.enrollment_id===ctx.enrollment_id&&acts.some(a=>a.activity_id===e.activity_id)).map(e=>({occurrence_id:e.activity_id,enrollment_id:ctx.enrollment_id,version:ctx.version,date_locale:ctx.date_locale,etat:e.etat,aide_demandee:e.aide_demandee,synchronisation:'synchronise'}));
  const bilan=bilanHabitudes(ctx,occurrences,states);
  const lignes=occurrences.map(o=>{
   const a=acts.find(a=>a.activity_id===o.occurrence_id)!;
   const e=states.find(e=>e.occurrence_id===o.occurrence_id);
   return {id:o.occurrence_id,consigne:a.consigne,requise:o.requise,etat:e?.etat??'non_commencee' as EtatHabitude,aide:e?.aide_demandee??false,confirmee:Boolean(e)};
  });
  if(ids.size)out.push({jour,date_locale:ctx.date_locale,bilan,activites:lignes});
 }
 return out;
}
