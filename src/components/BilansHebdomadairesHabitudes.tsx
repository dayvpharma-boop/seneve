import {Link} from 'react-router-dom';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import {semainesHabitudes} from '@/lib/habitudes-bilans';
export function BilansHebdomadairesHabitudes({jours,langue,inscription}:{jours:readonly JourHabitudesLecture[];langue:string;inscription?:string}){
 const en=langue==='en',semaines=semainesHabitudes(jours);
 if(!semaines.some(s=>s.total>0))return null;
 const questions=en?['What went well this week?','What was difficult?','What did I learn?','What goal fits my situation now?','What next action do I choose?']:['Qu’est-ce qui s’est bien passé cette semaine ?','Qu’est-ce qui a été difficile ?','Qu’ai-je appris ?','Quel objectif est adapté à ma situation aujourd’hui ?','Quelle prochaine action est-ce que je choisis ?'];
 return <section className="hd-semaines" aria-label={en?'Weekly reviews':'Bilans hebdomadaires'}><h3>{en?'My weekly reviews':'Mes bilans hebdomadaires'}</h3>
  <p>{en?'These figures cover the available activities in this summary. They do not measure your faith or your worth.':'Ces chiffres portent sur les activités disponibles dans ce bilan. Ils ne mesurent ni ta foi ni ta valeur.'}</p>
  <ol>{semaines.map(s=><li key={s.numero} className="card"><h4>{en?'Week':'Semaine'} {s.numero}</h4><p>{en?'Days':'Jours'} {s.de} {en?'to':'à'} {s.a}</p>
   <dl><dt>{en?'Completed activities':'Activités réalisées'}</dt><dd>{s.realisees} / {s.total}</dd><dt>{en?'Partly done':'Réalisées en partie'}</dt><dd>{s.partielles}</dd><dt>{en?'Prepared':'Préparées'}</dt><dd>{s.preparees}</dd><dt>{en?'Help requested':'Aide demandée'}</dt><dd>{s.aides}</dd><dt>{en?'Days with required activities completed':'Journées avec les activités requises réalisées'}</dt><dd>{s.journeesCompletes}</dd>{s.enAttente>0&&<><dt>{en?'Awaiting confirmation':'En attente de confirmation'}</dt><dd>{s.enAttente}</dd></>}</dl>
   <details><summary>{en?'Reflect on my week':'Préparer mon bilan'}</summary><ol>{questions.map(q=><li key={q}>{q}</li>)}</ol>{inscription&&<Link className="link" to={`/journal?inscription=${encodeURIComponent(inscription)}${en?'&lang=en':''}`}>{en?'Write in my journal':'Écrire dans mon journal'}</Link>}</details>
  </li>)}</ol>
 </section>;
}
