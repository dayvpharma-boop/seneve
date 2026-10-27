import {supabase} from './supabase';
import {habitudesActivees} from './habitudes-configuration';

/** Choix des rappels d'habitudes (décision du 27/10/2026 : toutes les habitudes par défaut, chacun peut en retirer).
 * L'accord pour les notifications et l'appareil restent ceux de « Recevoir mes rappels » (profil). */
export type HabitudeRappel={habit_key:string;libelle:string;recu:boolean};
/** `fuseau` : fuseau suivi par les horaires d'habitudes (absent sur une base sans le changement de fuseau en voyage). */
export type EtatRappelsHabitudes={inscrit:false}|{inscrit:true;push_pret:boolean;actif:boolean;habitudes:HabitudeRappel[];fuseau?:string};

/** Option de construction distincte : les fonctions n'existent que là où la migration est installée. */
export function rappelsHabitudesActifs():boolean{return habitudesActivees()&&import.meta.env.VITE_HABITUDES_RAPPELS==='true';}

function etat(data:unknown):EtatRappelsHabitudes{
 const d=data as Partial<{inscrit:boolean;push_pret:boolean;actif:boolean;habitudes:HabitudeRappel[];fuseau:unknown}>|null;
 if(!d||typeof d.inscrit!=='boolean')throw Error('Réponse des rappels invalide');
 if(!d.inscrit)return {inscrit:false};
 if(typeof d.push_pret!=='boolean'||typeof d.actif!=='boolean'||!Array.isArray(d.habitudes)
  ||d.habitudes.some(h=>typeof h?.habit_key!=='string'||typeof h.libelle!=='string'||typeof h.recu!=='boolean'))throw Error('Réponse des rappels invalide');
 return {inscrit:true,push_pret:d.push_pret,actif:d.actif,habitudes:d.habitudes,...(typeof d.fuseau==='string'?{fuseau:d.fuseau}:{})};
}
/** Voyage : les horaires gardent leurs heures et suivent désormais ce fuseau (choisi par la personne). */
export async function changerFuseauHabitudes(fuseau:string){
 const {data,error}=await supabase.rpc('hd_changer_fuseau',{p_fuseau:fuseau});if(error)throw error;return etat(data);
}
export async function lireRappelsHabitudes(){const {data,error}=await supabase.rpc('hd_rappels_etat');if(error)throw error;return etat(data);}
export async function reglerRappelsHabitudes(actif:boolean,coupees:string[]){
 const {data,error}=await supabase.rpc('hd_rappels_regler',{p_actif:actif,p_habitudes_coupees:coupees});if(error)throw error;return etat(data);
}
