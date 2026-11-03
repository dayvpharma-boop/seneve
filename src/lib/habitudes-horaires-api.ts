import {supabase} from './supabase';
import type {ModelePlanningHabitude,HorairePersonnelHabitude,RythmeDime} from './habitudes-planning';
export type ConfigurationHoraires={enrollment_id:string;fuseau:string;date_locale:string;modifications_a_partir_du:string;modeles:ModelePlanningHabitude[];horaires:HorairePersonnelHabitude[];revisions:{habit_key:string;revision:string;effectif_du:string}[];dime?:RythmeDime};
export type CreneauPersonnel={creneau_id:string;heure_locale:string;jours_iso:number[]};
export type DemandeHoraires={p_enrollment_id:string;p_habit_key:string;p_creneaux:CreneauPersonnel[];p_effectif_du:string;p_revision_attendue:string|null;p_client_event_id:string};
export async function chargerHorairesHabitudes(enrollmentId:string):Promise<ConfigurationHoraires>{
 const {data,error}=await supabase.rpc('hd_schedule_settings',{p_enrollment_id:enrollmentId});if(error)throw error;
 if(!data||typeof data!=='object'||Array.isArray(data)||data.enrollment_id!==enrollmentId||!Array.isArray(data.modeles)||!Array.isArray(data.horaires)||!Array.isArray(data.revisions)||typeof data.fuseau!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.modifications_a_partir_du))throw Error('Configuration invalide');
 new Intl.DateTimeFormat('fr',{timeZone:data.fuseau});
 // Rythme de la dîme absent ou illisible : chaque semaine, comme le planning.
 const d=data.dime;const dime:RythmeDime=d&&d.rythme==='mois'&&Number.isInteger(d.jour_mois)&&d.jour_mois>=1&&d.jour_mois<=31?{rythme:'mois',jour_mois:d.jour_mois}:{rythme:'semaine'};
 return {...data,dime} as ConfigurationHoraires;
}
/** Salarié : une fois par mois, le jour choisi ; commerçant : chaque semaine (jours du planning). */
export async function reglerRythmeDime(rythme:RythmeDime){
 const {data,error}=await supabase.rpc('hd_dime_regler',{p_rythme:rythme.rythme,p_jour_mois:rythme.rythme==='mois'?rythme.jour_mois:null});if(error)throw error;
 if(!data||data.rythme!==rythme.rythme)throw Error('Confirmation manquante');
 return data as RythmeDime;
}
export async function enregistrerHorairesHabitudes(demande:DemandeHoraires){
 const {data,error}=await supabase.rpc('hd_save_schedule',demande);if(error)throw error;
 if(!data||data.revision!==demande.p_client_event_id||data.effectif_du!==demande.p_effectif_du||typeof data.repetition!=='boolean')throw Error('Confirmation manquante');
 return data as {revision:string;effectif_du:string;repetition:boolean};
}
