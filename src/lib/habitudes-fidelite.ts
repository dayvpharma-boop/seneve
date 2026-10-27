import {supabase} from './supabase';
import {habitudesActivees} from './habitudes-configuration';

/** Compteur privé « Mes jours de fidélité » (cahier HD § 7.2–7.3). Tout passe par les fonctions serveur
 * réservées au titulaire : aucune lecture de table, aucun motif ni texte envoyé, rien gardé sur le téléphone. */
export type EtatFidelite={enrollment_id:string;date_locale:string;debut_serie:string;jours:number;masque:boolean;annulable:boolean;repetition?:boolean};

/** Option de construction distincte : les fonctions n'existent que là où la migration est installée. */
export function compteurFideliteActif():boolean{return habitudesActivees()&&import.meta.env.VITE_HABITUDES_COMPTEUR==='true';}

const DATE=/^\d{4}-\d{2}-\d{2}$/;
function etat(data:unknown,enrollmentId:string):EtatFidelite{
 const d=data as Partial<EtatFidelite>|null;
 if(!d||typeof d!=='object'||d.enrollment_id!==enrollmentId||!Number.isInteger(d.jours)||d.jours!<0||typeof d.masque!=='boolean'
  ||typeof d.annulable!=='boolean'||!DATE.test(d.date_locale??'')||!DATE.test(d.debut_serie??''))throw Error('Réponse du compteur invalide');
 return d as EtatFidelite;
}
async function appel(nom:string,params:Record<string,unknown>,enrollmentId:string){
 const {data,error}=await supabase.rpc(nom,params);if(error)throw error;return etat(data,enrollmentId);
}
export const lireFidelite=(enrollmentId:string)=>appel('hd_fidelite_lire',{p_enrollment_id:enrollmentId},enrollmentId);
export const masquerFidelite=(enrollmentId:string,masque:boolean)=>appel('hd_fidelite_masquer',{p_enrollment_id:enrollmentId,p_masque:masque},enrollmentId);
/** Le même identifiant est renvoyé tant que la déclaration n'est pas confirmée : un double appui ne compte qu'une fois. */
export const declarerFidelite=(enrollmentId:string,eventId:string)=>appel('hd_fidelite_declarer',{p_enrollment_id:enrollmentId,p_client_event_id:eventId,p_confirmation:true},enrollmentId);
export const annulerFidelite=(enrollmentId:string)=>appel('hd_fidelite_annuler',{p_enrollment_id:enrollmentId},enrollmentId);
