import {simulerDime} from './habitudes-dime';

/** « Quand je reçois de l'argent » : répartition validée par Dr Justin le 07/11/2026.
 * Dîme 10 % fixe ; Offrande libre et facultative (0 % au départ, sans limite propre : 5, 10, 20, 50 %… selon la personne) ; Réserve de joie 5 à 10 % ; Pour investir 0 à 30 % ; Dettes 0 à 30 % (15 % proposés) ; le reste pour vivre.
 * Base : commerçant = ventes − marchandises − charges ; salarié = salaire − dépenses de travail non remboursées ;
 * entrepreneur = encaissé − dépenses du travail ; autre revenu (don) = montant entier. Un prêt n'est pas un revenu.
 * Calcul local uniquement : rien n'est enregistré. */
export type ProfilRevenu='salarie'|'commerce'|'entreprise'|'autre';
export type CleRepartition='dime'|'offrande'|'reserve'|'investir'|'autre'|'dettes';
export const LIMITES_REPARTITION:Record<CleRepartition,{min:number;max:number;pas:number;defaut:number}>={
 dime:{min:10,max:10,pas:0,defaut:10},
 offrande:{min:0,max:100,pas:5,defaut:0},
 reserve:{min:5,max:10,pas:1,defaut:10},
 investir:{min:0,max:30,pas:5,defaut:20},
 // « Autre objectif » (toiture, école…) : libre, 0 % au départ (demande du 07/11/2026).
 autre:{min:0,max:100,pas:5,defaut:0},
 dettes:{min:0,max:30,pas:5,defaut:15},
};
export type Pourcentages=Record<CleRepartition,number>;
export const POURCENTAGES_DEFAUT:Pourcentages={dime:10,offrande:0,reserve:10,investir:20,autre:0,dettes:15};

/** Plus haut pourcentage possible pour une part : sa propre limite, et jamais plus que ce qui reste (le total ne dépasse pas 100 %). */
export function maximumPart(cle:CleRepartition,p:Pourcentages):number{
 const autres=(Object.keys(p) as CleRepartition[]).filter(k=>k!==cle).reduce((n,k)=>n+p[k],0);
 return Math.max(LIMITES_REPARTITION[cle].min,Math.min(LIMITES_REPARTITION[cle].max,100-autres));
}

/** Base retenue (chaîne décimale exacte), via les mêmes règles que la dîme. Lève une erreur si un montant est mal écrit. */
export function baseRepartition(profil:ProfilRevenu,recu:string,marchandises:string,frais:string):string{
 const zero=(v:string)=>v.trim()===''?'0':v;
 if(profil==='commerce')return simulerDime('commerce',recu,zero(marchandises),zero(frais)).base;
 if(profil==='autre')return simulerDime('don',recu,'0','0').base;
 return simulerDime('salaire',recu,'0',zero(frais)).base;
}

/** Montants en unités de la devise (arrondis à `decimales`), « vivre » = ce qui reste. */
export function repartir(base:string,p:Pourcentages,decimales:number){
 const f=10**decimales,b=Math.round(Number(base)*f);
 const part=(pct:number)=>Math.round(b*pct/100);
 const dime=part(p.dime),offrande=part(p.offrande),reserve=part(p.reserve),investir=part(p.investir),autre=part(p.autre),dettes=part(p.dettes);
 const vivre=Math.max(0,b-dime-offrande-reserve-investir-autre-dettes);
 return {base:b/f,dime:dime/f,offrande:offrande/f,reserve:reserve/f,investir:investir/f,autre:autre/f,dettes:dettes/f,vivre:vivre/f};
}

/** Propose comment répartir une part « Dettes » : d'abord la plus petite dette, puis la suivante (soldes en centimes). */
export function repartirSurDettes(montantCentimes:number,dettes:{id:string;resteCentimes:number}[]){
 let reste=Math.max(0,montantCentimes);const out:{id:string;centimes:number;solde:boolean}[]=[];
 for(const d of [...dettes].filter(x=>x.resteCentimes>0).sort((a,b)=>a.resteCentimes-b.resteCentimes)){
  if(reste<=0)break;const c=Math.min(reste,d.resteCentimes);out.push({id:d.id,centimes:c,solde:c===d.resteCentimes});reste-=c;
 }
 return {propositions:out,surplus:reste};
}
