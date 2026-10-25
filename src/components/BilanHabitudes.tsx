import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import './BilanHabitudes.css';

/** Vue de lecture : aucune déclaration, écriture ou validation locale. */
export function BilanHabitudes({jours,langue}:{jours:readonly JourHabitudesLecture[];langue:string}){
 const en=langue==='en';
 const total=jours.reduce((n,j)=>n+j.bilan.total,0),faites=jours.reduce((n,j)=>n+j.bilan.realisees,0);
 const libelles=en?{non_commencee:'Not recorded yet',preparee:'Prepared',partielle:'Partly done',realisee:'Completed'}:{non_commencee:'Pas encore enregistrée',preparee:'Préparée',partielle:'Réalisée en partie',realisee:'Réalisée'};
 return <section className="hd-bilan" aria-labelledby="hd-bilan-titre">
  <header><p className="hd-bilan-repere">{en?'Habits & Challenges':'Habitudes & Défis'}</p><h2 id="hd-bilan-titre">{en?'Each activity, at your pace':'Chaque activité, à ton rythme'}</h2>
   <p>{en?'This summary shows only the records confirmed by the server.':'Ce bilan reprend uniquement les enregistrements confirmés par le serveur.'}</p>
   {total>0&&<p className="hd-bilan-total">{en?`${faites} of ${total} activities completed`:`${faites} activité${faites>1?'s':''} réalisée${faites>1?'s':''} sur ${total}`}</p>}
  </header>
  {total===0?<p role="status">{en?'No activity is currently available here. Your saved history is preserved.':'Aucune activité n’est disponible ici pour le moment. Ton historique enregistré est conservé.'}</p>:<ol className="hd-bilan-jours">{jours.filter(j=>j.activites.length).map(j=><li key={j.date_locale}>
   <header><h3>{en?'Day':'Jour'} {j.jour}</h3><time dateTime={j.date_locale}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(j.date_locale+'T12:00:00Z'))}</time></header>
   <ul>{j.activites.map(a=><li key={a.id} className={`hd-bilan-activite hd-etat-${a.etat}`}>
    <div><h4>{a.consigne}</h4>{!a.requise&&<small>{en?'Optional':'Facultative'}</small>}</div>
    <div><p>{libelles[a.etat]}</p>{a.confirmee&&<small>{en?'Server record':'Enregistrement serveur'}</small>}{a.aide&&<p className="hd-bilan-aide">{en?'Help requested':'Aide demandée'}</p>}</div>
   </li>)}</ul>
  </li>)}</ol>}
 </section>;
}
