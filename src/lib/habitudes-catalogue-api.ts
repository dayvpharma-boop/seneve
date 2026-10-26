import {supabase} from './supabase';
import type {PlanningInscription} from './habitudes-inscription-api';
export type OffreInscriptionHabitudes={programme_id:string;version:number;langue:string;nom:string;offre_id:string;duree_gratuite_jours:30;planning:PlanningInscription};
export type CatalogueInscriptionHabitudes={compte_id:string;fuseau:string;offres:OffreInscriptionHabitudes[];motif?:'gratuite_deja_utilisee'};
const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const texte=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
function planningValide(p:unknown):p is PlanningInscription{
 if(!Array.isArray(p)||!p.length||new Set(p.map(h=>h?.habit_key)).size!==p.length)return false;
 return p.every(h=>objet(h)&&texte(h.habit_key)&&texte(h.libelle)&&Array.isArray(h.creneaux)&&h.creneaux.length>0&&h.creneaux.length<=7&&new Set(h.creneaux.map(s=>s?.creneau_id)).size===h.creneaux.length&&h.creneaux.every(s=>objet(s)&&typeof s.creneau_id==='string'&&/^[a-z0-9_]{1,32}$/.test(s.creneau_id)&&typeof s.heure_locale==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.heure_locale)&&Array.isArray(s.jours_iso)&&s.jours_iso.length>0&&s.jours_iso.length<=7&&new Set(s.jours_iso).size===s.jours_iso.length&&s.jours_iso.every(j=>Number.isInteger(j)&&j>=1&&j<=7)));
}
export async function chargerCatalogueInscription(langue:string,compteId:string):Promise<CatalogueInscriptionHabitudes>{
 const {data,error}=await supabase.rpc('hd_free_catalogue',{p_langue:langue});if(error)throw error;
 if(!objet(data)||data.compte_id!==compteId||!texte(data.fuseau)||!Array.isArray(data.offres)||(data.motif!==undefined&&data.motif!=='gratuite_deja_utilisee')||(data.motif&&data.offres.length))throw Error('Catalogue incohérent');
 new Intl.DateTimeFormat('fr',{timeZone:data.fuseau});
 const identifiants=new Set<string>();
 for(const o of data.offres){
  if(!objet(o)||!texte(o.programme_id)||!Number.isInteger(o.version)||Number(o.version)<1||o.langue!==langue||!texte(o.nom)||!texte(o.offre_id)||o.duree_gratuite_jours!==30||!planningValide(o.planning))throw Error('Offre incohérente');
  const id=JSON.stringify([o.programme_id,o.version,o.offre_id]);if(identifiants.has(id))throw Error('Offre répétée');identifiants.add(id);
 }
 return data as CatalogueInscriptionHabitudes;
}
