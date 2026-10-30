import {BilansHebdomadairesHabitudes} from '@/components/BilansHebdomadairesHabitudes';
import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import './BilanHabitudes.css';

/** Résumé d'une journée repliée : ce qui a été réalisé sur ce qui était prévu. */
const resumeJour=(faites:number,total:number,en:boolean)=>en?`${faites} of ${total} completed`:`${faites} / ${total} réalisée${faites>1?'s':''}`;
/** Vue de lecture : aucune déclaration, écriture ou validation locale. */
export function BilanHabitudes({jours,langue,inscription}:{jours:readonly JourHabitudesLecture[];langue:string;inscription?:string}){
 const en=langue==='en';
 const total=jours.reduce((n,j)=>n+j.bilan.total,0),faites=jours.reduce((n,j)=>n+j.bilan.realisees,0);
 const libelles=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 return <section className="hd-bilan" aria-labelledby="hd-bilan-titre">
  <header><p className="hd-bilan-repere">{en?'Habits & Challenges':'Habitudes & Défis'}</p><h2 id="hd-bilan-titre">{en?'Each activity, at your pace':'Chaque activité, à ton rythme'}</h2>
   <p>{en?'This summary shows only the records confirmed by the server.':'Ce bilan reprend uniquement les enregistrements confirmés par le serveur.'}</p>
   {total>0&&<p className="hd-bilan-total">{en?`${faites} of ${total} activities completed`:`${faites} activité${faites>1?'s':''} réalisée${faites>1?'s':''} sur ${total}`}</p>}
  </header>
  <BilansHebdomadairesHabitudes jours={jours} langue={langue} inscription={inscription}/>
  {total===0?<p role="status">{en?'No activity is currently available here. Your saved history is preserved.':'Aucune activité n’est disponible ici pour le moment. Ton historique enregistré est conservé.'}</p>:<ol className="hd-bilan-jours">{jours.filter(j=>j.activites.length).map(j=><li key={j.date_locale}>
   {/* Journée repliée par défaut (demande de Dr Justin du 30/10/2026) : un toucher sur la journée montre le détail des activités. */}
   <details className="hd-bilan-jour-repli">
   <summary><span className="hd-bilan-jour-titre"><h3>{en?'Day':'Jour'} {j.jour}</h3><time dateTime={j.date_locale}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(j.date_locale+'T12:00:00Z'))}</time></span>
    <span className="hd-bilan-jour-resume">{resumeJour(j.activites.filter(a=>a.etat==='realisee').length,j.activites.length,en)}</span>
    <svg className="hd-bilan-jour-chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></summary>
   <ul>{j.activites.map(a=><li key={a.id} className={`hd-bilan-activite hd-etat-${a.etat}`}>
    <div><h4>{a.consigne}</h4>{!a.requise&&<small>{en?'Optional':'Facultative'}</small>}</div>
    <div><p>{libelles[a.etat]}</p>{a.confirmee&&<small>{en?'Server record':'Enregistrement serveur'}</small>}{a.aide&&<p className="hd-bilan-aide">{en?'Help requested':'Aide demandée'}</p>}</div>
   </li>)}</ul>
   </details>
  </li>)}</ol>}
 </section>;
}
