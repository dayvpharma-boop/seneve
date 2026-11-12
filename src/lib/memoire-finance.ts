import {compteMemorise,garderEnMemoire,lireEnMemoire,memoireFraiche} from './memoire-pages';

/** Mémoire des pages Finance pendant la visite (demande de Dr Justin du 12/11/2026), comme Aujourd'hui et
 * Parcours depuis le 30/10 : revenir sur SÉNEVÉ Finance, Compte, Dettes ou Répartition affiche tout de suite la
 * dernière version chargée, puis les chiffres sont relus en arrière-plan. Rien n'est écrit sur l'appareil ;
 * la mémoire est rattachée au compte et vidée à la déconnexion (effacerMemoire). Au-delà de 30 minutes ou d'un
 * changement de jour, la page se recharge normalement. */
export function garderFinance(cle:string,donnees:unknown):void{
 const compte=compteMemorise();if(compte)garderEnMemoire('finance:'+cle,compte,donnees);
}
/** undefined : rien en mémoire (ou trop ancien) ; sinon la dernière valeur chargée, même null. */
export function lireFinance<T>(cle:string):T|undefined{
 const compte=compteMemorise();if(!compte)return undefined;
 const e=lireEnMemoire<T>('finance:'+cle,compte);
 return e&&memoireFraiche(e.le)?e.donnees:undefined;
}
