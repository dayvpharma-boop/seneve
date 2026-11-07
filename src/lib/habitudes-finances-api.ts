import {supabase} from './supabase';

export const HABITUDES_FINANCES=[
 {habit_key:'reserve_joie',libelle:{fr:'Réserve de joie',en:'Family joy reserve'},active_defaut:true,genre:'epargne'},
 {habit_key:'epargne_investir',libelle:{fr:'Épargne pour investir',en:'Savings for investing'},active_defaut:true,genre:'epargne'},
 {habit_key:'offrande',libelle:{fr:'Offrande libre',en:'Freewill offering'},active_defaut:true,genre:'choisie'},
 {habit_key:'remboursement_dette',libelle:{fr:'Remboursement de dette',en:'Debt repayment'},active_defaut:false,genre:'choisie'},
] as const;
export type CleHabitudeFinanciere=typeof HABITUDES_FINANCES[number]['habit_key'];
export type CreneauFinancier={creneau_id:string;heure_locale:string;jours_iso:number[]};
export type PreferenceHabitudeFinanciere={habit_key:CleHabitudeFinanciere;active:boolean;prochain:{active:boolean;date:string}|null;libelle:string;creneaux:CreneauFinancier[];creneaux_prochains:CreneauFinancier[]};
type PreferenceHistorique={habit_key:CleHabitudeFinanciere;active:boolean;valide_du:string;valide_au:string|null};
type HoraireHistorique=CreneauFinancier&{habit_key:CleHabitudeFinanciere;fuseau:string;valide_du:string;valide_au:string|null};
export type ConfigurationFinanciere={enrollment_id:string;version:number;langue:string;fuseau:string;date_locale:string;modifications_a_partir_du:string;habitudes:PreferenceHabitudeFinanciere[];historique:{preferences:PreferenceHistorique[];creneaux:HoraireHistorique[]}};
const estObjet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const estCle=(v:unknown):v is CleHabitudeFinanciere=>HABITUDES_FINANCES.some(h=>h.habit_key===v);
function analyserCreneaux(liste:unknown):CreneauFinancier[]{
 if(!Array.isArray(liste))throw Error('Créneaux financiers incohérents');
 return liste.map(c=>{
  if(!estObjet(c)||typeof c.creneau_id!=='string'||!/^[a-z0-9_]{1,32}$/.test(c.creneau_id)||typeof c.heure_locale!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.heure_locale)||!Array.isArray(c.jours_iso)||!c.jours_iso.length||c.jours_iso.length>7||new Set(c.jours_iso).size!==c.jours_iso.length||c.jours_iso.some(j=>!Number.isInteger(j)||Number(j)<1||Number(j)>7))throw Error('Créneau financier incohérent');
  return {creneau_id:c.creneau_id,heure_locale:c.heure_locale,jours_iso:[...c.jours_iso] as number[]};
 });
}
function analyser(data:unknown,enrollmentId:string):ConfigurationFinanciere{
 if(!estObjet(data)||data.enrollment_id!==enrollmentId||!Number.isInteger(data.version)||Number(data.version)<2||!['fr','en'].includes(String(data.langue))||typeof data.fuseau!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(data.date_locale))||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(data.modifications_a_partir_du))||!Array.isArray(data.habitudes))throw Error('Réglages financiers incohérents');
 new Intl.DateTimeFormat('fr',{timeZone:data.fuseau});
 const vus=new Set<string>();
 const habitudes=data.habitudes.map(x=>{
  if(!estObjet(x)||!estCle(x.habit_key)||vus.has(x.habit_key)||typeof x.active!=='boolean'||typeof x.libelle!=='string'||!Array.isArray(x.creneaux))throw Error('Préférence financière incohérente');
  vus.add(x.habit_key);
  if(!Array.isArray(x.creneaux_prochains)||!(x.prochain===null||estObjet(x.prochain)&&typeof x.prochain.active==='boolean'&&typeof x.prochain.date==='string'))throw Error('Prochain réglage financier incohérent');
  return {habit_key:x.habit_key,active:x.active,prochain:x.prochain as PreferenceHabitudeFinanciere['prochain'],libelle:x.libelle,creneaux:analyserCreneaux(x.creneaux),creneaux_prochains:analyserCreneaux(x.creneaux_prochains)};
 });
 if(vus.size!==HABITUDES_FINANCES.length||HABITUDES_FINANCES.some(h=>!vus.has(h.habit_key)))throw Error('Liste des habitudes financières incomplète');
 const hist=estObjet(data.historique)?data.historique:null;
 if(!hist||!Array.isArray(hist.preferences)||!Array.isArray(hist.creneaux))throw Error('Historique financier incohérent');
 const preferences=hist.preferences.map(x=>{
  if(!estObjet(x)||!estCle(x.habit_key)||typeof x.active!=='boolean'||typeof x.valide_du!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x.valide_du)||(x.valide_au!==null&&typeof x.valide_au!=='string'))throw Error('Historique financier incohérent');
  return x as unknown as PreferenceHistorique;
 });
 const creneaux=hist.creneaux.map(x=>{
  if(!estObjet(x)||!estCle(x.habit_key)||typeof x.fuseau!=='string'||typeof x.valide_du!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x.valide_du)||(x.valide_au!==null&&typeof x.valide_au!=='string'))throw Error('Historique financier incohérent');
  const slot=analyserCreneaux([x])[0]!;
  return {...slot,habit_key:x.habit_key,fuseau:x.fuseau,valide_du:x.valide_du,valide_au:x.valide_au} as HoraireHistorique;
 });
 return {...data,habitudes,historique:{preferences,creneaux}} as ConfigurationFinanciere;
}
export async function lireHabitudesFinancieres(enrollmentId:string,dateLocale?:string):Promise<ConfigurationFinanciere|null>{
 const {data,error}=await supabase.rpc('hd_finance_settings',{p_enrollment_id:enrollmentId});if(error)throw error;
 if(data===null||estObjet(data)&&data.module_v2!==true)return null;
 const configuration=analyser(data,enrollmentId);
 if(dateLocale&&configuration.date_locale!==dateLocale)throw Error('Journée financière à actualiser');
 return configuration;
}
/** Rejoue les préférences versionnées pour une date passée, sans supposer l’état actuel rétroactivement. */
export function financesPourDate(configuration:ConfigurationFinanciere,dateLocale:string):ConfigurationFinanciere{
 const habitudes=configuration.habitudes.map(h=>{
  const p=configuration.historique.preferences.filter(x=>x.habit_key===h.habit_key&&x.valide_du<=dateLocale&&(x.valide_au===null||x.valide_au>=dateLocale)).sort((a,b)=>b.valide_du.localeCompare(a.valide_du))[0];
  const meta=HABITUDES_FINANCES.find(x=>x.habit_key===h.habit_key)!;
  const creneaux=configuration.historique.creneaux.filter(x=>x.habit_key===h.habit_key&&x.valide_du<=dateLocale&&(x.valide_au===null||x.valide_au>=dateLocale)).map(({habit_key,fuseau,valide_du,valide_au,...slot})=>slot);
  return {...h,active:p?.active??meta.active_defaut,creneaux};
 });
 return {...configuration,date_locale:dateLocale,habitudes};
}
/** Le serveur fixe la date d'effet et clôture l'horaire précédent ; aucune donnée financière n'est envoyée. */
export async function reglerHabitudeFinanciere(enrollmentId:string,habitKey:CleHabitudeFinanciere,active:boolean){
 const {data,error}=await supabase.rpc('hd_finance_habit_set',{p_enrollment_id:enrollmentId,p_habit_key:habitKey,p_active:active});if(error)throw error;
 if(!estObjet(data)||data.enrollment_id!==enrollmentId||data.habit_key!==habitKey||data.active!==active||typeof data.effectif_du!=='string')throw Error('Changement non confirmé');
 return data as {enrollment_id:string;habit_key:CleHabitudeFinanciere;active:boolean;effectif_du:string};
}
export async function enregistrerHoraireEpargne(enrollmentId:string,rythme:'quotidien'|'hebdomadaire',creneau:CreneauFinancier){
 validerCreneau(creneau);
 const jours=rythme==='quotidien'?[1,2,3,4,5,6,7]:creneau.jours_iso;
 if(rythme==='hebdomadaire'&&jours.length!==1)throw Error('Choisis un seul jour pour le rappel hebdomadaire.');
 const {data,error}=await supabase.rpc('hd_finance_savings_schedule_set',{p_enrollment_id:enrollmentId,p_rythme:rythme,p_heure_locale:creneau.heure_locale,p_jours_iso:jours});if(error)throw error;
 if(!estObjet(data)||data.enrollment_id!==enrollmentId||data.rythme!==rythme||typeof data.effectif_du!=='string')throw Error('Horaire d’épargne non confirmé');
 return data as {enrollment_id:string;rythme:'quotidien'|'hebdomadaire';effectif_du:string};
}
export async function enregistrerHoraireFinancier(enrollmentId:string,habitKey:'offrande'|'remboursement_dette',creneau:CreneauFinancier){
 validerCreneau(creneau);
 const {data,error}=await supabase.rpc('hd_finance_schedule_set',{p_enrollment_id:enrollmentId,p_habit_key:habitKey,p_creneau:creneau});if(error)throw error;
 if(!estObjet(data)||data.enrollment_id!==enrollmentId||data.habit_key!==habitKey||typeof data.effectif_du!=='string')throw Error('Horaire financier non confirmé');
 return data as {enrollment_id:string;habit_key:'offrande'|'remboursement_dette';effectif_du:string};
}
function validerCreneau(c:CreneauFinancier){
 if(!c||typeof c.creneau_id!=='string'||!/^[a-z0-9_]{1,32}$/.test(c.creneau_id)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.heure_locale)||!Array.isArray(c.jours_iso)||!c.jours_iso.length||c.jours_iso.length>7||new Set(c.jours_iso).size!==c.jours_iso.length||c.jours_iso.some(j=>!Number.isInteger(j)||j<1||j>7))throw Error('Créneau financier invalide');
}
