import {supabase} from '@/lib/supabase';

/** SÉNEVÉ Bénéfices (décision de Dr Justin du 11/11/2026, une seule activité) : lecture des ventes déjà notées
 * dans SÉNEVÉ Répartition (Commerçant). Bénéfice = ventes − marchandises − autres frais − charges du mois payées. */
export type Vente={id:string;currency:string;date_locale:string;gross:string;goods:string;other:string;charges:string};
export type Revenu={id:string;currency:string;date_locale:string;amount:string};
export type Benefices={ventes:Vente[];revenus:Revenu[];resteARepartir?:Record<string,string>};
export type BilanMois={ventes:number;marchandises:number;frais:number;charges:number;benefice:number;nbVentes:number;revenus:number};

const montant=(v:unknown)=>typeof v==='string'&&/^-?\d{1,14}(?:\.\d{1,4})?$/.test(v);
const jour=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const objet=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

export async function chargerBenefices(enrollmentId:string):Promise<Benefices>{
 const {data,error}=await supabase.rpc('hd_finance_benefices_get',{p_enrollment_id:enrollmentId});
 if(error)throw error;
 if(!objet(data))throw Error('Bénéfices incohérents');
 const ventes=(Array.isArray(data.ventes)?data.ventes:[]).filter((v):v is Vente=>objet(v)&&typeof v.id==='string'&&typeof v.currency==='string'&&jour(v.date_locale)&&montant(v.gross)&&montant(v.goods)&&montant(v.other)&&montant(v.charges));
 const revenus=(Array.isArray(data.revenus)?data.revenus:[]).filter((v):v is Revenu=>objet(v)&&typeof v.id==='string'&&typeof v.currency==='string'&&jour(v.date_locale)&&montant(v.amount));
 const reste=objet(data.reste_a_repartir)?Object.fromEntries(Object.entries(data.reste_a_repartir).filter((e):e is [string,string]=>montant(e[1]))):{};
 return {ventes,revenus,resteARepartir:reste};
}

const c=(v:string)=>Math.round(Number(v)*100);
/** Bilan d'un mois « AAAA-MM » dans une monnaie, en centimes. */
export function bilanDuMois(b:Benefices,mois:string,devise:string):BilanMois{
 const r:BilanMois={ventes:0,marchandises:0,frais:0,charges:0,benefice:0,nbVentes:0,revenus:0};
 for(const v of b.ventes)if(v.currency===devise&&v.date_locale.startsWith(mois)){r.ventes+=c(v.gross);r.marchandises+=c(v.goods);r.frais+=c(v.other);r.charges+=c(v.charges);r.nbVentes++;}
 for(const v of b.revenus)if(v.currency===devise&&v.date_locale.startsWith(mois))r.revenus+=c(v.amount);
 r.benefice=r.ventes-r.marchandises-r.frais-r.charges;
 return r;
}
/** Les n derniers mois jusqu'à « mois » inclus, du plus ancien au plus récent. */
export function derniersMois(mois:string,n:number){
 const [a=2000,m=1]=mois.split('-').map(Number);
 return Array.from({length:n},(_,i)=>{const d=new Date(a,m-1-(n-1-i),1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;});
}
