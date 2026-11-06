import {supabase} from './supabase';
import {habitudesActivees} from './habitudes-configuration';
import {possibilite,abonnementActuel,abonner,clesAbonnement,fuseauTelephone,RefusNotifications} from './rappels';

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

/** Demande de Dr Justin (06/11/2026) : choisir ses rappels dès l'inscription à Habitudes & Défis.
 *  Une fois l'inscription confirmée : abonne ce téléphone (sans changer les heures des rappels du livre),
 *  puis active les rappels d'habitudes, toutes cochées sauf celles que la personne a décochées. */
export type ResultatRappelsInscription='actifs'|'refus'|'iphone'|'indisponible'|'erreur';
export async function activerRappelsDepuisInscription(coupees:string[]):Promise<ResultatRappelsInscription>{

 const p=possibilite();if(p==='iphone-ecran-accueil')return 'iphone';if(p!=='oui')return 'indisponible';
 try{
  const actuel=await abonnementActuel().catch(()=>null);
  const lu=await supabase.rpc('rappels_etat',{p_endpoint:actuel?.endpoint??null});
  const e=lu.data as {cle_publique?:string|null;moments?:Record<string,string|null>}|null;
  if(lu.error||!e)return 'erreur';if(!e.cle_publique)return 'indisponible';
  const k=clesAbonnement(await abonner(e.cle_publique));
  const m=e.moments??{};
  const act=await supabase.rpc('rappels_activer',{p_endpoint:k.endpoint,p_p256dh:k.p256dh,p_auth:k.auth,p_moments:{matin:m.matin??null,midi:m.midi??null,soir:m.soir??null},p_fuseau:fuseauTelephone()});
  if(act.error)return 'erreur';
  await reglerRappelsHabitudes(true,coupees);return 'actifs';
 }catch(x){return x instanceof RefusNotifications?'refus':'erreur';}
}
