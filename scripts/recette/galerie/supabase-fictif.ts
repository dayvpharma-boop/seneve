// Remplace src/lib/supabase.ts dans la galerie de recette : aucun réseau, aucune donnée réelle.
const vide={data:null,error:{message:'galerie hors réseau'}};
const chaine:any=new Proxy({},{get:(_c,p)=>p==='then'?undefined:()=>chaine});
// Écran Engagements : une inscription fictive et un compteur fictif, au jour 26 du parcours (série depuis le 1er octobre).
const E='11111111-1111-4111-8111-111111111111';
const inscriptions:any=new Proxy({},{get:(_c,p)=>p==='then'?(ok:(v:unknown)=>void)=>ok({data:[{enrollment_id:E}],error:null}):()=>inscriptions});
const fidelite={debut:'2026-10-01',masque:!location.hash.includes('visible'),precedent:null as string|null};
const jours=(d:string)=>Math.round((Date.parse('2026-10-26')-Date.parse(d))/864e5);
function compteur(nom:string,args:Record<string,unknown>){
 if(nom==='hd_fidelite_masquer')fidelite.masque=args.p_masque as boolean;
 if(nom==='hd_fidelite_declarer'){fidelite.precedent=fidelite.debut;fidelite.debut='2026-10-26';}
 if(nom==='hd_fidelite_annuler'){fidelite.debut=fidelite.precedent!;fidelite.precedent=null;}
 return {data:{enrollment_id:E,date_locale:'2026-10-26',debut_serie:fidelite.debut,jours:jours(fidelite.debut),masque:fidelite.masque,annulable:fidelite.precedent!==null},error:null};
}
export const supabase:any={
 rpc:async(nom:string,args:Record<string,unknown>)=>nom.startsWith('hd_fidelite_')?compteur(nom,args):vide,
 from:(table:string)=>table==='enrollments'&&location.hash.startsWith('#engagements')?inscriptions:chaine,
 auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
};
export function siteUrl(path:string):string{return path;}
