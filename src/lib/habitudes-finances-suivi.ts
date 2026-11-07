import {supabase} from './supabase';
import {deviseAcceptee,montantValidePourDevise} from './devises';

export type TypeObjectifEpargne='reserve_joie'|'epargne_investir'|'autre';
export type VersementEpargne={entry_id:string;amount:string;date_locale:string};
export type ObjectifEpargne={goal_id:string;goal_type:TypeObjectifEpargne;label:string;target_amount:string;currency:string;entries:VersementEpargne[]};
export type PaiementDette={payment_id:string;amount:string;date_locale:string};
export type RythmeRepereDette='mensuel'|'hebdomadaire';
type RepereDette={base:string;pourcentage:string;rythme:RythmeRepereDette};
export type DetteSuivie={debt_id:string;debt_number:number;opening_balance:string;currency:string;repere:RepereDette|null;payments:PaiementDette[]};
export type SuiviFinancier={enrollment_id:string;savings_goals:ObjectifEpargne[];debts:DetteSuivie[]};
const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const montant=(v:unknown)=>typeof v==='string'&&/^\d{1,10}(?:\.\d{1,2})?$/.test(v)&&Number(v)>=0;
const montantFixe=(v:string)=>Number(v).toFixed(2);
const dateLocale=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
function analyserListe<T>(v:unknown,analyser:(x:unknown)=>T):T[]{if(!Array.isArray(v))throw Error('Suivi financier incohérent');return v.map(analyser);}
function analyserVersement(v:unknown):VersementEpargne{if(!objet(v)||!uuid(v.entry_id)||!montant(v.amount)||Number(v.amount)<=0||!dateLocale(v.date_locale))throw Error('Versement d’épargne incohérent');return {entry_id:v.entry_id as string,amount:v.amount as string,date_locale:v.date_locale as string};}
function analyserPaiement(v:unknown):PaiementDette{if(!objet(v)||!uuid(v.payment_id)||!montant(v.amount)||Number(v.amount)<=0||!dateLocale(v.date_locale))throw Error('Remboursement incohérent');return {payment_id:v.payment_id as string,amount:v.amount as string,date_locale:v.date_locale as string};}
function analyserObjectif(v:unknown):ObjectifEpargne{if(!objet(v)||!uuid(v.goal_id)||!['reserve_joie','epargne_investir','autre'].includes(String(v.goal_type))||typeof v.label!=='string'||!v.label.trim()||!montant(v.target_amount)||Number(v.target_amount)<=0||typeof v.currency!=='string'||!/^[A-Z]{3}$/.test(v.currency))throw Error('Objectif d’épargne incohérent');return {goal_id:v.goal_id as string,goal_type:v.goal_type as TypeObjectifEpargne,label:v.label,target_amount:v.target_amount as string,currency:v.currency,entries:analyserListe(v.entries,analyserVersement)};}
function analyserRepereDette(v:Record<string,unknown>):RepereDette|null {
  const hebdomadaire=v.weekly_basis!=null||v.weekly_repayment_percent!=null;
  const base=hebdomadaire?v.weekly_basis:v.monthly_basis;
  const pourcentage=hebdomadaire?v.weekly_repayment_percent:v.repayment_percent;
  if (base===null&&pourcentage===null) return null;
  if ((hebdomadaire&&(v.monthly_basis!==null||v.repayment_percent!==null))||
      typeof base!=='string'||!montant(base)||
      typeof pourcentage!=='string'||!montant(pourcentage)||Number(pourcentage)>100) {
    throw Error('Repère de remboursement incohérent');
  }
  return {base,pourcentage,rythme:hebdomadaire?'hebdomadaire':'mensuel'};
}
function analyserDette(v:unknown):DetteSuivie {
  if (!objet(v)||!uuid(v.debt_id)||!Number.isInteger(v.debt_number)||Number(v.debt_number)<1||
      typeof v.opening_balance!=='string'||!montant(v.opening_balance)||Number(v.opening_balance)<=0||
      typeof v.currency!=='string'||!/^[A-Z]{3}$/.test(v.currency)) throw Error('Dette incohérente');
  return {debt_id:v.debt_id,debt_number:Number(v.debt_number),opening_balance:v.opening_balance,
    currency:v.currency,repere:analyserRepereDette(v),payments:analyserListe(v.payments,analyserPaiement)};
}
function verifierReponse(v:unknown,enrollmentId:string|null):SuiviFinancier {
  if (!objet(v)||!uuid(v.enrollment_id)||(enrollmentId!==null&&v.enrollment_id!==enrollmentId)) throw Error('Suivi financier incohérent');
  return {enrollment_id:v.enrollment_id,savings_goals:analyserListe(v.savings_goals,analyserObjectif),debts:analyserListe(v.debts,analyserDette)};
}
export async function chargerSuiviFinancier(enrollmentId:string|null) {
  const {data,error}=await supabase.rpc('hd_finance_tracker_get',{p_enrollment_id:enrollmentId});
  if (error) throw error;
  return data===null&&enrollmentId===null ? null : verifierReponse(data,enrollmentId);
}
export async function creerObjectifEpargne(enrollmentId:string,d:{type:TypeObjectifEpargne;label:string;target:string;currency:string},requestId:string){if(!d.label.trim()||d.label.trim().length>60||!montantValidePourDevise(d.target,d.currency)||Number(d.target)<=0||!deviseAcceptee(d.currency))throw Error('Objectif invalide');const target=montantFixe(d.target);const {data,error}=await supabase.rpc('hd_finance_savings_goal_add',{p_enrollment_id:enrollmentId,p_goal_type:d.type,p_label:d.label.trim(),p_target_amount:target,p_currency:d.currency,p_request_id:requestId});if(error)throw error;if(!objet(data)||data.goal_id!==requestId||data.goal_type!==d.type||data.label!==d.label.trim()||data.target_amount!==target||data.currency!==d.currency)throw Error('Création de l’objectif non confirmée');return data;}
export async function enregistrerVersementEpargne(enrollmentId:string,goalId:string,amount:string,date:string,currency:string,requestId:string){if(!uuid(goalId)||!montantValidePourDevise(amount,currency)||Number(amount)<=0||!deviseAcceptee(currency)||!dateLocale(date))throw Error('Versement invalide');const value=montantFixe(amount);const {data,error}=await supabase.rpc('hd_finance_savings_entry_add',{p_enrollment_id:enrollmentId,p_goal_id:goalId,p_amount:value,p_date_locale:date,p_request_id:requestId});if(error)throw error;if(!objet(data)||data.entry_id!==requestId||data.goal_id!==goalId||data.amount!==value||data.date_locale!==date)throw Error('Versement non confirmé');return data;}
export async function creerDetteSuivie(
  enrollmentId:string,
  d:{openingBalance:string;currency:string;repere:RepereDette|null},
  requestId:string
) {
  const {repere}=d;
  if (!deviseAcceptee(d.currency)||!montantValidePourDevise(d.openingBalance,d.currency)||Number(d.openingBalance)<=0||
      (repere&&(!montantValidePourDevise(repere.base,d.currency)||!montant(repere.pourcentage)||Number(repere.pourcentage)>100))) {
    throw Error('Dette invalide');
  }
  const openingBalance=montantFixe(d.openingBalance);
  const base=repere?montantFixe(repere.base):null;
  const {data,error}=await supabase.rpc('hd_finance_debt_add_with_guide',{
    p_enrollment_id:enrollmentId,p_opening_balance:openingBalance,p_currency:d.currency,
    p_monthly_basis:repere?.rythme==='mensuel'?base:null,
    p_weekly_basis:repere?.rythme==='hebdomadaire'?base:null,
    p_repayment_percent:repere?.pourcentage??null,p_request_id:requestId
  });
  if (error) throw error;
  if (!objet(data)||data.debt_id!==requestId||!Number.isInteger(data.debt_number)||
      Number(data.debt_number)<1||data.opening_balance!==openingBalance||data.currency!==d.currency) {
    throw Error('Création de dette non confirmée');
  }
  const repereEnregistre=analyserRepereDette(data);
  if (repereEnregistre?.base!==(base??undefined)||repereEnregistre?.rythme!==repere?.rythme||
      repereEnregistre?.pourcentage!==(repere?montantFixe(repere.pourcentage):undefined)) {
    throw Error('Repère de remboursement non confirmé');
  }
  return data;
}
export async function enregistrerPaiementDette(enrollmentId:string,debtId:string,amount:string,date:string,currency:string,requestId:string){if(!uuid(debtId)||!montantValidePourDevise(amount,currency)||Number(amount)<=0||!deviseAcceptee(currency)||!dateLocale(date))throw Error('Remboursement invalide');const value=montantFixe(amount);const {data,error}=await supabase.rpc('hd_finance_debt_payment_add',{p_enrollment_id:enrollmentId,p_debt_id:debtId,p_amount:value,p_date_locale:date,p_request_id:requestId});if(error)throw error;if(!objet(data)||data.payment_id!==requestId||data.debt_id!==debtId||data.amount!==value||data.date_locale!==date||!montant(data.remaining))throw Error('Remboursement non confirmé');return data;}
