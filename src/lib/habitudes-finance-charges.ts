import {supabase} from './supabase';

type ChargeEntreprisePaiement={payment_id:string;amount:string;date_locale:string};
export type ChargeEntreprise={charge_id:string;label:string;expected_amount:string;currency:string;period_start:string;period_end:string;payments:ChargeEntreprisePaiement[]};
const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const montant=(v:unknown)=>typeof v==='string'&&/^\d{1,10}(?:\.\d{1,2})?$/.test(v)&&Number(v)>0;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
function analyser(data:unknown,enrollmentId:string):ChargeEntreprise[]{
 if(!objet(data)||data.enrollment_id!==enrollmentId||!Array.isArray(data.charges))throw Error('Suivi des charges incohérent');
 return data.charges.map((x:unknown)=>{
  if(!objet(x)||!uuid(x.charge_id)||typeof x.label!=='string'||!montant(x.expected_amount)||typeof x.currency!=='string'||!/^[A-Z]{3}$/.test(x.currency)||!date(x.period_start)||!date(x.period_end)||!Array.isArray(x.payments))throw Error('Charge incohérente');
  const payments=x.payments.map((p:unknown)=>{if(!objet(p)||!uuid(p.payment_id)||!montant(p.amount)||!date(p.date_locale))throw Error('Paiement de charge incohérent');return {payment_id:p.payment_id as string,amount:p.amount as string,date_locale:p.date_locale as string};});
  return {charge_id:x.charge_id as string,label:x.label,expected_amount:x.expected_amount as string,currency:x.currency,period_start:x.period_start as string,period_end:x.period_end as string,payments};
 });
}
export async function chargerChargesEntreprise(enrollmentId:string,dateLocale:string,currency:string){
 const {data,error}=await supabase.rpc('hd_finance_business_charges_get',{p_enrollment_id:enrollmentId,p_date:dateLocale,p_currency:currency});
 if(error)throw error;if(data===null)return null;return analyser(data,enrollmentId);
}
export async function creerChargeEntreprise(enrollmentId:string,d:{label:string;amount:string;currency:string;start:string;end:string},requestId:string){
 if(!uuid(requestId)||!d.label.trim()||d.label.trim().length>80||!/^\d{4}-\d{2}-\d{2}$/.test(d.start)||!/^\d{4}-\d{2}-\d{2}$/.test(d.end)||d.end<d.start)throw Error('Charge invalide');
 const amount=Number(d.amount).toFixed(2);
 const {data,error}=await supabase.rpc('hd_finance_business_charge_add',{p_enrollment_id:enrollmentId,p_label:d.label.trim(),p_expected_amount:amount,p_currency:d.currency,p_period_start:d.start,p_period_end:d.end,p_request_id:requestId});
 if(error)throw error;if(!objet(data)||data.charge_id!==requestId)throw Error('Création de charge non confirmée');return data;
}
export async function enregistrerPaiementCharge(enrollmentId:string,chargeId:string,amount:string,dateLocale:string,requestId:string){
 if(!uuid(chargeId)||!uuid(requestId)||!/^\d{4}-\d{2}-\d{2}$/.test(dateLocale)||!/^\d+(?:[.,]\d{1,2})?$/.test(amount.trim()))throw Error('Paiement invalide');
 const value=Number(amount.replace(',','.')).toFixed(2);
 const {data,error}=await supabase.rpc('hd_finance_business_charge_payment_add',{p_enrollment_id:enrollmentId,p_charge_id:chargeId,p_amount:value,p_date_locale:dateLocale,p_request_id:requestId});
 if(error)throw error;if(!objet(data)||data.payment_id!==requestId||data.charge_id!==chargeId)throw Error('Paiement non confirmé');return data;
}
