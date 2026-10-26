const DEFAUT='Africa/Kinshasa';
export function fuseauHabitudes(participant:{fuseau?:unknown;preferences?:unknown}):string{
 const p=participant.preferences;
 const rappels=p&&typeof p==='object'&&!Array.isArray(p)?(p as Record<string,unknown>).rappels:null;
 const preference=rappels&&typeof rappels==='object'&&!Array.isArray(rappels)?(rappels as Record<string,unknown>).fuseau:null;
 const zone=preference??participant.fuseau??DEFAUT;
 if(typeof zone!=='string'||!zone)throw new Error('Fuseau du parcours invalide');
 new Intl.DateTimeFormat('en',{timeZone:zone});return zone;
}
/** Durée affichée d'un parcours Habitudes & Défis : jusqu'à la fin prévue tenue par le serveur (elle s'allonge à
 * chaque mois payé, et revient en arrière en cas de remboursement), sinon la durée du programme (mois gratuit). */
export function dureeHabitudes(debut:string,finPrevue:string|null|undefined,dureeProgramme:number):number{
 if(!finPrevue||!/^\d{4}-\d{2}-\d{2}$/.test(finPrevue))return dureeProgramme;
 const n=(Date.parse(finPrevue+'T00:00:00Z')-Date.parse(debut+'T00:00:00Z'))/86400000+1;
 return Number.isInteger(n)&&n>=1?n:dureeProgramme;
}
/** Mois Habitudes & Défis d'un jour du parcours (30 jours par mois) et jour de la lecture reprise (1 à 30). */
export const moisHabitudes=(jour:number)=>Math.floor((jour-1)/30)+1;
export const lectureReprise=(jour:number)=>((jour-1)%30)+1;
/** Jours civils du participant : ne pas diviser un temps écoulé par 24 heures. */
export function calendrierHabitudes(debut:string,total:number,fuseau:string,now:Date=new Date()){
 if(!Number.isInteger(total)||total<1||!/^\d{4}-\d{2}-\d{2}$/.test(debut))throw new Error('Calendrier invalide');
 const start=Date.parse(debut+'T00:00:00Z');
 if(!Number.isFinite(start)||new Date(start).toISOString().slice(0,10)!==debut||!Number.isFinite(+now))throw new Error('Date invalide');
 const parts=new Intl.DateTimeFormat('en',{timeZone:fuseau,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const date_locale=`${part('year')}-${part('month')}-${part('day')}`;
 const raw=(Date.parse(date_locale+'T00:00:00Z')-start)/86400000+1;
 return {date_locale,raw,day:Math.max(1,Math.min(raw,total)),notStarted:raw<1,finished:raw>total,joursOuverts:Math.max(0,Math.min(raw,total))};
}
