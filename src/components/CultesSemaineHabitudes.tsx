import {useEffect,useState} from 'react';
import {chargerHorairesHabitudes,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {planningHabitudesPourDate} from '@/lib/habitudes-planning';

export function rendezVousCultes(config:ConfigurationHoraires,participantId:string,dateLocale:string){
 if(config.date_locale!==dateLocale)throw Error('Journée à actualiser');
 const modele=config.modeles[0];if(!modele)throw Error('Planning absent');
 const debut=new Date(dateLocale+'T00:00:00Z');if(!Number.isFinite(+debut)||debut.toISOString().slice(0,10)!==dateLocale)throw Error('Date invalide');
 return Array.from({length:7},(_,i)=>{const date=new Date(+debut+i*86400000).toISOString().slice(0,10);return planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:date,fuseau:config.fuseau},config.modeles,config.horaires).rendezVous.filter(r=>r.habit_key==='culte_semaine'||r.habit_key==='culte_dimanche').map(r=>({...r,date}));}).flat();
}

export function CultesSemaineHabitudes({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false);
 return <details className="mb-hd-space-lg rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm" onToggle={e=>setOuvert(e.currentTarget.open)}><summary className="min-h-[48px] cursor-pointer flex items-center font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Mes rendez-vous de culte','My worship appointments')}</summary>{ouvert&&<PlanningCultes key={[enrollmentId,participantId,dateLocale].join(':')} {...{enrollmentId,participantId,dateLocale,langue}}/>}</details>;
}

function PlanningCultes({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<{fuseau:string;rdv:ReturnType<typeof rendezVousCultes>}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 useEffect(()=>{let actif=true;setData(null);setErreur(false);void chargerHorairesHabitudes(enrollmentId).then(c=>{const rdv=rendezVousCultes(c,participantId,dateLocale);if(actif)setData({fuseau:c.fuseau,rdv});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[enrollmentId,participantId,dateLocale,tour]);
 if(erreur)return <div><p role="alert">{l('Tes rendez-vous ne peuvent pas être vérifiés.','Your appointments cannot be verified.')}</p><button type="button" className="min-h-[44px] px-3 text-hd-secondary" onClick={()=>setTour(n=>n+1)}>{l('Réessayer les rendez-vous','Retry appointments')}</button></div>;
 if(!data)return <p role="status">{l('Chargement de tes rendez-vous…','Loading your appointments…')}</p>;
 return <div className="flex flex-col gap-3 pt-2">
  <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Les 7 prochains jours · objectif : trois participations par semaine.','The next 7 days · aim: three participations per week.')} {data.fuseau}</p>
  {data.rdv.length?<ul className="flex flex-col gap-2">{data.rdv.map(r=><li key={[r.date,r.habit_key,r.creneau_id].join(':')} className="rounded-xl bg-hd-surface-container-low p-3 flex flex-col gap-1"><p className="font-hd-label-lg text-hd-label-lg text-hd-on-surface"><time dateTime={r.date}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(r.date+'T12:00:00Z'))}</time> · {r.heure_locale}</p><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{r.origine==='personnel'?l('Ton horaire personnel','Your personal schedule'):l('Horaire proposé','Suggested time')} · {l('Prévu','Planned')}</p></li>)}</ul>:<p>{l('Aucun rendez-vous de culte prévu sur ces sept jours.','No worship appointments planned over these seven days.')}</p>}
  <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Ces rendez-vous ne sont pas des participations enregistrées. Le jour venu, déclare ce que tu as réellement fait dans « Ma journée ».','These appointments are not recorded participations. On the day, record what you actually did in “My day”.')}</p>
  <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Pour adapter les jours et les heures à ton assemblée, ouvre « Mes repères horaires » plus bas. Les changements s’appliquent à la date indiquée dans les réglages.','To adapt the days and times to your church, open “My schedule” below. Changes apply from the date shown in the settings.')}</p>
  <button type="button" className="min-h-[44px] rounded-xl bg-hd-surface-container px-3 text-hd-secondary" onClick={()=>setTour(n=>n+1)}>{l('Actualiser mes rendez-vous','Refresh my appointments')}</button>
 </div>;
}
