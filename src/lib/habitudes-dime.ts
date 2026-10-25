/** Règles pédagogiques SÉNEVÉ, cahier HD du 25/10/2026, section 8.
 * Calcul décimal exact en entiers, sans devise, conversion, arrondi ou paiement implicite.
 */
export type TypeRevenuDime='commerce'|'salaire'|'don';
const ECHELLE=1_000_000n;
function montant(s:string):bigint{
 const t=s.trim().replace(/[\u00a0\u202f ]/g,'').replace(',','.');
 if(t.length>24||!/^\d+(?:\.\d{1,6})?$/.test(t))throw new Error('Montant invalide');
 const [entier,decimales='']=t.split('.');return BigInt(entier!)*ECHELLE+BigInt(decimales.padEnd(6,'0'));
}
function decimal(n:bigint,precision:number):string{
 const t=n.toString().padStart(precision+1,'0');
 return (t.slice(0,-precision)+'.'+t.slice(-precision)).replace(/\.?0+$/,'');
}
export function simulerDime(type:TypeRevenuDime,recu:string,marchandises:string,charges:string){
 if(!['commerce','salaire','don'].includes(type))throw new Error('Règle non définie');
 const revenu=montant(recu),cout=type==='commerce'?montant(marchandises):0n,frais=type==='don'?0n:montant(charges);
 const solde=revenu-cout-frais,base=solde>0n?solde:0n;
 return {recu:decimal(revenu,6),marchandises:decimal(cout,6),charges:decimal(frais,6),solde:solde<0n?'-'+decimal(-solde,6):decimal(solde,6),base:decimal(base,6),dime:decimal(base,7)};
}
