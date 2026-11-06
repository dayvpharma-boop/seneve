import {simulerDime,type TypeRevenuDime} from './habitudes-dime';

export type TypeRevenuEpargne=Extract<TypeRevenuDime,'commerce'|'salaire'>;
export type ResultatEpargne=ReturnType<typeof simulerDime>&{reserve_joie:string;epargne_investissement:string};
const ECHELLE=1_000_000n;
function unites(s:string):bigint{
 const valeur=s.trim().replace(/[,]/g,'.');
 if(!/^\d+(?:\.\d{1,6})?$/.test(valeur))throw new Error('Pourcentage invalide');
 const [entier,decimal='']=valeur.split('.');
 return BigInt(entier!)*ECHELLE+BigInt(decimal.padEnd(6,'0'));
}
function afficher(n:bigint):string{
 const s=n.toString().padStart(7,'0');
 return (s.slice(0,-6)+'.'+s.slice(-6)).replace(/\.?0+$/,'');
}
/** Simulation uniquement locale : mêmes déductions professionnelles que la dîme, aucun montant sauvegardé. */
export function simulerEpargne(type:TypeRevenuEpargne,recu:string,marchandises:string,charges:string,tauxReserve:string,tauxInvestissement:string):ResultatEpargne{
 if(type!=='commerce'&&type!=='salaire')throw new Error('Type de revenu invalide');
 const base=simulerDime(type,recu,marchandises,charges);
 const reserve=unites(tauxReserve),investissement=unites(tauxInvestissement);
 if(reserve<5n*ECHELLE||reserve>10n*ECHELLE)throw new Error('La réserve doit être comprise entre 5 et 10 %.');
 if(investissement<0n||investissement>30n*ECHELLE)throw new Error('L’épargne pour investir ne peut pas dépasser 30 %.');
 const baseUnites=unites(base.base);
 return {...base,reserve_joie:afficher(baseUnites*reserve/(100n*ECHELLE)),epargne_investissement:afficher(baseUnites*investissement/(100n*ECHELLE))};
}
