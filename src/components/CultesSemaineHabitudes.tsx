import {useEffect,useId,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {chargerHorairesHabitudes,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {planningHabitudesPourDate} from '@/lib/habitudes-planning';
import {chargerHistoriqueRecette,type ActiviteJourRecette,type JourRecette} from '@/lib/habitudes-jour-recette';
import type {EtatOccurrence} from '@/lib/habitudes';
import {supabase} from '@/lib/supabase';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';

const estCulte=(k?:string)=>k==='culte_semaine'||k==='culte_dimanche';
const jourSuivant=(date:string,n:number)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);

export function rendezVousCultes(config:ConfigurationHoraires,participantId:string,dateLocale:string){
 if(config.date_locale!==dateLocale)throw Error('Journée à actualiser');
 const modele=config.modeles[0];if(!modele)throw Error('Planning absent');
 const debut=new Date(dateLocale+'T00:00:00Z');if(!Number.isFinite(+debut)||debut.toISOString().slice(0,10)!==dateLocale)throw Error('Date invalide');
 return Array.from({length:7},(_,i)=>{const date=new Date(+debut+i*86400000).toISOString().slice(0,10);return planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:date,fuseau:config.fuseau},config.modeles,config.horaires).rendezVous.filter(r=>estCulte(r.habit_key)).map(r=>({...r,date}));}).flat();
}

export type CulteSemaine={date:string;heure:string;libelle:string;futur:boolean;activite?:ActiviteJourRecette};
/** Semaine du lundi au dimanche (maquette 07) : jours ouverts lus avec leurs déclarations, jours à venir lus dans les horaires. */
export function semaineCultes(config:ConfigurationHoraires,jours:readonly JourRecette[],participantId:string,dateLocale:string){
 const iso=new Date(dateLocale+'T00:00:00Z').getUTCDay()||7,lundi=jourSuivant(dateLocale,1-iso),dimanche=jourSuivant(lundi,6);
 const ouverts=jours.filter(j=>j.date>=lundi&&j.date<=dateLocale).flatMap(j=>j.activites.filter(a=>estCulte(a.habit_key)).map(a=>({date:j.date,heure:a.heure,libelle:a.consigne,futur:false,activite:a})));
 const aVenir=rendezVousCultes(config,participantId,dateLocale).filter(r=>r.date>dateLocale&&r.date<=dimanche).map(r=>({date:r.date,heure:r.heure_locale,libelle:r.libelle,futur:true}));
 return {lundi,dimanche,cultes:[...ouverts,...aVenir].sort((a,b)=>(a.date+a.heure).localeCompare(b.date+b.heure)) as CulteSemaine[]};
}

export function CultesSemaineHabitudes({enrollmentId,participantId,dateLocale,langue,onConfirme}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;onConfirme?:(e:EtatOccurrence)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false);
 return <details className="mb-hd-space-lg rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm" onToggle={e=>setOuvert(e.currentTarget.open)}><summary className="min-h-[48px] cursor-pointer flex items-center font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Mes cultes de la semaine','My worship this week')}</summary>{ouvert&&<PlanningCultes key={[enrollmentId,participantId,dateLocale].join(':')} {...{enrollmentId,participantId,dateLocale,langue,onConfirme}}/>}</details>;
}

const RAISONS=[['sante','Santé','Health'],['travail','Travail','Work'],['deplacement','Déplacement','Travel'],['autre','Autre','Other']] as const;

function PlanningCultes({enrollmentId,participantId,dateLocale,langue,onConfirme}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;onConfirme?:(e:EtatOccurrence)=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [data,setData]=useState<{fuseau:string;userId:string;semaine:ReturnType<typeof semaineCultes>}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 // Confirmations reçues pendant la visite ; « Je n'ai pas pu » ne vit que dans cet écran (rien n'est envoyé au serveur).
 const [etats,setEtats]=useState<Record<string,EtatOccurrence>>({}),[signales,setSignales]=useState<string[]>([]),[panneau,setPanneau]=useState<string|null>(null);
 useEffect(()=>{let actif=true;setData(null);setErreur(false);void Promise.all([chargerHorairesHabitudes(enrollmentId),chargerHistoriqueRecette(enrollmentId,participantId,dateLocale)]).then(([c,jours])=>{const semaine=semaineCultes(c,jours,participantId,dateLocale);if(actif)setData({fuseau:c.fuseau,userId:jours[0]?.userId??'',semaine});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[enrollmentId,participantId,dateLocale,tour]);
 if(erreur)return <div><p role="alert">{l('Tes cultes de la semaine ne peuvent pas être vérifiés.','Your worship week cannot be verified.')}</p><button type="button" className="min-h-[44px] px-3 text-hd-secondary" onClick={()=>setTour(n=>n+1)}>{l('Réessayer','Retry')}</button></div>;
 if(!data)return <p role="status">{l('Chargement de tes cultes…','Loading your worship week…')}</p>;
 const format=(date:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',...o}).format(new Date(date+'T12:00:00Z'));
 const etatDe=(c:CulteSemaine)=>c.activite?(etats[c.activite.occurrence.occurrence_id]??c.activite.etat):undefined;
 const fait=(c:CulteSemaine)=>{const e=etatDe(c);return e?.synchronisation==='synchronise'&&e.etat==='realisee';};
 const {cultes}=data.semaine,participations=cultes.filter(fait).length;
 const statut=(c:CulteSemaine)=>fait(c)?l('Fait','Done'):etatDe(c)?.synchronisation==='synchronise'&&etatDe(c)?.etat==='partielle'?l('En partie','Partly'):c.futur?l('À venir','Upcoming'):c.activite&&signales.includes(c.activite.occurrence.occurrence_id)?l('Signalé','Reported'):c.date===dateLocale?l('Aujourd’hui','Today'):l('Non déclaré','Not recorded');
 const transport={rpc:(nom:string,params:Record<string,unknown>)=>supabase.rpc(nom,params)};
 return <div className="flex flex-col gap-3 pt-2">
  <p className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider flex items-center gap-1.5"><IconeHD nom="schedule" className="text-[16px]"/>{l(`Du ${format(data.semaine.lundi,{day:'numeric',month:'long'})} au ${format(data.semaine.dimanche,{day:'numeric',month:'long'})}`,`${format(data.semaine.lundi,{day:'numeric',month:'long'})} to ${format(data.semaine.dimanche,{day:'numeric',month:'long'})}`)} · {data.fuseau}</p>
  <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant"><span className="inline-block mr-2 px-2 py-0.5 rounded-full bg-hd-secondary-container/40 text-hd-secondary font-hd-label-sm text-hd-label-sm">{l('Objectif : 3 participations','Aim: 3 participations')}</span>{l('Selon les horaires de ton assemblée.','Following your church’s times.')}</p>
  {cultes.length>0&&<section aria-label={l('Cette semaine','This week')} className="rounded-xl bg-hd-surface-container-low p-3 flex flex-col gap-3">
   <div className="flex items-center justify-between"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Cette semaine','This week')}</span><span className="font-hd-label-sm text-hd-label-sm text-hd-secondary">{l(`${participations} participation${participations>1?'s':''} sur 3`,`${participations} of 3 participations`)}</span></div>
   <ol className="flex items-center justify-between gap-2">{cultes.map(c=><li key={c.date+c.heure} className="flex items-center gap-1.5">{fait(c)?<span className="w-7 h-7 rounded-full bg-hd-secondary text-hd-on-secondary flex items-center justify-center"><IconeHD nom="check" className="text-[16px]"/></span>:<span className="w-7 h-7 rounded-full bg-hd-surface-container flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-hd-outline"/></span>}<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{format(c.date,{weekday:'short'})}</span></li>)}</ol>
  </section>}
  {cultes.length?<ul className="flex flex-col gap-3">{cultes.map(c=>{const id=c.activite?.occurrence.occurrence_id;return <li key={c.date+c.heure} className="rounded-xl bg-hd-surface-container-low p-3 flex flex-col gap-2">
   <div className="flex items-start justify-between gap-2"><p className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider"><time dateTime={c.date}>{format(c.date,{weekday:'long',day:'numeric',month:'long'})}</time> · {c.heure}</p><span className="shrink-0 px-2 py-0.5 rounded-full bg-hd-surface-container font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{statut(c)}</span></div>
   <p className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{c.libelle}</p>
   {c.activite&&id&&<DeclarationHabitude variante="culte" userId={data.userId} occurrence={c.activite.occurrence} consigne={c.libelle} etat={etatDe(c)} langue={langue} lectureSeule={false} transport={transport} onConfirme={e=>{setEtats(s=>({...s,[id]:e}));onConfirme?.(e);}} onPasPu={()=>setPanneau(id)}/>}
   {id&&panneau===id&&<PasPu {...{langue}} culte={`${format(c.date,{weekday:'long',day:'numeric',month:'long'})} · ${c.heure}`} onFermer={()=>setPanneau(null)} onSignale={()=>{setSignales(s=>s.includes(id)?s:[...s,id]);setPanneau(null);}}/>}
  </li>;})}</ul>:<p>{l('Aucun culte prévu cette semaine.','No worship planned this week.')}</p>}
  <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Déclare seulement ce que tu as réellement vécu, sur place ou à distance. « Je n’ai pas pu » n’enregistre rien et ne retire rien à ta progression.','Record only what you actually lived, in person or remotely. “I couldn’t go” records nothing and takes nothing from your progress.')}</p>
  <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Pour adapter les jours et les heures à ton assemblée, ouvre « Mes repères horaires » plus bas. Les changements s’appliquent à la date indiquée dans les réglages.','To adapt the days and times to your church, open “My schedule” below. Changes apply from the date shown in the settings.')}</p>
  <button type="button" className="min-h-[44px] rounded-xl bg-hd-surface-container px-3 text-hd-secondary" onClick={()=>setTour(n=>n+1)}>{l('Actualiser mes cultes','Refresh my worship week')}</button>
 </div>;
}

/** « Merci de le signaler » : raison et mot facultatifs, jamais envoyés au serveur. Avec l'un des deux, le journal privé
 * s'ouvre avec ce brouillon et la personne choisit elle-même de l'enregistrer. */
function PasPu({langue,culte,onFermer,onSignale}:{langue:string;culte:string;onFermer:()=>void;onSignale:()=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr,titre=useId(),champ=useId(),navigate=useNavigate();
 const [raison,setRaison]=useState<string|null>(null),[mot,setMot]=useState('');
 function enregistrer(){
  onSignale();
  const libelle=RAISONS.find(r=>r[0]===raison);
  if(!libelle&&!mot.trim())return;
  const texte=`${l('Culte du','Worship on')} ${culte} : ${l('je n’ai pas pu y participer.','I couldn’t attend.')}${libelle?` ${l('Raison','Reason')} : ${en?libelle[2]:libelle[1]}.`:''}${mot.trim()?`\n${mot.trim()}`:''}`;
  navigate(en?'/journal?ecrire=1&lang=en':'/journal?ecrire=1',{state:{citationBiblique:texte}});
 }
 return <div role="dialog" aria-modal="false" aria-labelledby={titre} className="rounded-xl bg-hd-surface-container-lowest p-hd-space-md flex flex-col gap-3 shadow-sm">
  <div className="flex items-start justify-between gap-2"><h3 id={titre} className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Merci de le signaler','Thank you for telling us')}</h3><button type="button" onClick={onFermer} aria-label={l('Fermer','Close')} className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-hd-on-surface-variant"><IconeHD nom="close" className="text-[20px]"/></button></div>
  <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Ta progression est conservée en paix. Chaque semaine devant Dieu est une nouvelle grâce, sans dette ni culpabilité.','Your progress is kept in peace. Every week before God is a new grace, without debt or guilt.')}</p>
  <fieldset className="flex flex-col gap-2"><legend className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider mb-1">{l('Raison (facultatif)','Reason (optional)')}</legend>
   <div className="flex flex-wrap gap-2">{RAISONS.map(([k,fr,english])=><button key={k} type="button" aria-pressed={raison===k} onClick={()=>setRaison(r=>r===k?null:k)} className={`min-h-[44px] px-3.5 rounded-full font-hd-label-md text-hd-label-md ${raison===k?'bg-hd-secondary text-hd-on-secondary':'bg-hd-surface-container text-hd-on-surface'}`}>{en?english:fr}</button>)}</div>
  </fieldset>
  <label htmlFor={champ} className="font-hd-label-sm text-hd-label-sm text-hd-on-surface">{l('Un mot pour ton journal privé (facultatif)','A word for your private journal (optional)')}</label>
  <textarea id={champ} value={mot} onChange={e=>setMot(e.target.value)} rows={3} className="rounded-xl bg-hd-surface-container-low p-3 font-hd-body-md text-hd-body-md text-hd-on-surface" placeholder={l('Un temps de repos ou de prière à la maison…','A time of rest or prayer at home…')}/>
  <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Rien n’est envoyé au serveur. Avec une raison ou un mot, ton journal privé s’ouvre avec ce brouillon : c’est toi qui choisis de l’enregistrer.','Nothing is sent to the server. With a reason or a word, your private journal opens with this draft: you choose whether to save it.')}</p>
  <button type="button" onClick={enregistrer} className="min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium">{l('Enregistrer en paix','Save in peace')}</button>
 </div>;
}
