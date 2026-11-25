import {supabase} from './supabase';
import {deviseAcceptee,montantValidePourDevise} from './devises';
export type Remboursement={payment_id:string;amount:string;payment_date:string};
export type Creance={loan_id:string;borrower:string;amount:string;currency:string;loan_date:string;due_date:string|null;note?:string|null;payments:Remboursement[]};
export type SuiviCreances={enrollment_id:string;loans:Creance[]};
export const centsCreance=(s:string)=>Math.round(Number(s)*100);
export const recuCreance=(l:Creance)=>l.payments.reduce((n,p)=>n+centsCreance(p.amount),0);
export const resteCreance=(l:Creance)=>centsCreance(l.amount)-recuCreance(l);
export function analyserCreances(v:unknown):SuiviCreances {
 const d=v as SuiviCreances;
 const uuid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(s);
 const date=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
 if(!d||!uuid(d.enrollment_id)||!Array.isArray(d.loans)||d.loans.some(l=>!l||!uuid(l.loan_id)||typeof l.borrower!=='string'||!l.borrower.trim()||!deviseAcceptee(l.currency)||typeof l.amount!=='string'||!montantValidePourDevise(l.amount.replace(/\.00$/,''),l.currency)||Number(l.amount)<=0||!date(l.loan_date)||(l.due_date!==null&&!date(l.due_date))||(l.note!=null&&typeof l.note!=='string')||!Array.isArray(l.payments)||l.payments.some(p=>!p||!uuid(p.payment_id)||typeof p.amount!=='string'||!montantValidePourDevise(p.amount.replace(/\.00$/,''),l.currency)||Number(p.amount)<=0||!date(p.payment_date))||resteCreance(l)<0))throw Error('Suivi incohérent');
 return d;
}
export async function chargerCreances(){const {data,error}=await supabase.rpc('hd_finance_receivables_get',{p_enrollment_id:null});if(error)throw error;return analyserCreances(data);}
/** Ajoute un remboursement (paiement=true) ou un prêt par l'ancienne voie. */
export async function saisirCreance(args:Record<string,unknown>,paiement=false){const {data,error}=await supabase.rpc(paiement?'hd_finance_receivable_payment_add':'hd_finance_receivable_add',args);if(error)throw error;if(!data||(paiement?data.payment_id:data.loan_id)!==args.p_request_id)throw Error('Enregistrement non confirmé');}
/** Crée ou corrige un prêt (même identifiant = même prêt, rejouable sans doublon). */
export async function enregistrerPret(args:{p_enrollment_id:string;p_loan_id:string;p_borrower:string;p_amount:string;p_currency:string;p_loan_date:string;p_due_date:string|null;p_note:string|null}){const {data,error}=await supabase.rpc('hd_finance_receivable_save',args);if(error)throw error;if(!data||data.loan_id!==args.p_loan_id)throw Error('Enregistrement non confirmé');}
export async function supprimerPret(enrollment:string,loan:string){const {error}=await supabase.rpc('hd_finance_receivable_delete',{p_enrollment_id:enrollment,p_loan_id:loan});if(error)throw error;}
export async function supprimerRemboursement(enrollment:string,payment:string){const {error}=await supabase.rpc('hd_finance_receivable_payment_delete',{p_enrollment_id:enrollment,p_payment_id:payment});if(error)throw error;}

/** Nombre de jours entre aujourd'hui (date locale « AAAA-MM-JJ ») et une date. Négatif = passé. */
export function joursAvant(date:string,aujourdhui:string){const j=(s:string)=>{const [a,m,d]=s.split('-').map(Number);return Date.UTC(a!,m!-1,d!)/864e5;};return Math.round(j(date)-j(aujourdhui));}
export type Personne={cle:string;nom:string;prets:Creance[];prochaine:string|null;retard:number|null;enCours:boolean};
export const cleNom=(s:string)=>s.trim().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').toLowerCase();
/** Regroupe les prêts par personne (même nom, sans tenir compte des accents ni des majuscules). */
export function regrouperParPersonne(prets:Creance[],aujourdhui:string):Personne[]{
 const m=new Map<string,Creance[]>();
 for(const p of prets){const c=cleNom(p.borrower);m.set(c,[...(m.get(c)??[]),p]);}
 return [...m].map(([cle,liste])=>{
  const actifs=liste.filter(x=>resteCreance(x)>0),dates=actifs.map(x=>x.due_date).filter((x):x is string=>!!x).sort();
  const prochaine=dates[0]??null;
  return {cle,nom:liste[0]!.borrower,prets:liste,prochaine,retard:prochaine?joursAvant(prochaine,aujourdhui):null,enCours:actifs.length>0};
 }).sort((a,b)=>(a.retard??1e9)-(b.retard??1e9)||a.nom.localeCompare(b.nom));
}
