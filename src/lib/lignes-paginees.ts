/** Lecture complète d'une table au-delà de la limite de lignes renvoyées par l'API (1 000 par réponse).
 * Sans cela, une liste longue (six mois d'Habitudes & Défis : 2 896 rendez-vous) serait tronquée sans erreur. */
const PAGE=1000;
type Reponse={data:unknown;error:unknown};
/** `requete(de, a)` doit appliquer un ordre stable puis `.range(de, a)`. */
export async function lignesPaginees<T>(requete:(de:number,a:number)=>PromiseLike<Reponse>):Promise<T[]>{
 const tout:T[]=[];
 for(let de=0;;de+=PAGE){
  const r=await requete(de,de+PAGE-1);
  if(r.error)throw r.error;
  const lot=(r.data??[]) as T[];
  tout.push(...lot);
  if(lot.length<PAGE)return tout;
 }
}
/** Découpe une longue liste d'identifiants pour garder des adresses de requête courtes. */
export async function parPaquets<T>(ids:string[],lire:(paquet:string[])=>Promise<T[]>,taille=100):Promise<T[]>{
 const paquets:string[][]=[];
 for(let i=0;i<ids.length;i+=taille)paquets.push(ids.slice(i,i+taille));
 return (await Promise.all(paquets.map(lire))).flat();
}
