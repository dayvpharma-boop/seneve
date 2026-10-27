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
// Écran Rappels : les 15 habitudes du rythme proposé, toutes rappelées par défaut ; « #rappels-actif » en coupe une.
const HABITUDES:[string,string][]=[['reveil','Réveil'],['gratitude_matin','Gratitude du matin'],['priere_matin','Prière du matin'],['bible_matin','Bible du matin'],['exercice','Exercice adapté'],['culte_dimanche','Culte du dimanche'],['lecture_pro','Lecture professionnelle'],['priere_midi','Prière de midi'],['predication','Écoute d’une prédication'],['culte_semaine','Culte en semaine'],['lecture_personnelle','Développement personnel'],['bible_soir','Bible du soir'],['gratitude_soir','Gratitude du soir'],['priere_soir','Prière du soir'],['coucher','Coucher']];
const rappels={actif:location.hash.includes('actif'),coupees:location.hash.includes('actif')?['priere_midi']:[] as string[]};
// Écran Fuseau : horaires restés à l'heure de New York, quel que soit le fuseau du navigateur de la galerie.
let fuseauHoraires='America/New_York';
function choixRappels(nom:string,args:Record<string,unknown>){
 if(nom==='hd_rappels_regler'){rappels.actif=args.p_actif as boolean;rappels.coupees=args.p_habitudes_coupees as string[];}
 if(nom==='hd_changer_fuseau')fuseauHoraires=args.p_fuseau as string;
 return {data:{inscrit:true,push_pret:true,actif:rappels.actif,habitudes:HABITUDES.map(([habit_key,libelle])=>({habit_key,libelle,recu:!rappels.coupees.includes(habit_key)})),fuseau:fuseauHoraires},error:null};
}
export const supabase:any={
 rpc:async(nom:string,args:Record<string,unknown>)=>nom.startsWith('hd_fidelite_')?compteur(nom,args):nom.startsWith('hd_rappels_')||nom==='hd_changer_fuseau'?choixRappels(nom,args):vide,
 from:(table:string)=>table==='enrollments'&&location.hash.startsWith('#engagements')?inscriptions:chaine,
 auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
};
export function siteUrl(path:string):string{return path;}
