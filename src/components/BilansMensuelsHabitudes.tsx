import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import {semainesHabitudes} from '@/lib/habitudes-bilans';

/** Mois pédagogiques de 30 jours ; le dernier inclut la dernière journée civile du parcours. */
export function bilansMensuels(jours:readonly JourHabitudesLecture[]){
 const groupes=new Map<number,JourHabitudesLecture[]>();
 for(const j of jours){if(!Number.isInteger(j.jour)||j.jour<1||j.jour>181)continue;const mois=Math.min(6,Math.floor((j.jour-1)/30)+1);const groupe=groupes.get(mois)??[];if(!groupe.some(x=>x.jour===j.jour))groupe.push(j);groupes.set(mois,groupe);}
 return [...groupes].sort(([a],[b])=>a-b).map(([mois,disponibles])=>{
  const semaines=semainesHabitudes(disponibles),somme=(k:'total'|'realisees'|'partielles'|'preparees'|'enAttente'|'journeesCompletes')=>semaines.reduce((n,s)=>n+s[k],0);
  return {mois,de:30*(mois-1)+1,a:mois===6?181:30*mois,jours:disponibles.length,total:somme('total'),realisees:somme('realisees'),partielles:somme('partielles'),preparees:somme('preparees'),enAttente:somme('enAttente'),journeesCompletes:somme('journeesCompletes')};
 });
}

export function BilansMensuelsHabitudes({jours,langue,inscription}:{jours:readonly JourHabitudesLecture[];langue:string;inscription?:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr,bilans=bilansMensuels(jours).filter(m=>m.total>0);
 if(!bilans.length)return null;
 const questions=en?['What went well this month?','What was difficult?','What did I learn?','What goal fits my situation now?','What next action do I choose?']:['Qu’est-ce qui s’est bien passé ce mois-ci ?','Qu’est-ce qui a été difficile ?','Qu’ai-je appris ?','Quel objectif est adapté à ma situation aujourd’hui ?','Quelle prochaine action est-ce que je choisis ?'];
 return <section aria-label={l('Bilans mensuels','Monthly reviews')} className="hd-stitch flex flex-col gap-hd-space-md">
  <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Mon bilan du mois','My monthly review')}</h3>
  {bilans.map(m=><article key={m.mois} className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md flex flex-col gap-3 shadow-[0_2px_10px_rgba(29,28,19,0.04)]">
   <header><h4 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Mois','Month')} {m.mois}</h4><p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Jours','Days')} {m.de} {l('à','to')} {m.a} · {m.jours} {l('jours disponibles dans ce bilan','days available in this review')}</p></header>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{m.jours<m.a-m.de+1?l('Bilan provisoire : seuls les jours disponibles sont comptés. Les jours à venir sont exclus.','Interim review: only available days are counted. Future days are excluded.'):l('Ce bilan couvre les journées disponibles de ce mois du parcours.','This review covers the available days of this programme month.')} {l('Ces chiffres ne mesurent ni ta foi ni ta valeur.','These figures do not measure your faith or your worth.')}</p>
   <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl bg-hd-surface-container-low p-3">{[[l('Activités réalisées','Completed activities'),`${m.realisees} / ${m.total}`],[l('Réalisées en partie','Partly done'),m.partielles],[l('Préparées','Prepared'),m.preparees],[l('Journées avec les activités requises réalisées','Days with required activities completed'),m.journeesCompletes],...(m.enAttente?[[l('En attente de confirmation','Awaiting confirmation'),m.enAttente]]:[])].map(([label,valeur])=><div key={label} className="contents"><dt className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{label}</dt><dd className="font-hd-label-lg text-hd-label-lg text-right text-hd-on-surface">{valeur}</dd></div>)}</dl>
   <details className="rounded-xl bg-hd-surface-container-low"><summary className="cursor-pointer min-h-[48px] px-3 flex items-center font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Prendre un temps pour mon bilan du mois','Reflect on my month')}</summary><div className="px-3 pb-3 flex flex-col gap-3"><ol className="flex flex-col gap-2">{questions.map(q=><li key={q} className="rounded-xl bg-hd-surface-container-lowest p-3 font-hd-body-md text-hd-body-md">{q}</li>)}</ol>{inscription&&<a className="min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary flex items-center justify-center font-hd-label-lg text-hd-label-lg" href={`${import.meta.env.BASE_URL}journal?inscription=${encodeURIComponent(inscription)}${en?'&lang=en':''}`}>{l('Écrire dans mon journal','Write in my journal')}</a>}</div></details>
  </article>)}
 </section>;
}
