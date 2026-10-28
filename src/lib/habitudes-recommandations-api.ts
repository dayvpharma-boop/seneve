export type CategorieRecommandation='lecture_pro'|'lecture_personnelle'|'predication';
export type ContenuRecommandation={categorie:CategorieRecommandation;titre:string;auteur:string;langue:'fr'|'en';url:string;description:string;acces:'gratuit'|'payant'|'a_verifier';etat:'brouillon'|'publie'|'retire'};
export type Recommandation=ContenuRecommandation&{id:string;revision:number;validee_le:string|null};
export type EnregistrementRecommandation={id:string;revision:number;evenement:string;contenu:ContenuRecommandation&{valide:boolean}};
export type TransportRecommandations={rpc(nom:string,p?:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CATEGORIES_RECOMMANDATIONS=[['lecture_pro','Lecture professionnelle'],['lecture_personnelle','Développement personnel'],['predication','Prédications et enseignements']]as const;
export function lienRecommandationValide(lien:string){
 try{const u=new URL(lien);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(u.hostname)&&!/[\s\\]/.test(lien);}catch{return false;}
}
export function verifierContenuRecommandation(x:ContenuRecommandation){
 if(!CATEGORIES_RECOMMANDATIONS.some(c=>c[0]===x.categorie)||!['fr','en'].includes(x.langue)||!['gratuit','payant','a_verifier'].includes(x.acces)||!['brouillon','publie','retire'].includes(x.etat)||typeof x.titre!=='string'||!x.titre.trim()||x.titre.length>180||typeof x.auteur!=='string'||!x.auteur.trim()||x.auteur.length>160||typeof x.description!=='string'||x.description.length>600||typeof x.url!=='string'||x.url.length>2000||!lienRecommandationValide(x.url))throw Error('Vérifie le titre, l’auteur et le lien HTTPS.');
}
function ligne(x:unknown):Recommandation{
 if(!x||typeof x!=='object')throw Error('Contenu indisponible');const r=x as Recommandation;verifierContenuRecommandation(r);
 if(!UUID.test(r.id)||!Number.isInteger(r.revision)||r.revision<1||(r.etat==='publie'&&(typeof r.validee_le!=='string'||Number.isNaN(Date.parse(r.validee_le)))))throw Error('Contenu indisponible');return r;
}
export async function chargerRecommandations(t:TransportRecommandations,langue:string,administration=false):Promise<Recommandation[]>{
 const r=await t.rpc(administration?'staff_hd_recommandations':'hd_recommandations',administration?{}:{p_langue:langue});if(r.error)throw r.error;
 if(!Array.isArray(r.data))throw Error('Catalogue indisponible');const rows=r.data.map(ligne);
 if(new Set(rows.map(x=>x.id)).size!==rows.length||(!administration&&rows.some(x=>x.etat!=='publie'||x.langue!==langue)))throw Error('Catalogue incohérent');
 return rows;
}
export async function enregistrerRecommandation(t:TransportRecommandations,s:EnregistrementRecommandation){
 verifierContenuRecommandation(s.contenu);
 if(![s.id,s.evenement].every(x=>UUID.test(x))||!Number.isInteger(s.revision)||s.revision<0||(s.contenu.etat==='publie'&&!s.contenu.valide))throw Error('Publication non validée');
 const r=await t.rpc('staff_hd_recommandation_enregistrer',{p_id:s.id,p_revision:s.revision,p_evenement:s.evenement,p_contenu:s.contenu});if(r.error)throw r.error;
 const row=ligne(r.data);if(row.id!==s.id||row.etat!==s.contenu.etat)throw Error('Enregistrement non confirmé');return row;
}
export const cleRecommandationEnAttente=(authId:string)=>'seneve:recommandations:attente:v1:'+authId;
export function lireRecommandationEnAttente(authId:string):EnregistrementRecommandation|null{
 try{const s=JSON.parse(sessionStorage.getItem(cleRecommandationEnAttente(authId))??'null')as EnregistrementRecommandation|null;if(!s)return null;verifierContenuRecommandation(s.contenu);if(!UUID.test(s.id)||!UUID.test(s.evenement)||!Number.isInteger(s.revision))return null;return s;}catch{return null;}
}

