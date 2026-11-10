import {supabase} from './supabase';

type Repere={id:string;kind:0|1;created_at:string};
type MouvementCommun=Repere&{date_locale:string;amount:string;balance:string};
export type MouvementSolde=MouvementCommun&(
 {kind:0;net:string;removal_block:'charges'|'allocation'|null} |
 {kind:1}
);
/** nouveau : part du solde jamais répartie (pourcentages) ; absent sur un serveur ancien = tout le solde. */
export type SoldeMisAJour={disponible:string;dimeRestante:string;nouveau?:string};

const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const montant=(v:unknown):v is string=>typeof v==='string'&&/^\d+(?:\.\d{1,2})?$/.test(v)&&Number.isSafeInteger(Math.round(Number(v)*100));
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));

function analyserMouvement(v:unknown):MouvementSolde{
 if(!objet(v)||typeof v.id!=='string'||typeof v.created_at!=='string'||!Number.isFinite(Date.parse(v.created_at))
  ||!date(v.date_locale)||!montant(v.amount)||typeof v.balance!=='string'||!montant(v.balance.replace(/^-/,'')))throw Error('Mouvement du solde incohérent');
 const commun={id:v.id,created_at:v.created_at,date_locale:v.date_locale,amount:v.amount,balance:v.balance};
 if(v.kind===1)return {...commun,kind:1};
 if(v.kind===0&&montant(v.net)&&(v.removal_block===null||v.removal_block==='charges'||v.removal_block==='allocation'))
  return {...commun,kind:0,net:v.net,removal_block:v.removal_block};
 throw Error('Type de mouvement incohérent');
}

export async function chargerHistoriqueSolde(devise:string,avant?:Repere){
 const {data,error}=await supabase.rpc('hd_finance_business_balance_history',{
  p_currency:devise,p_before_at:avant?.created_at??null,p_before_kind:avant?.kind??null,p_before_id:avant?.id??null,
 });
 if(error)throw error;
 if(!objet(data)||!Array.isArray(data.items)||typeof data.has_more!=='boolean')throw Error('Historique du solde incohérent');
 return {mouvements:data.items.map(analyserMouvement),suite:data.has_more};
}

export async function supprimerEncaissementDuSolde(devise:string,id:string):Promise<SoldeMisAJour>{
 const {data,error}=await supabase.rpc('hd_finance_business_receipt_void',{p_currency:devise,p_receipt_id:id});
 if(error)throw error;
 if(!objet(data)||data.receipt_id!==id||!montant(data.available_amount)||!montant(data.tithe_due))
  throw Error('Suppression de l’encaissement non confirmée');
 return {disponible:data.available_amount,dimeRestante:data.tithe_due,...(montant(data.fresh_amount)?{nouveau:data.fresh_amount}:{})};
}
