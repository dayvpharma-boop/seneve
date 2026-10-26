import { supabase } from './supabase';
import {habitudesActivees} from './habitudes-configuration';
import {fuseauHabitudes} from './habitudes-calendrier';
import type { Offre } from './suite';
export type OffreCatalogue=Offre&{actif:boolean;duree_acces_jours:number|null};
export type ProgrammeCatalogue={programme_id:string;nom:string;description:string|null;duree_jours:number|null};
export type DroitAcces={entitlement_id:string;offre_id:string;etat:string;debut:string;fin:string|null};
export type InscriptionAcces={enrollment_id:string;entitlement_id:string|null;programme_id:string;date_debut:string;etat:string};
/** Périodes d'accès Habitudes & Défis : mois 1 gratuit, mois 2 à 6 ouverts par l'abonnement Continuité. */
export type PeriodeGratuiteHabitudes={enrollment_id:string;entitlement_id:string;debut:string;fin_exclue:string;mois?:number};
export type CatalogueAcces={connecte:boolean;offres:OffreCatalogue[];programmes:ProgrammeCatalogue[];publies:string[];droits:DroitAcces[];inscriptions:InscriptionAcces[];periodesGratuitesHabitudes?:PeriodeGratuiteHabitudes[];fuseauHabitudes?:string;participantIdHabitudes?:string};
export function lienAchatSur(lien:string|null){if(!lien)return null;try{const u=new URL(lien);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function etatDroit(d:DroitAcces,now=Date.now()):'actif'|'expire'|'ferme'|'attente'{
 if(d.etat==='revoque'||d.etat==='annule')return 'ferme';
 if(d.etat==='expire'||d.etat==='expiree')return 'expire';
 if(d.etat!=='actif'||!Number.isFinite(Date.parse(d.debut)))return 'attente';
 if(Date.parse(d.debut)>now)return 'attente';
 if(d.fin!==null){const fin=Date.parse(d.fin);if(!Number.isFinite(fin))return 'attente';if(fin<=now)return 'expire';}
 return 'actif';
}
/** Les RLS existantes limitent les droits et inscriptions au participant connecté. Aucun paiement brut n’est lu. */
export async function chargerCatalogueAcces(langue:string):Promise<CatalogueAcces>{
 const s=await supabase.auth.getSession();if(s.error)throw s.error;
 if(!s.data.session)return{connecte:false,offres:[],programmes:[],publies:[],droits:[],inscriptions:[]};
 const [o,p,v,d,e,h,profil]=await Promise.all([
  supabase.from('offers').select('offre_id, produit, type_offre, langue, programme_id, prix, devise, lien_achat, duree_acces_jours, actif').eq('actif',true).eq('langue',langue).order('prix'),
  supabase.from('programmes').select('programme_id, nom, description, duree_jours').eq('langue',langue),
  supabase.from('programme_versions').select('programme_id').eq('etat','publiee'),
  supabase.from('entitlements').select('entitlement_id, offre_id, etat, debut, fin').order('cree_le',{ascending:false}),
  supabase.from('enrollments').select('enrollment_id, entitlement_id, programme_id, date_debut, etat').neq('etat','annulee'),
  habitudesActivees()?supabase.from('hd_access_periods').select('enrollment_id, entitlement_id, debut, fin_exclue, mois'):Promise.resolve({data:[],error:null}),
  habitudesActivees()?supabase.from('participants').select('participant_id, fuseau, preferences'):Promise.resolve({data:[],error:null}),
 ]);
 for(const r of [o,p,v,d,e,h,profil])if(r.error)throw r.error;
 return{connecte:true,offres:(o.data??[]) as OffreCatalogue[],programmes:(p.data??[]) as ProgrammeCatalogue[],publies:[...new Set((v.data??[]).map(x=>String(x.programme_id)))],droits:(d.data??[]) as DroitAcces[],inscriptions:(e.data??[]) as InscriptionAcces[],periodesGratuitesHabitudes:(h.data??[]) as PeriodeGratuiteHabitudes[],participantIdHabitudes:habitudesActivees()?profil.data?.[0]?.participant_id:undefined,fuseauHabitudes:habitudesActivees()?fuseauHabitudes(profil.data?.[0]??{}):undefined};
}
