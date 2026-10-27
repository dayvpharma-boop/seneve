/** Signet explicite de l'Amidah française publiée le 27/10/2026.
 * Un numéro de paragraphe seulement, dans l'onglet courant ; aucune progression spirituelle.
 * La clé change avec le compte, l'inscription, la prière datée et la version du texte.
 */
import type {OccurrenceHabitude} from './habitudes';
const PREFIXE='seneve:habitudes:repere:amidah-fr-20261027-v1:';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function cleReperePriere(userId:string,o:OccurrenceHabitude):string{
 if(![userId,o.enrollment_id,o.occurrence_id].every(x=>UUID.test(x))||!/^\d{4}-\d{2}-\d{2}$/.test(o.date_locale))throw Error('Contexte de lecture invalide');
 return PREFIXE+[userId,o.enrollment_id,o.occurrence_id,o.date_locale].join(':');
}
export function lireReperePriere(cle:string,total:number):number|null{
 try{const raw=sessionStorage.getItem(cle);if(raw===null||!/^\d+$/.test(raw))return null;const n=Number(raw);return Number.isSafeInteger(n)&&n>=0&&n<total?n:null;}catch{return null;}
}
export function placerReperePriere(cle:string,index:number,total:number):void{
 if(!Number.isInteger(index)||index<0||index>=total)throw Error('Passage invalide');
 sessionStorage.setItem(cle,String(index));
}
export function retirerReperePriere(cle:string):void{sessionStorage.removeItem(cle);}
export function effacerReperesPriere():void{
 try{for(let i=sessionStorage.length-1;i>=0;i--){const cle=sessionStorage.key(i);if(cle?.startsWith(PREFIXE))sessionStorage.removeItem(cle);}}catch{/* Une panne de stockage n'interrompt pas la déconnexion. */}
}
