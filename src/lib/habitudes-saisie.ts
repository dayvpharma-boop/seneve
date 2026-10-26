import type {ActionHabitude} from './habitudes-api.ts';
export type SaisieEnAttente={eventId:string;action:ActionHabitude};
export type StockageSaisie=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const PREFIXE='seneve:habitudes:saisie:v1:';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function cleSaisie(userId:string,enrollmentId:string,activityId:string){
 if(![userId,enrollmentId,activityId].every(id=>UUID.test(id)))throw new Error('Contexte de saisie invalide');
 return PREFIXE+[userId,enrollmentId,activityId].join(':');
}
export function lireSaisie(stockage:StockageSaisie,cle:string):SaisieEnAttente|null{
 const raw=stockage.getItem(cle);if(!raw)return null;
 const r=JSON.parse(raw) as SaisieEnAttente;
 if(!r||!UUID.test(r.eventId)||!['preparee','partielle','realisee','aide_demandee'].includes(r.action))throw new Error('Saisie en attente invalide');
 return r;
}
/** Une requête persistée avant l'appel est réutilisée jusqu'à la confirmation.
 * Aucun texte personnel ni état de progression n'est stocké ici.
 */
export function preparerSaisie(stockage:StockageSaisie,cle:string,action:ActionHabitude):SaisieEnAttente{
 const ancienne=lireSaisie(stockage,cle);
 if(ancienne){if(ancienne.action!==action)throw new Error('Une autre déclaration attend sa confirmation');return ancienne;}
 const r={eventId:crypto.randomUUID(),action};stockage.setItem(cle,JSON.stringify(r));return r;
}
export function effacerSaisiesHabitudes():void{
 try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(PREFIXE))sessionStorage.removeItem(key);}}catch{/* rien */}
}
