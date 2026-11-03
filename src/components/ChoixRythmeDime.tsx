import type {RythmeDime} from '@/lib/habitudes-planning';

/** Décision de Dr Justin (03/11/2026) : la dîme revient chaque semaine pour un commerçant,
 * une fois par mois pour une personne salariée (jour du mois choisi, par exemple le jour de la paie). */
export function ChoixRythmeDime({langue,valeur,onChange,desactive=false}:{langue:string;valeur:RythmeDime;onChange:(v:RythmeDime)=>void;desactive?:boolean}){
 const l=(fr:string,en:string)=>langue==='en'?en:fr;
 const option='flex items-start gap-3 p-3 rounded-xl bg-hd-surface-container-low cursor-pointer min-h-[44px]';
 return <fieldset disabled={desactive} className="border-0 p-0 m-0 flex flex-col gap-2 min-w-0">
  <legend className="mb-1 font-hd-label-md text-hd-label-md text-hd-on-surface">{l('Ma situation pour la dîme','My situation for the tithe')}</legend>
  <label className={option}><input type="radio" name="rythme-dime" className="mt-0.5 w-5 h-5 accent-hd-secondary shrink-0" checked={valeur.rythme==='semaine'} onChange={()=>onChange({rythme:'semaine'})}/><span className="flex flex-col"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Je suis commerçant','I run a business')}</span><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Chaque semaine, le jour choisi ci-dessous.','Every week, on the day chosen below.')}</span></span></label>
  <label className={option}><input type="radio" name="rythme-dime" className="mt-0.5 w-5 h-5 accent-hd-secondary shrink-0" checked={valeur.rythme==='mois'} onChange={()=>onChange({rythme:'mois',jour_mois:valeur.rythme==='mois'?valeur.jour_mois:1})}/><span className="flex flex-col"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Je reçois un salaire','I receive a salary')}</span><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Une fois par mois, par exemple le jour de ta paie.','Once a month, for example on your payday.')}</span></span></label>
  {valeur.rythme==='mois'&&<label className="flex flex-col gap-1.5 font-hd-label-md text-hd-label-md text-hd-on-surface-variant">{l('Jour du mois','Day of the month')}
   <select value={valeur.jour_mois} onChange={e=>onChange({rythme:'mois',jour_mois:Number(e.target.value)})} className="min-h-[44px] w-full rounded-lg bg-hd-surface-container-low px-3 text-hd-on-surface font-hd-label-lg text-hd-label-lg border border-hd-outline-variant/60 focus:outline-2 focus:outline-hd-secondary">{Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>
   <span className="font-hd-body-sm text-hd-body-sm">{l('Si le mois est plus court, la dîme revient le dernier jour du mois.','If the month is shorter, the tithe comes on the last day of the month.')}</span>
  </label>}
 </fieldset>;
}
