import {Link} from 'react-router-dom';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import {semainesHabitudes} from '@/lib/habitudes-bilans';
import {IconeHD} from './IconeHabitudes';

/** Familles d'affichage de la grille Stitch, déduites du libellé ; aucune donnée n'est créée ni modifiée. */
const FAMILLES:[string,string,RegExp][]=[['Prières','Prayers',/pri[eè]re|prayer/i],['Bible','Bible',/bible/i],['Lectures','Reading',/lecture|d[ée]veloppement|pr[ée]dication|reading|sermon|personal growth/i],['Gratitude','Gratitude',/gratitude/i],['Exercice','Exercise',/exercice|exercise|gymnastique/i],['Culte','Worship',/culte|worship/i]];
function point(etats:string[]){if(!etats.length)return 'aucun';if(etats.every(e=>e==='realisee'))return 'fait';if(etats.some(e=>e==='realisee'||e==='partielle'))return 'partiel';return 'vide';}

/** Bilans hebdomadaires présentés comme la maquette Stitch « Bilan hebdomadaire ». */
export function BilansHebdomadairesHabitudes({jours,langue,inscription}:{jours:readonly JourHabitudesLecture[];langue:string;inscription?:string}){
 const en=langue==='en',semaines=semainesHabitudes(jours);
 if(!semaines.some(s=>s.total>0))return null;
 const questions=en?['What went well this week?','What was difficult?','What did I learn?','What goal fits my situation now?','What next action do I choose?']:['Qu’est-ce qui s’est bien passé cette semaine ?','Qu’est-ce qui a été difficile ?','Qu’ai-je appris ?','Quel objectif est adapté à ma situation aujourd’hui ?','Quelle prochaine action est-ce que je choisis ?'];
 const initiale=(d:string)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{weekday:'narrow',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
 return <section className="hd-semaines hd-stitch flex flex-col gap-hd-space-md" aria-label={en?'Weekly reviews':'Bilans hebdomadaires'}>
  <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{en?'My weekly reviews':'Mes bilans hebdomadaires'}</h3>
  <div className="rounded-xl bg-hd-surface-container-low p-hd-space-md flex items-start gap-3"><IconeHD nom="spa" className="text-hd-secondary text-[20px] mt-0.5 shrink-0"/><p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant italic">{en?'These figures cover the available activities in this summary. They do not measure your faith or your worth.':'Ces chiffres portent sur les activités disponibles dans ce bilan. Ils ne mesurent ni ta foi ni ta valeur.'}</p></div>
  <ol className="flex flex-col gap-hd-space-md">{semaines.map(s=>{
   const jSem=jours.filter(j=>j.jour>=s.de&&j.jour<=s.a);
   const familles=FAMILLES.filter(([,,re])=>jSem.some(j=>j.activites.some(a=>re.test(a.consigne))));
   return <li key={s.numero} className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-md">
    <div className="flex items-baseline justify-between gap-2"><h4 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{en?'Week':'Semaine'} {s.numero}</h4><p className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant px-2.5 py-1 rounded-full bg-hd-surface-container">{en?'Days':'Jours'} {s.de} {en?'to':'à'} {s.a}</p></div>
    {familles.length>0&&<div aria-hidden="true" className="flex flex-col gap-2">
     <div className="grid items-center gap-1" style={{gridTemplateColumns:`5.5rem repeat(${jSem.length},minmax(0,1fr))`}}>
      <span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-on-surface-variant">{en?'Habit':'Discipline'}</span>
      {jSem.map(j=><span key={j.date_locale} className="text-center font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant uppercase">{initiale(j.date_locale)}</span>)}
      {familles.map(([fr,english,re])=>[<span key={fr} className="font-hd-label-md text-hd-label-md text-hd-on-surface py-1.5">{en?english:fr}</span>,...jSem.map(j=>{const p=point(j.activites.filter(a=>re.test(a.consigne)).map(a=>a.etat));
       return <span key={fr+j.date_locale} className="flex justify-center py-1.5">{p==='fait'?<span className="w-3.5 h-3.5 rounded-full bg-hd-secondary"/>:p==='partiel'?<span className="w-3.5 h-3.5 rounded-full border-2 border-hd-secondary bg-[linear-gradient(90deg,var(--hdc-secondary)_50%,transparent_50%)]"/>:p==='vide'?<span className="w-3.5 h-3.5 rounded-full border-2 border-hd-outline-variant"/>:<span className="w-3.5 h-3.5"/>}</span>;})])}
     </div>
     <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-hd-secondary"/>{en?'Done':'Fait'}</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-hd-secondary bg-[linear-gradient(90deg,var(--hdc-secondary)_50%,transparent_50%)]"/>{en?'Partly':'En partie'}</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-hd-outline-variant"/>{en?'Not recorded':'Non déclaré'}</span>
     </div>
    </div>}
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-xl bg-hd-surface-container-low p-3">
     {[[en?'Completed activities':'Activités réalisées',`${s.realisees} / ${s.total}`],[en?'Partly done':'Réalisées en partie',s.partielles],[en?'Prepared':'Préparées',s.preparees],[en?'Help requested':'Aide demandée',s.aides],[en?'Days with required activities completed':'Journées avec les activités requises réalisées',s.journeesCompletes],...(s.enAttente>0?[[en?'Awaiting confirmation':'En attente de confirmation',s.enAttente]]:[])].map(([dt,dd])=><div key={String(dt)} className="contents"><dt className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{dt}</dt><dd className="font-hd-label-lg text-hd-label-lg text-hd-on-surface font-semibold text-right">{dd}</dd></div>)}
    </dl>
    <details className="group rounded-xl bg-hd-surface-container-low"><summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-[48px] px-3 flex items-center gap-2 font-hd-label-lg text-hd-label-lg text-hd-on-surface"><IconeHD nom="edit_note" className="text-[20px] text-hd-secondary"/><span className="flex-1">{en?'Reflect on my week':'Préparer mon bilan'}</span><IconeHD nom="chevron_right" className="text-[20px] text-hd-outline transition-transform group-open:rotate-90"/></summary>
     <div className="px-3 pb-3 flex flex-col gap-2"><ol className="flex flex-col gap-2">{questions.map(q=><li key={q} className="rounded-xl bg-hd-surface-container-lowest p-3 font-hd-body-md text-hd-body-md text-hd-on-surface">{q}</li>)}</ol>
      {inscription&&<Link className="min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium flex items-center justify-center gap-2" to={`/journal?inscription=${encodeURIComponent(inscription)}${en?'&lang=en':''}`}>{en?'Write in my journal':'Écrire dans mon journal'}</Link>}</div>
    </details>
   </li>;})}</ol>
 </section>;
}
