import type {EtatOccurrence,OccurrenceHabitude} from './habitudes';
import type {TransportProgression} from './habitudes-api';
export type DetailLecture={activity_id:string;minutes:number;titre:string|null};
export type SaisieLecture={eventId:string;action:'partielle'|'realisee';minutes:number;titre:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Saisie privée dans cet onglet : durée et titre limité, isolés par compte, effacés après confirmation ou déconnexion. */
export const PREFIXE_LECTURE='seneve:habitudes:lecture:v1:';
export function cleLecture(userId:string,o:OccurrenceHabitude){
 if(![userId,o.enrollment_id,o.occurrence_id].every(x=>UUID.test(x)))throw Error('Contexte invalide');
 return PREFIXE_LECTURE+[userId,o.enrollment_id,o.occurrence_id].join(':');
}
function valideSaisie(s:SaisieLecture){return !!s&&UUID.test(s.eventId)&&['partielle','realisee'].includes(s.action)&&Number.isInteger(s.minutes)&&s.minutes>=1&&s.minutes<=1440&&typeof s.titre==='string'&&s.titre.length<=160&&s.titre===s.titre.trim();}
export function lireLectureEnAttente(stockage:Pick<Storage,'getItem'>,cle:string):SaisieLecture|null{
 const raw=stockage.getItem(cle);if(!raw)return null;const s=JSON.parse(raw) as SaisieLecture;if(!valideSaisie(s))throw Error('Saisie invalide');return s;
}
export function preparerLecture(stockage:Pick<Storage,'getItem'|'setItem'>,cle:string,action:SaisieLecture['action'],minutes:number,titre:string):SaisieLecture{
 const ancienne=lireLectureEnAttente(stockage,cle),s={eventId:ancienne?.eventId??crypto.randomUUID(),action,minutes,titre:titre.trim()};
 if(!valideSaisie(s))throw Error('Durée ou titre invalide');
 if(ancienne&&(ancienne.action!==s.action||ancienne.minutes!==s.minutes||ancienne.titre!==s.titre))throw Error('Une autre saisie attend sa confirmation');
 if(!ancienne)stockage.setItem(cle,JSON.stringify(s));return ancienne??s;
}
function detail(data:unknown):DetailLecture{
 if(!data||typeof data!=='object')throw Error('Durée non confirmée');const d=data as DetailLecture;
 if(!UUID.test(d.activity_id)||!Number.isInteger(d.minutes)||d.minutes<1||d.minutes>1440||(d.titre!==null&&(typeof d.titre!=='string'||!d.titre.trim()||d.titre.length>160)))throw Error('Durée non confirmée');return d;
}
export async function chargerDetailsLectures(t:TransportProgression,enrollmentId:string,ids:string[]):Promise<DetailLecture[]>{
 if(!UUID.test(enrollmentId)||ids.length<1||ids.length>5||!ids.every(x=>UUID.test(x)))throw Error('Lectures invalides');
 const r=await t.rpc('hd_reading_details',{p_enrollment_id:enrollmentId,p_activity_ids:ids.join(',')});if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Lecture des durées indisponible');
 const lignes=r.data.map(detail);if(lignes.some(x=>!ids.includes(x.activity_id))||new Set(lignes.map(x=>x.activity_id)).size!==lignes.length)throw Error('Lectures incohérentes');return lignes;
}
export async function enregistrerLecture(t:TransportProgression,o:OccurrenceHabitude,s:SaisieLecture):Promise<{etat:EtatOccurrence;lecture:DetailLecture}>{
 if(!UUID.test(o.enrollment_id)||!UUID.test(o.occurrence_id)||!valideSaisie(s))throw Error('Saisie invalide');
 const r=await t.rpc('hd_record_reading',{p_enrollment_id:o.enrollment_id,p_activity_id:o.occurrence_id,p_client_event_id:s.eventId,p_etat:s.action,p_minutes:String(s.minutes),p_titre:s.titre});
 if(r.error)throw r.error;if(!r.data||typeof r.data!=='object')throw Error('Confirmation absente');const x=r.data as Record<string,unknown>;
 if(typeof x.event_id!=='string'||!UUID.test(x.event_id)||!['partielle','realisee'].includes(String(x.etat))||typeof x.aide_demandee!=='boolean'||typeof x.repetition!=='boolean'||(s.action==='realisee'&&x.etat!=='realisee'))throw Error('Déclaration non confirmée');
 const lecture=detail(x.reading);if(lecture.activity_id!==o.occurrence_id)throw Error('Lecture non confirmée');
 return {lecture,etat:{...o,etat:x.etat as 'partielle'|'realisee',aide_demandee:x.aide_demandee,synchronisation:'synchronise'}};
}
