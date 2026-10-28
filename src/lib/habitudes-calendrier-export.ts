import {planningHabitudesPourDate} from './habitudes-planning';
import type {ConfigurationHoraires} from './habitudes-horaires-api';
import {dateLocale} from './habitudes-periodes';
export const HABITUDES_EXPORTABLES=['reveil','gratitude_matin','priere_matin','bible_matin','exercice','lecture_pro','priere_midi','predication','lecture_personnelle','bible_soir','gratitude_soir','priere_soir','coucher','culte_semaine','culte_dimanche']as const;
export type RendezVousCalendrier={date:string;heure:string;cle:string;creneau:string;titre:string;instant:number};
const formatsFuseaux=new Map<string,Intl.DateTimeFormat>();
function parties(instant:number,fuseau:string){
 let format=formatsFuseaux.get(fuseau);
 if(!format){format=new Intl.DateTimeFormat('en-GB',{timeZone:fuseau,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});if(formatsFuseaux.size>=8)formatsFuseaux.clear();formatsFuseaux.set(fuseau,format);}
 const p=format.formatToParts(new Date(instant));
 const v=(s:string)=>Number(p.find(x=>x.type===s)!.value);
 return Date.UTC(v('year'),v('month')-1,v('day'),v('hour'),v('minute'),v('second'));
}
/** Refuser plutôt que déplacer un horaire absent ou ambigu au changement d'heure. */
export function instantCalendrier(date:string,heure:string,fuseau:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure))throw Error('Horaire invalide');
 const naif=Date.parse(date+'T'+heure+':00Z');if(!Number.isFinite(naif)||new Date(naif).toISOString().slice(0,10)!==date)throw Error('Date invalide');
 const offsets=new Set<number>();for(let n=-6;n<=6;n++){const t=naif+n*6*3600000;offsets.add(parties(t,fuseau)-t);}
 const candidats=[...offsets].map(o=>naif-o).filter(t=>parties(t,fuseau)===naif);
 if(candidats.length!==1)throw Error('Cet horaire est ambigu ou absent lors du changement d’heure. Adapte le créneau avant de l’exporter.');
 return candidats[0]!;
}
export function rendezVousCalendrier(config:ConfigurationHoraires,participantId:string,date:string,cles:readonly string[],now:Date=new Date()):RendezVousCalendrier[]{
 if(config.date_locale!==date||dateLocale(+now,config.fuseau)!==date)throw Error('Actualise les horaires pour la journée en cours.');
 if(!cles.length||new Set(cles).size!==cles.length||cles.some(c=>!HABITUDES_EXPORTABLES.some(x=>x===c)))throw Error('Choisis au moins un rendez-vous.');
 const modele=config.modeles[0];if(!modele)throw Error('Planning indisponible');
 const debut=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(debut)||new Date(debut).toISOString().slice(0,10)!==date)throw Error('Date invalide');
 return Array.from({length:7},(_,i)=>{const jour=new Date(debut+i*86400000).toISOString().slice(0,10);
 return planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:jour,fuseau:config.fuseau},config.modeles,config.horaires).rendezVous.filter(r=>cles.includes(r.habit_key)).map(r=>({date:jour,heure:r.heure_locale,cle:r.habit_key,creneau:r.creneau_id,titre:r.libelle,instant:instantCalendrier(jour,r.heure_locale,config.fuseau)})).filter(r=>r.instant>+now);
 }).flat();
}
export const texteIcs=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
/** Pliage RFC 5545 en octets UTF-8, sans couper un caractère. */
export function plierIcs(s:string){let ligne='',taille=0;const lignes:string[]=[];for(const c of s){const n=new TextEncoder().encode(c).length;if(taille+n>75){lignes.push(ligne);ligne=' ';taille=1;}ligne+=c;taille+=n;}lignes.push(ligne);return lignes.join('\r\n');}
const stamp=(t:number)=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export async function creerCalendrierHabitudes(rdv:readonly RendezVousCalendrier[],enrollmentId:string,langue:string,now:Date=new Date()){
 if(!rdv.length||rdv.length>105||!enrollmentId||!Number.isFinite(+now))throw Error('Aucun rendez-vous à exporter');
 const lignes=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SENEVE//Habitudes et Defis//FR','CALSCALE:GREGORIAN'];
 for(const r of rdv){
  if(!Number.isFinite(r.instant)||r.instant<=+now||!r.titre.trim())throw Error('Rendez-vous invalide');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode([enrollmentId,r.date,r.cle,r.creneau].join('|'))))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const titre='SÉNEVÉ — '+r.titre;
  lignes.push('BEGIN:VEVENT','UID:'+hash+'@seneve.local','DTSTAMP:'+stamp(+now),'DTSTART:'+stamp(r.instant),'SUMMARY:'+texteIcs(titre),'DESCRIPTION:'+texteIcs(langue==='en'?'A reminder copied from SÉNEVÉ. Record your actual practice in the app. Changes in SÉNEVÉ do not update this event.':'Rendez-vous copié depuis SÉNEVÉ. Déclare ta pratique réelle dans l’application. Les changements dans SÉNEVÉ ne modifient pas cet événement.'),'CLASS:PRIVATE','TRANSP:TRANSPARENT','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0S','DESCRIPTION:'+texteIcs(titre),'END:VALARM','END:VEVENT');
 }
 lignes.push('END:VCALENDAR');return lignes.map(plierIcs).join('\r\n')+'\r\n';
}
export function telechargerCalendrierHabitudes(contenu:string){
 const url=URL.createObjectURL(new Blob([contenu],{type:'text/calendar;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='seneve-rappels-7-jours.ics';document.body.append(a);
 try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
}
