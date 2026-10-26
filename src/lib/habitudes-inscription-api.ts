import {supabase} from './supabase';
import type {CreneauPersonnel} from './habitudes-horaires-api';

export type PlanningInscription={habit_key:string;libelle:string;creneaux:CreneauPersonnel[]}[];
export type DemandeInscription={p_programme_id:string;p_version:number;p_langue:string;p_offre_id:string;p_horaires:{habit_key:string;creneaux:CreneauPersonnel[]}[];p_confirmation:true};
export type ConfirmationInscription={cree:boolean;existant:boolean;enrollment_id:string;entitlement_id:string;debut:string;fin_exclue:string;etat:string;horaires_appliques:boolean};
export type ResultatInscription=ConfirmationInscription|{cree:false;motif:'gratuite_deja_utilisee'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function inscrireHabitudesGratuit(demande:DemandeInscription):Promise<ResultatInscription>{
 const {data,error}=await supabase.rpc('hd_start_free',demande);if(error)throw error;
 if(data&&data.cree===false&&data.motif==='gratuite_deja_utilisee')return {cree:false,motif:'gratuite_deja_utilisee'};
 if(!data||typeof data.cree!=='boolean'||typeof data.existant!=='boolean'||data.cree===data.existant||!uuid.test(data.enrollment_id)||!uuid.test(data.entitlement_id)||typeof data.debut!=='string'||typeof data.fin_exclue!=='string'||!Number.isFinite(Date.parse(data.debut))||Date.parse(data.fin_exclue)-Date.parse(data.debut)!==30*24*60*60*1000||typeof data.etat!=='string'||!data.etat||data.horaires_appliques!==data.cree)throw Error('Confirmation d’inscription incohérente');
 return data as ConfirmationInscription;
}
