import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {chargerHorairesHabitudes,reglerRythmeDime,type ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import {planningHabitudesPourDate,type RythmeDime} from '@/lib/habitudes-planning';
import {ChoixRythmeDime} from './ChoixRythmeDime';
import {SimulateurDime} from './SimulateurDime';
import {SimulateurEpargne} from './SimulateurEpargne';
import {IconeHD} from './IconeHabitudes';
import {IconeVolet} from './IconeVolet';

const jourSuivant=(date:string,n:number)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);

/** Prochaine dîme prévue (aujourd'hui compris), cherchée sur 40 jours : couvre la semaine et le mois. */
export function prochaineDime(config:ConfigurationHoraires,participantId:string,dateLocale:string){
 const modele=config.modeles[0];if(!modele||!config.modeles.some(m=>m.habit_key==='dime'))return null;
 for(let i=0;i<40;i++){
  const date=jourSuivant(dateLocale,i);
  const r=planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:date,fuseau:config.fuseau,dime:config.dime},config.modeles,config.horaires).rendezVous.find(x=>x.habit_key==='dime');
  if(r)return {date,heure:r.heure_locale};
 }
 return null;
}

/** Demande de Dr Justin (03/11/2026) : « Ma dîme » repliable sous « Mes cultes de la semaine »,
 * avec le rythme, la prochaine date, des exemples concrets et le simulateur. */
export function MaDimeHabitudes({enrollmentId,participantId,dateLocale,langue,lienReglages}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;lienReglages:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false);
 return <details className="hd-volet mb-hd-space-lg rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm" onToggle={e=>setOuvert(e.currentTarget.open)}>
  <summary className="list-none [&::-webkit-details-marker]:hidden min-h-[48px] cursor-pointer flex items-center gap-3 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeVolet nom="dime"/><span className="flex-1">{l('Ma dîme','My tithe')}</span><IconeHD nom="expand_more" className="hd-volet-chevron text-[22px] text-hd-on-surface-variant"/></summary>
  {ouvert&&<ContenuDime key={enrollmentId+dateLocale} {...{enrollmentId,participantId,dateLocale,langue,lienReglages}}/>}
 </details>;
}

/** Maquette validée le 07/11/2026 : « Épargne » juste sous « Ma dîme », même volet repliable. Calcul local seulement. */
export function MonEpargneHabitudes({langue}:{langue:string}){
 const en=langue==='en';
 return <details id="hd-epargne" className="hd-volet mb-hd-space-lg rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm">
  <summary className="list-none [&::-webkit-details-marker]:hidden min-h-[48px] cursor-pointer flex items-center gap-2 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeHD nom="potted_plant" className="text-[20px] text-hd-secondary"/><span className="flex-1">{en?'Savings':'Épargne'}</span><IconeHD nom="expand_more" className="hd-volet-chevron text-[22px] text-hd-on-surface-variant"/></summary>
  <div className="pt-2 sim-ios-dans-volet"><SimulateurEpargne langue={langue} replie={false}/></div>
 </details>;
}

function ContenuDime({enrollmentId,participantId,dateLocale,langue,lienReglages}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;lienReglages:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [config,setConfig]=useState<ConfigurationHoraires|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const [valeur,setValeur]=useState<RythmeDime>({rythme:'semaine'}),[occupe,setOccupe]=useState(false),[message,setMessage]=useState(''),[echec,setEchec]=useState('');
 useEffect(()=>{let actif=true;setConfig(null);setErreur(false);void chargerHorairesHabitudes(enrollmentId).then(c=>{if(actif){setConfig(c);setValeur(c.dime??{rythme:'semaine'});}}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[enrollmentId,tour]);
 if(erreur)return <div className="pt-2"><p role="alert">{l('Ta dîme ne peut pas être vérifiée pour le moment.','Your tithe cannot be checked right now.')}</p><button type="button" className="min-h-[44px] px-3 text-hd-secondary" onClick={()=>setTour(n=>n+1)}>{l('Réessayer','Retry')}</button></div>;
 if(!config)return <p role="status" className="pt-2">{l('Chargement de ta dîme…','Loading your tithe…')}</p>;
 const actuel=config.dime??{rythme:'semaine'};
 const change=JSON.stringify(valeur)!==JSON.stringify(actuel);
 const prochaine=prochaineDime(config,participantId,dateLocale);
 const format=(date:string)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00Z'));
 async function enregistrer(){if(occupe||!change)return;setOccupe(true);setMessage('');setEchec('');
  try{await reglerRythmeDime(valeur);setMessage(l('Rythme enregistré.','Rhythm saved.'));setTour(n=>n+1);}catch{setEchec(l('Rythme non enregistré. Vérifie ta connexion et réessaie.','Rhythm not saved. Check your connection and try again.'));}finally{setOccupe(false);}
 }
 const exemple=(titre:string,lignes:string[],resultat:string)=><li className="rounded-xl bg-hd-surface-container-low p-3 flex flex-col gap-1">
  <span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{titre}</span>
  {lignes.map(x=><span key={x} className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{x}</span>)}
  <span className="font-hd-label-md text-hd-label-md text-hd-secondary">{resultat}</span>
 </li>;
 return <div className="flex flex-col gap-4 pt-2">
  <section aria-label={l('Prochaine dîme','Next tithe')} className="rounded-xl bg-hd-secondary-container/30 p-3 flex items-start gap-3">
   <IconeHD nom="calendar_month"className="text-[20px] text-hd-secondary mt-0.5 shrink-0"/>
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{prochaine?<>{prochaine.date===dateLocale?l('Aujourd’hui','Today'):l('Prochaine dîme :','Next tithe:')} <strong>{prochaine.date===dateLocale?'':format(prochaine.date)+' · '}{prochaine.heure}</strong>. {actuel.rythme==='mois'?l(`Une fois par mois, le ${actuel.jour_mois}.`,`Once a month, on day ${actuel.jour_mois}.`):l('Chaque semaine.','Every week.')}</>:l('Aucune dîme prévue pour le moment.','No tithe planned for now.')}</p>
  </section>
  <section className="flex flex-col gap-2">
   <ChoixRythmeDime langue={langue} valeur={valeur} onChange={v=>{setValeur(v);setMessage('');}} desactive={occupe}/>
   <button type="button" onClick={()=>void enregistrer()} disabled={occupe||!change} className="w-full min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg disabled:opacity-55">{occupe?l('Enregistrement…','Saving…'):l('Enregistrer mon rythme','Save my rhythm')}</button>
   {message&&<p role="status" className="font-hd-body-sm text-hd-body-sm text-hd-secondary">{message}</p>}
   {echec&&<p role="alert" className="font-hd-body-sm text-hd-body-sm text-hd-error">{echec}</p>}
   <Link to={lienReglages} className="self-start min-h-[44px] inline-flex items-center gap-1 font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4"><IconeHD nom="schedule" className="text-[16px]"/>{l('Changer le jour ou l’heure de ma dîme','Change the day or time of my tithe')}</Link>
  </section>
  <section aria-labelledby="dime-comment" className="flex flex-col gap-2">
   <h3 id="dime-comment" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Comment donner ma dîme','How to give my tithe')}</h3>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('La dîme, c’est 10 % de ce que tu as réellement gagné. Ces exemples sont des repères pédagogiques, pas un conseil fiscal.','The tithe is 10% of what you actually earned. These examples are teaching guides, not tax advice.')}</p>
   <ul className="flex flex-col gap-2">
    {exemple(l('Je suis commerçant','I run a business'),[l('Ventes de la semaine : 1 000','Sales this week: 1,000'),l('Marchandises achetées : 650 · Charges du commerce : 150','Goods bought: 650 · Business costs: 150'),l('Bénéfice : 1 000 − 650 − 150 = 200','Profit: 1,000 − 650 − 150 = 200')],l('Dîme : 10 % de 200 = 20','Tithe: 10% of 200 = 20'))}
    {exemple(l('Je reçois un salaire','I receive a salary'),[l('Salaire du mois : 500','Monthly salary: 500'),l('Dépenses de travail non remboursées : 70','Unreimbursed work expenses: 70'),l('Base : 500 − 70 = 430','Base: 500 − 70 = 430')],l('Dîme : 10 % de 430 = 43','Tithe: 10% of 430 = 43'))}
    {exemple(l('J’ai reçu un don','I received a gift'),[l('Don reçu : 100','Gift received: 100')],l('Dîme : 10 % de 100 = 10','Tithe: 10% of 100 = 10'))}
   </ul>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Un prêt n’est pas un revenu : pas de dîme sur la somme prêtée. L’offrande, elle, est libre. Si tu perds de l’argent sur la période, la dîme est de 0.','A loan is not income: no tithe on the amount lent. An offering is free. If you lose money over the period, the tithe is 0.')}</p>
  </section>
  <SimulateurDime langue={langue}/>
 </div>;
}
