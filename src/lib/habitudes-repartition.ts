import {simulerDime} from './habitudes-dime';

/** « Quand je reçois de l'argent » : répartition validée par Dr Justin le 07/11/2026.
 * Dîme 10 % fixe ; Offrande libre et facultative (0 % au départ, sans limite propre : 5, 10, 20, 50 %… selon la personne) ; Réserve de joie 0 à 10 % (08/11/2026, avant 5 à 10 %) ; Pour investir 0 à 30 % ; Dettes 0 à 30 % (15 % proposés) ; le reste pour vivre.
 * Base : commerçant = ventes − marchandises − charges ; salarié = salaire − dépenses de travail non remboursées ;
 * entrepreneur = encaissé − dépenses du travail ; autre revenu (don) = montant entier. Un prêt n'est pas un revenu.
 * Calcul local uniquement : rien n'est enregistré. */
export type ProfilRevenu='salarie'|'commerce'|'entreprise'|'autre';
export type CleRepartition='dime'|'offrande'|'reserve'|'investir'|'autre'|'dettes';
export const LIMITES_REPARTITION:Record<CleRepartition,{min:number;max:number;pas:number;defaut:number}>={
 dime:{min:10,max:10,pas:0,defaut:10},
 offrande:{min:0,max:100,pas:5,defaut:0},
 reserve:{min:0,max:10,pas:1,defaut:10},
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

/** Montants en unités de la devise, sans créer ni perdre la plus petite unité.
 * L'arrondi indépendant de chaque part pouvait dépasser la base (ex. 0,03 USD).
 * Méthode des plus grands restes : les parts et « Pour vivre » totalisent exactement la base.
 * Pour un solde d’activité, le montant de dîme restant vient du suivi des encaissements.
 */
export function repartir(base:string,p:Pourcentages,decimales:number,dimeRestante?:string){
 if(decimales!==0&&decimales!==2)throw Error('Précision de devise invalide');
 const montant=Number(base),f=10**decimales;
 if(!Number.isFinite(montant)||montant<0||montant>9_999_999_999.99)throw Error('Base invalide');
 const b=Math.round(montant*f);
 if(!Number.isSafeInteger(b))throw Error('Base trop élevée');
 const cles=['dime','offrande','reserve','investir','autre','dettes'] as const;
 if(p.dime!==10||cles.some(c=>!Number.isInteger(p[c])||p[c]<LIMITES_REPARTITION[c].min||p[c]>LIMITES_REPARTITION[c].max))
  throw Error('Pourcentages invalides');
 const total=cles.reduce((n,c)=>n+p[c],0);
 if(total>100)throw Error('Le total ne peut pas dépasser 100 %');
 const parts=[...cles,'vivre'] as const;
 const baseUnites=BigInt(b);
 const pourcentages=[...cles.map(c=>p[c]),100-total];
 let denominateur=100n;
 let numerateurs=pourcentages.map(pct=>baseUnites*BigInt(pct));
 if(dimeRestante!==undefined){
  const montantDime=Math.round(Number(dimeRestante)*f);
  if(!Number.isSafeInteger(montantDime)||montantDime<0)throw Error('Dîme restante invalide');
  const dime=BigInt(Math.min(b,montantDime));
  const disponible=baseUnites-dime;
  const poidsAutres=BigInt(total-p.dime);
  if(baseUnites*poidsAutres>disponible*100n){
   // Si une dîme avait été laissée de côté, réserver son montant avant les autres parts.
   denominateur=poidsAutres;
   numerateurs=[dime*denominateur,...cles.slice(1).map(c=>disponible*BigInt(p[c])),0n];
  }else{
   numerateurs[0]=dime*100n;
   numerateurs[parts.length-1]=disponible*100n-baseUnites*poidsAutres;
  }
 }
 const quotas=parts.map((cle,i)=>{
  const exact=numerateurs[i]!;
  return {cle,unites:Number(exact/denominateur),reste:Number(exact%denominateur),ordre:i};
 });
 let aRepartir=b-quotas.reduce((n,q)=>n+q.unites,0);
 for(const q of [...quotas].sort((a,z)=>z.reste-a.reste||a.ordre-z.ordre)){
  if(aRepartir===0)break;
  q.unites++;aRepartir--;
 }
 const montants=Object.fromEntries(quotas.map(q=>[q.cle,q.unites/f])) as Record<typeof parts[number],number>;
 return {base:b/f,dime:montants.dime,offrande:montants.offrande,reserve:montants.reserve,investir:montants.investir,autre:montants.autre,dettes:montants.dettes,vivre:montants.vivre};
}

/** Solde d'activité (demande de Dr Justin du 10/11/2026) : les pourcentages ne s'appliquent qu'à l'argent NOUVEAU,
 * jamais encore réparti. L'argent revenu au solde (excédent laissé, part décochée) a déjà eu ses pourcentages :
 * il reste à part dans « retour », sauf ce qu'il faut pour la dîme encore due. Sans « nouveau » (serveur ancien),
 * tout le solde est traité comme nouveau, comme avant. */
export function repartirSolde(s:{disponible:string;dimeRestante:string;nouveau?:string},p:Pourcentages,decimales:number){
 const f=10**decimales,u=(v:string)=>Math.round(Number(v)*f);
 const total=u(s.disponible),nouveau=Math.min(total,s.nouveau===undefined?total:u(s.nouveau)),du=u(s.dimeRestante);
 if(![total,nouveau,du].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Solde invalide');
 const r=repartir((nouveau/f).toFixed(decimales),p,decimales,s.dimeRestante);
 const dime=Math.round(r.dime*f),horsBase=Math.min(total-nouveau,Math.max(0,du-dime));
 return {...r,base:(nouveau+horsBase)/f,dime:(dime+horsBase)/f,retour:(total-nouveau-horsBase)/f};
}

/** Propose comment répartir une part « Dettes » : d'abord la plus petite dette, puis la suivante (soldes en centimes). */
export function repartirSurDettes(montantCentimes:number,dettes:{id:string;resteCentimes:number}[]){
 let reste=Math.max(0,montantCentimes);const out:{id:string;centimes:number;solde:boolean}[]=[];
 for(const d of [...dettes].filter(x=>x.resteCentimes>0).sort((a,b)=>a.resteCentimes-b.resteCentimes)){
  if(reste<=0)break;const c=Math.min(reste,d.resteCentimes);out.push({id:d.id,centimes:c,solde:c===d.resteCentimes});reste-=c;
 }
 return {propositions:out,surplus:reste};
}
