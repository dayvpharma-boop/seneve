import {supabase} from './supabase';
import {deviseAcceptee,montantValidePourDevise} from './devises';
export type Creance={loan_id:string;borrower:string;amount:string;currency:string;loan_date:string;due_date:string|null;payments:{payment_id:string;amount:string;payment_date:string}[]};
export const centsCreance=(s:string)=>Math.round(Number(s)*100);
export const resteCreance=(l:Creance)=>centsCreance(l.amount)-l.payments.reduce((n,p)=>n+centsCreance(p.amount),0);
export function analyserCreances(v:unknown):{enrollment_id:string;loans:Creance[]} {
 const d=v as {enrollment_id:string;loans:Creance[]};
 const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(s);
 const date=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
 if(!d||!uuid(d.enrollment_id)||!Array.isArray(d.loans)||d.loans.some(l=>!l||!uuid(l.loan_id)||typeof l.borrower!=='string'||!l.borrower.trim()||!deviseAcceptee(l.currency)||typeof l.amount!=='string'||!montantValidePourDevise(l.amount.replace(/\.00$/,''),l.currency)||Number(l.amount)<=0||!date(l.loan_date)||(l.due_date!==null&&!date(l.due_date))||!Array.isArray(l.payments)||l.payments.some(p=>!p||!uuid(p.payment_id)||typeof p.amount!=='string'||!montantValidePourDevise(p.amount.replace(/\.00$/,''),l.currency)||Number(p.amount)<=0||!date(p.payment_date))||resteCreance(l)<0))throw Error('Suivi incohérent');
 return d;
}
export async function chargerCreances(){const {data,error}=await supabase.rpc('hd_finance_receivables_get',{p_enrollment_id:null});if(error)throw error;return analyserCreances(data);}
export async function saisirCreance(args:Record<string,unknown>,paiement=false){const {data,error}=await supabase.rpc(paiement?'hd_finance_receivable_payment_add':'hd_finance_receivable_add',args);if(error)throw error;if(!data||(paiement?data.payment_id:data.loan_id)!==args.p_request_id)throw Error('Enregistrement non confirmé');}
