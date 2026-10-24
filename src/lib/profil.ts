import {prenomDuCompte} from './connexion-sociale';
import {supabase} from './supabase';
import {nomParcours} from './espace-textes';
export type Profil={userId:string;participantId:string;prenom:string;email:string;langue:string;parcours:{id:string;nom:string;debut:string;duree:number;etat:string;langue:string}[];objectif:{texte:string;racine:number|null}|null};
const PREFIXE='seneve:profil:v1:';
export function effacerProfils(sauf?:string){try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(PREFIXE)&&k!==PREFIXE+sauf)localStorage.removeItem(k);}}catch{/* stockage indisponible */}}
export function enregistrerProfil(p:Profil){try{effacerProfils(p.userId);localStorage.setItem(PREFIXE+p.userId,JSON.stringify({le:new Date().toISOString(),profil:p}));}catch{/* pas de copie */}}
export function lireProfil(id:string):{le:string;profil:Profil}|null{try{const brut=localStorage.getItem(PREFIXE+id);if(!brut)return null;const c=JSON.parse(brut);return c?.profil?.userId===id&&typeof c.le==='string'&&Number.isFinite(Date.parse(c.le))&&Array.isArray(c.profil.parcours)?c:null;}catch{return null;}}
export async function chargerProfil(user:{id:string;email?:string;user_metadata?:Record<string,unknown>}):Promise<Profil>{
 const creation=await supabase.rpc('ensure_participant',{p_prenom:prenomDuCompte(user.user_metadata)});if(creation.error)throw creation.error;
 const[p,e,g]=await Promise.all([supabase.from('participants').select('participant_id,prenom,langue').eq('auth_user_id',user.id).single(),supabase.from('enrollments').select('enrollment_id,programme_id,date_debut,etat,langue').neq('etat','annulee'),supabase.from('goals').select('texte,racine').eq('etat','confirme').maybeSingle()]);
 for(const r of[p,e,g])if(r.error)throw r.error;if(!p.data)throw Error('Profil indisponible');
 const inscriptions=e.data??[];const ids=[...new Set(inscriptions.map(x=>x.programme_id))];const pr=ids.length?await supabase.from('programmes').select('programme_id,nom,duree_jours').in('programme_id',ids):{data:[],error:null};if(pr.error)throw pr.error;
 return{userId:user.id,participantId:p.data.participant_id,prenom:p.data.prenom??'',email:user.email??'',langue:p.data.langue??'fr',objectif:g.data,parcours:inscriptions.map(x=>{const q=pr.data?.find(y=>y.programme_id===x.programme_id);return{id:x.enrollment_id,nom:nomParcours(q?.nom??x.programme_id,x.langue,q?.duree_jours??7),debut:x.date_debut,duree:q?.duree_jours??7,etat:x.etat,langue:x.langue};})};
}
export async function modifierProfil(p:Profil,changements:{prenom?:string;langue?:string}):Promise<Profil>{if(navigator.onLine===false)throw Error('Hors connexion');const s=await supabase.auth.getSession();if(s.error||s.data.session?.user.id!==p.userId)throw Error('Session expirée');const r=await supabase.from('participants').update(changements).eq('auth_user_id',p.userId).eq('participant_id',p.participantId).select('prenom,langue').single();if(r.error||!r.data)throw r.error??Error('Modification non confirmée');return{...p,prenom:r.data.prenom??'',langue:r.data.langue??'fr'};}
/** Export à la demande, sans jeton de session, paginé pour conserver les journaux longs. */
export async function exporterProfil(p:Profil){
 if(navigator.onLine===false)throw Error('Hors connexion');
 const verifier=async()=>{const s=await supabase.auth.getSession();if(s.error||s.data.session?.user.id!==p.userId)throw Error('Session expirée');};await verifier();
 const journal:unknown[]=[];for(let offset=0;;offset+=500){const r=await supabase.from('journal_entries').select('entry_id,texte,usage_ia_autorise,cree_le,modifie_le,activity_id').eq('participant_id',p.participantId).order('entry_id').range(offset,offset+499);if(r.error)throw r.error;journal.push(...(r.data??[]));if((r.data?.length??0)<500)break;}await verifier();
 return{exporte_le:new Date().toISOString(),profil:{prenom:p.prenom,email:p.email,langue:p.langue,parcours:p.parcours,objectif:p.objectif},journal};
}
