import {supabase} from './supabase';
import {deviseAcceptee,montantValidePourDevise} from './devises';

/** Compteurs « Quand je reçois de l'argent » (07/11/2026) : dîme, offrande, pour vivre (entrées et sorties),
 * retraits sur les objectifs d'épargne et enregistrement d'une répartition entière (tout ou rien).
 * Aucun argent ne bouge : la personne déclare, SÉNEVÉ note. */
export type Enveloppe='dime'|'offrande'|'vivre';
export type Motif='donne'|'depense'|'investi'|'autre';
export type MouvementCompteur={move_id:string;envelope:Enveloppe;direction:'entree'|'sortie';motif:Motif|null;amount:string;currency:string;date_locale:string;remise_a_zero:boolean;allocation_id:string|null;created_at?:string};
export type RetraitEpargne={withdrawal_id:string;goal_id:string;motif:Motif;amount:string;date_locale:string;remise_a_zero:boolean;created_at?:string};
export type Compteurs={enrollment_id:string;moves:MouvementCompteur[];withdrawals:RetraitEpargne[]};
export type PartRepartition=
 |{part:Enveloppe;amount:string}
 |{part:'reserve_joie'|'epargne_investir'|'autre';goal_id:string;amount:string}
 |{part:'dettes';debt_id:string;amount:string};

const ENVELOPPES:readonly string[]=['dime','offrande','vivre'];
const MOTIFS:readonly string[]=['donne','depense','investi','autre'];
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const montant=(v:unknown):v is string=>typeof v==='string'&&/^\d{1,10}(?:\.\d{1,2})?$/.test(v)&&Number(v)>0;
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** La base n'a pas encore les compteurs (fonction absente) : l'écran l'explique au lieu d'afficher une erreur. */
export class CompteursIndisponibles extends Error{}
function absente(e:unknown){const x=e as {code?:string;message?:string}|null;return x?.code==='PGRST202'||x?.code==='42883'||/Could not find the function/i.test(x?.message??'');}

function analyser(v:unknown):Compteurs{
 if(!objet(v)||!uuid(v.enrollment_id)||!Array.isArray(v.moves)||!Array.isArray(v.withdrawals))throw Error('Compteurs incohérents');
 const moves=v.moves.map(m=>{if(!objet(m)||!uuid(m.move_id)||!ENVELOPPES.includes(String(m.envelope))||(m.direction!=='entree'&&m.direction!=='sortie')||!montant(m.amount)||typeof m.currency!=='string'||!date(m.date_locale)||(m.motif!==null&&!MOTIFS.includes(String(m.motif))))throw Error('Mouvement incohérent');
  return {move_id:m.move_id,envelope:m.envelope as Enveloppe,direction:m.direction as 'entree'|'sortie',motif:(m.motif??null) as Motif|null,amount:m.amount,currency:m.currency,date_locale:m.date_locale,remise_a_zero:m.remise_a_zero===true,allocation_id:uuid(m.allocation_id)?m.allocation_id:null,...(typeof m.created_at==='string'?{created_at:m.created_at}:{})};});
 const withdrawals=v.withdrawals.map(w=>{if(!objet(w)||!uuid(w.withdrawal_id)||!uuid(w.goal_id)||!MOTIFS.includes(String(w.motif))||!montant(w.amount)||!date(w.date_locale))throw Error('Retrait incohérent');
  return {withdrawal_id:w.withdrawal_id,goal_id:w.goal_id,motif:w.motif as Motif,amount:w.amount,date_locale:w.date_locale,remise_a_zero:w.remise_a_zero===true,...(typeof w.created_at==='string'?{created_at:w.created_at}:{})};});
 return {enrollment_id:v.enrollment_id,moves,withdrawals};
}

export async function chargerCompteurs(enrollmentId:string):Promise<Compteurs>{
 const {data,error}=await supabase.rpc('hd_finance_counters_get',{p_enrollment_id:enrollmentId});
 if(error){if(absente(error))throw new CompteursIndisponibles();throw error;}
 return analyser(data);
}

export async function enregistrerRepartition(enrollmentId:string,devise:string,dateLocale:string,parts:PartRepartition[],requestId:string,depuisEncaissements=false){
 if(!deviseAcceptee(devise)||!date(dateLocale)||!parts.length||parts.some(p=>!montantValidePourDevise(p.amount,devise)||Number(p.amount)<=0))throw Error('Répartition invalide');
 const {data,error}=await supabase.rpc(depuisEncaissements?'hd_finance_business_allocation_save':'hd_finance_allocation_save',{p_enrollment_id:enrollmentId,p_currency:devise,p_date_locale:dateLocale,p_parts:parts,p_request_id:requestId});
 if(error){if(absente(error))throw new CompteursIndisponibles();throw error;}
 if(!objet(data)||data.allocation_id!==requestId)throw Error('Répartition non confirmée');
 return data;
}

/** Sortie d'un compteur. `toutUtilise` : le montant est le disponible entier et le compteur repart de zéro. */
export async function noterSortieCompteur(enrollmentId:string,enveloppe:Enveloppe,motif:Motif,montantSaisi:string|null,devise:string,dateLocale:string,toutUtilise:boolean,requestId:string){
 if(!toutUtilise&&(!montantSaisi||!montantValidePourDevise(montantSaisi,devise)||Number(montantSaisi)<=0))throw Error('Montant invalide');
 const {data,error}=await supabase.rpc('hd_finance_envelope_move_add',{p_enrollment_id:enrollmentId,p_envelope:enveloppe,p_direction:'sortie',p_motif:motif,p_amount:toutUtilise?null:montantSaisi,p_currency:devise,p_date_locale:dateLocale,p_remise_a_zero:toutUtilise,p_request_id:requestId});
 if(error){if(absente(error))throw new CompteursIndisponibles();throw error;}
 if(!objet(data)||data.move_id!==requestId)throw Error('Sortie non confirmée');
 return data as {move_id:string;amount:string;balance:string};
}

export async function noterRetraitEpargne(enrollmentId:string,goalId:string,motif:Motif,montantSaisi:string|null,devise:string,dateLocale:string,toutUtilise:boolean,requestId:string){
 if(!toutUtilise&&(!montantSaisi||!montantValidePourDevise(montantSaisi,devise)||Number(montantSaisi)<=0))throw Error('Montant invalide');
 const {data,error}=await supabase.rpc('hd_finance_savings_withdraw_add',{p_enrollment_id:enrollmentId,p_goal_id:goalId,p_motif:motif,p_amount:toutUtilise?null:montantSaisi,p_date_locale:dateLocale,p_remise_a_zero:toutUtilise,p_request_id:requestId});
 if(error){if(absente(error))throw new CompteursIndisponibles();throw error;}
 if(!objet(data)||data.withdrawal_id!==requestId)throw Error('Retrait non confirmé');
 return data as {withdrawal_id:string;amount:string;balance:string};
}

/** Effacer le bilan (DÉFINITIF, 08/11/2026). quoi : un motif de sortie, 'dettes' (remboursements) ou 'tout'.
 * depuis : début de la période choisie, ou null pour tout l'historique. 'tout' exige confirmation='EFFACER'. */
export type QuoiEffacer=Motif|'dettes'|'tout';
export async function effacerBilan(enrollmentId:string,devise:string,depuis:string|null,quoi:QuoiEffacer,confirmation:string|null){
 const {data,error}=await supabase.rpc('hd_finance_bilan_effacer',{p_enrollment_id:enrollmentId,p_currency:devise,p_depuis:depuis,p_quoi:quoi,p_confirmation:confirmation});
 if(error){if(absente(error))throw new CompteursIndisponibles();throw error;}
 if(!objet(data))throw Error('Effacement non confirmé');
 return data as Record<string,number>;
}
const centimes=(v:string)=>Math.round(Number(v)*100);
/** Disponible d'un compteur, en centimes, pour une monnaie. */
export function disponibleCompteur(c:Compteurs,enveloppe:Enveloppe,devise:string){
 return c.moves.filter(m=>m.envelope===enveloppe&&m.currency===devise).reduce((n,m)=>n+(m.direction==='entree'?1:-1)*centimes(m.amount),0);
}
/** Disponible d'un objectif d'épargne, en centimes : versements − retraits. */
export function disponibleObjectif(c:Compteurs|null,goalId:string,versements:{amount:string}[]){
 return versements.reduce((n,v)=>n+centimes(v.amount),0)-(c?.withdrawals.filter(w=>w.goal_id===goalId).reduce((n,w)=>n+centimes(w.amount),0)??0);
}
