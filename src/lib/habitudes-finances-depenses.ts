import {supabase} from '@/lib/supabase';

/** SÉNEVÉ Dépenses (décision de Dr Justin du 11/11/2026) : noter une dépense par catégorie, « juste pour savoir ».
 * La dépense fait aussi baisser la caisse « Pour vivre » quand elle la couvre (le serveur décide et le dit). */
export const CATEGORIES_DEPENSES=['nourriture','transport','logement','famille','ecole','sante','communication','autre'] as const;
export type CategorieDepense=typeof CATEGORIES_DEPENSES[number];
export type Depense={expense_id:string;category:CategorieDepense;amount:string;currency:string;date_locale:string;note:string|null;liee:boolean;move_id?:string|null;created_at:string};

export const INFOS_CATEGORIES:Record<CategorieDepense,{fr:string;en:string;icone:string;couleur:string}>={
 nourriture:{fr:'Nourriture',en:'Food',icone:'restaurant',couleur:'#ff9500'},
 transport:{fr:'Transport',en:'Transport',icone:'directions_bus',couleur:'#007aff'},
 logement:{fr:'Logement',en:'Housing',icone:'home',couleur:'#5856d6'},
 famille:{fr:'Famille',en:'Family',icone:'diversity_1',couleur:'#ff2d55'},
 ecole:{fr:'École',en:'School',icone:'school',couleur:'#af52de'},
 sante:{fr:'Santé',en:'Health',icone:'favorite',couleur:'#34c759'},
 communication:{fr:'Communication',en:'Communication',icone:'call',couleur:'#30b0c7'},
 autre:{fr:'Autre',en:'Other',icone:'more_horiz',couleur:'#8e8e93'},
};

const estDepense=(v:unknown):v is Depense=>{
 if(!v||typeof v!=='object')return false;const d=v as Record<string,unknown>;
 return typeof d.expense_id==='string'&&CATEGORIES_DEPENSES.includes(d.category as CategorieDepense)&&typeof d.amount==='string'&&/^\d{1,12}(?:\.\d{1,4})?$/.test(d.amount)
  &&typeof d.currency==='string'&&typeof d.date_locale==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date_locale)&&typeof d.liee==='boolean';
};

export async function chargerDepenses(enrollmentId:string):Promise<Depense[]>{
 const {data,error}=await supabase.rpc('hd_finance_expenses_get',{p_enrollment_id:enrollmentId});
 if(error)throw error;
 return Array.isArray(data)?data.filter(estDepense):[];
}

export async function noterDepense(enrollmentId:string,categorie:CategorieDepense,montant:string,devise:string,dateLocale:string,note:string,requestId:string){
 const {data,error}=await supabase.rpc('hd_finance_expense_add',{p_enrollment_id:enrollmentId,p_category:categorie,p_amount:montant,p_currency:devise,p_date_locale:dateLocale,p_note:note.trim()||null,p_request_id:requestId});
 if(error)throw error;
 const r=(data??{}) as {liee?:boolean;balance?:string};
 return {liee:r.liee===true,soldeVivre:typeof r.balance==='string'?r.balance:null};
}

export async function annulerDepense(enrollmentId:string,expenseId:string){
 const {error}=await supabase.rpc('hd_finance_expense_void',{p_enrollment_id:enrollmentId,p_expense_id:expenseId});
 if(error)throw error;
}

/** Total par catégorie (en centimes) pour les dépenses d'un mois « AAAA-MM » dans une monnaie. */
export function totauxDuMois(depenses:Depense[],mois:string,devise:string){
 const t=Object.fromEntries(CATEGORIES_DEPENSES.map(c=>[c,0])) as Record<CategorieDepense,number>;
 let total=0;
 for(const d of depenses)if(d.currency===devise&&d.date_locale.startsWith(mois)){const c=Math.round(Number(d.amount)*100);t[d.category]+=c;total+=c;}
 return {parCategorie:t,total};
}

const anneeMois=(mois:string)=>{const [a=0,m=1]=mois.split('-').map(Number);return [a,m] as const;};
export const moisPrecedent=(mois:string)=>{const [a,m]=anneeMois(mois);return m===1?`${a-1}-12`:`${a}-${String(m-1).padStart(2,'0')}`;};
export const moisSuivant=(mois:string)=>{const [a,m]=anneeMois(mois);return m===12?`${a+1}-01`:`${a}-${String(m+1).padStart(2,'0')}`;};
