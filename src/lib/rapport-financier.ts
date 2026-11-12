import type {Compteurs} from '@/lib/habitudes-finances-compteurs';
import type {SuiviFinancier} from '@/lib/habitudes-finances-suivi';
import {CATEGORIES_DEPENSES,INFOS_CATEGORIES,type CategorieDepense,type Depense} from '@/lib/habitudes-finances-depenses';
import type {Benefices} from '@/lib/habitudes-finances-benefices';

/** SÉNEVÉ Rapport (décision de Dr Justin du 12/11/2026) : tous les calculs financiers d'une période
 * (jour, mois, année ou jours choisis), à lire, imprimer en PDF ou télécharger en Word.
 * Mêmes règles que SÉNEVÉ Compte, Dépenses et Bénéfices : les lignes retirées du bilan (masquées) ne comptent pas. */
export type DonneesRapport={suivi:SuiviFinancier;cpt:Compteurs|null;depenses:Depense[];benefices:Benefices|null};
export type OperationRapport={date:string;heure:string|null;caisse:string;libelle:string;centimes:number;note:string|null};
export type Rapport={
 du:string;au:string;devise:string;
 resume:{encaisse:number;charges:number;benefice:number|null;reparti:number;donne:number;depense:number;investi:number;autre:number;dettes:number;depensesHorsCaisse:number;pasReparti:number|null};
 activite:{ventes:number;marchandises:number;frais:number;charges:number;benefice:number;marge:number|null;nb:number}|null;
 caisses:{nom:string;sous:string;entrees:number;sorties:number;soldeFin:number}[];
 depensesParCategorie:{categorie:CategorieDepense;nom:string;centimes:number;pct:number}[];
 dettes:{nom:string;rembourse:number;reste:number}[];
 operations:OperationRapport[];
};

const c=(v:string)=>Math.round(Number(v)*100);
const dans=(d:string,du:string,au:string)=>d>=du&&d<=au;
const heureDe=(iso?:string)=>{if(!iso)return null;const t=new Date(iso);return Number.isNaN(t.getTime())?null:new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Kinshasa'}).format(t);};

export function construireRapport(d:DonneesRapport,du:string,au:string,devise:string,en=false):Rapport{
 const l=(fr:string,english:string)=>en?english:fr;
 const masque=(id:string)=>d.cpt?.masques?.has(id)??false;
 const nomMotif={donne:l('donné','given'),depense:l('dépensé','spent'),investi:l('investi','invested'),autre:l('autre','other')} as const;
 const nomCat=(k:CategorieDepense)=>en?INFOS_CATEGORIES[k].en:INFOS_CATEGORIES[k].fr;
 const resume={encaisse:0,charges:0,benefice:null as number|null,reparti:0,donne:0,depense:0,investi:0,autre:0,dettes:0,depensesHorsCaisse:0,pasReparti:null as number|null};
 const operations:OperationRapport[]=[];
 const depenseParSortie=new Map(d.depenses.filter(x=>x.move_id).map(x=>[x.move_id as string,x]));

 // Caisses (enveloppes)
 const ENV=[['dime',l('Dîme','Tithe'),l('à donner','to give')],['offrande',l('Offrande','Offering'),l('à donner','to give')],['vivre',l('Pour vivre','For living'),l('dépenses de la maison','household spending')]] as const;
 const caisses:Rapport['caisses']=[];
 for(const [env,nom,sous] of ENV){
  const moves=(d.cpt?.moves??[]).filter(m=>m.envelope===env&&m.currency===devise);
  let entrees=0,sorties=0,soldeFin=0;
  for(const m of moves){
   const v=c(m.amount),signe=m.direction==='entree'?1:-1;
   if(m.date_locale<=au)soldeFin+=signe*v;
   if(!dans(m.date_locale,du,au)||masque(m.move_id))continue;
   if(signe===1){entrees+=v;resume.reparti+=v;}else{sorties+=v;resume[m.motif??'autre']+=v;}
   const dep=signe===-1?depenseParSortie.get(m.move_id):undefined;
   operations.push({date:m.date_locale,heure:heureDe(m.created_at),caisse:nom,libelle:signe===1?l('répartition','allocation'):dep?`${nomMotif.depense} · ${nomCat(dep.category)}`:nomMotif[m.motif??'autre'],centimes:signe*v,note:dep?.note??null});
  }
  if(moves.length)caisses.push({nom,sous,entrees,sorties,soldeFin});
 }
 // Objectifs d'épargne (actifs et mis de côté)
 for(const g of [...d.suivi.savings_goals,...d.suivi.archived_goals].filter(g=>g.currency===devise)){
  const nom=g.goal_type==='reserve_joie'?l('Réserve de joie','Family joy reserve'):g.goal_type==='epargne_investir'?l('Pour investir','For investing'):l('Autre objectif','Other goal');
  let entrees=0,sorties=0,soldeFin=0;
  for(const v of g.entries){const x=c(v.amount);if(v.date_locale<=au)soldeFin+=x;if(dans(v.date_locale,du,au)&&!masque(v.entry_id)){entrees+=x;resume.reparti+=x;operations.push({date:v.date_locale,heure:heureDe(v.created_at),caisse:`${nom} · ${g.label}`,libelle:l('versement','contribution'),centimes:x,note:null});}}
  for(const w of (d.cpt?.withdrawals??[]).filter(w=>w.goal_id===g.goal_id)){const x=c(w.amount);if(w.date_locale<=au)soldeFin-=x;if(dans(w.date_locale,du,au)&&!masque(w.withdrawal_id)){sorties+=x;resume[w.motif]+=x;operations.push({date:w.date_locale,heure:heureDe(w.created_at),caisse:`${nom} · ${g.label}`,libelle:nomMotif[w.motif],centimes:-x,note:null});}}
  if(g.entries.length||sorties)caisses.push({nom,sous:g.label,entrees,sorties,soldeFin});
 }
 // Dettes
 const dettes:Rapport['dettes']=[];
 for(const t of [...d.suivi.debts,...d.suivi.archived_debts].filter(t=>t.currency===devise)){
  const nom=t.creditor_name||l(`Dette ${t.debt_number}`,`Debt ${t.debt_number}`);
  let rembourse=0,avant=0;
  for(const p of t.payments){const x=c(p.amount);if(p.date_locale<=au)avant+=x;if(dans(p.date_locale,du,au)&&!masque(p.payment_id)){rembourse+=x;operations.push({date:p.date_locale,heure:heureDe(p.created_at),caisse:nom,libelle:l('remboursement de dette','debt repayment'),centimes:-x,note:null});}}
  resume.dettes+=rembourse;
  dettes.push({nom,rembourse,reste:Math.max(0,c(t.opening_balance)-avant)});
 }
 // Dépenses (SÉNEVÉ Dépenses), y compris celles hors caisse
 const parCat=new Map<CategorieDepense,number>();
 for(const x of d.depenses.filter(x=>x.currency===devise&&dans(x.date_locale,du,au))){
  parCat.set(x.category,(parCat.get(x.category)??0)+c(x.amount));
  if(!x.liee){resume.depensesHorsCaisse+=c(x.amount);operations.push({date:x.date_locale,heure:heureDe(x.created_at),caisse:l('SÉNEVÉ Dépenses (hors caisse)','SÉNEVÉ Expenses (not from a counter)'),libelle:`${nomMotif.depense} · ${nomCat(x.category)}`,centimes:-c(x.amount),note:x.note});}
 }
 const totalCat=[...parCat.values()].reduce((a,b)=>a+b,0);
 const depensesParCategorie=CATEGORIES_DEPENSES.filter(k=>parCat.has(k)).map(k=>({categorie:k,nom:nomCat(k),centimes:parCat.get(k)!,pct:totalCat?Math.round(parCat.get(k)!/totalCat*100):0})).sort((a,b)=>b.centimes-a.centimes);
 // Activité (ventes) et revenus
 let activite:Rapport['activite']=null;
 const ventes=(d.benefices?.ventes??[]).filter(v=>v.currency===devise&&dans(v.date_locale,du,au));
 if(ventes.length){
  const a={ventes:0,marchandises:0,frais:0,charges:0,benefice:0,marge:null as number|null,nb:ventes.length};
  for(const v of ventes){a.ventes+=c(v.gross);a.marchandises+=c(v.goods);a.frais+=c(v.other);a.charges+=c(v.charges);
   operations.push({date:v.date_locale,heure:null,caisse:l('Activité','Business'),libelle:l('encaissement (ventes)','receipt (sales)'),centimes:c(v.gross),note:c(v.goods)+c(v.other)+c(v.charges)>0?l(`marchandises ${(c(v.goods)/100).toLocaleString('fr-FR')} · frais ${(c(v.other)/100).toLocaleString('fr-FR')} · charges ${(c(v.charges)/100).toLocaleString('fr-FR')}`,`goods ${c(v.goods)/100} · costs ${c(v.other)/100} · monthly costs ${c(v.charges)/100}`):null});}
  a.benefice=a.ventes-a.marchandises-a.frais-a.charges;a.marge=a.ventes?Math.round(a.benefice/a.ventes*100):null;
  activite=a;resume.encaisse+=a.ventes;resume.charges=a.charges;resume.benefice=a.benefice;
 }
 for(const r of (d.benefices?.revenus??[]).filter(r=>r.currency===devise&&dans(r.date_locale,du,au)))resume.encaisse+=c(r.amount);
 const reste=d.benefices?.resteARepartir?.[devise];
 resume.pasReparti=reste!==undefined?c(reste):null;
 operations.sort((a,b)=>a.date===b.date?(a.heure??'').localeCompare(b.heure??''):a.date.localeCompare(b.date));
 return {du,au,devise,resume,activite,caisses,depensesParCategorie,dettes,operations};
}

/** Période d'un jour, d'un mois ou d'une année contenant la date donnée (AAAA-MM-JJ). */
export function periodeDe(type:'jour'|'mois'|'annee',jour:string){
 if(type==='jour')return {du:jour,au:jour};
 const [a=2000,m=1]=jour.split('-').map(Number);
 if(type==='mois'){const fin=new Date(Date.UTC(a,m,0)).getUTCDate();return {du:`${a}-${String(m).padStart(2,'0')}-01`,au:`${a}-${String(m).padStart(2,'0')}-${String(fin).padStart(2,'0')}`};}
 return {du:`${a}-01-01`,au:`${a}-12-31`};
}
/** Décale une date (AAAA-MM-JJ) d'un jour, d'un mois ou d'une année. */
export function decaler(type:'jour'|'mois'|'annee',jour:string,sens:1|-1){
 const [a=2000,m=1,j=1]=jour.split('-').map(Number);
 const d=type==='jour'?new Date(Date.UTC(a,m-1,j+sens)):type==='mois'?new Date(Date.UTC(a,m-1+sens,1)):new Date(Date.UTC(a+sens,0,1));
 return d.toISOString().slice(0,10);
}
