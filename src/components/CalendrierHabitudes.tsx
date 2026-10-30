import type {JourHabitudesLecture} from '@/lib/habitudes-lecture';
import type {Bilan} from '@/lib/progres';
import {IconeProgres} from '@/components/IconeProgres';

/** Calendrier Habitudes & Défis sur la page Parcours (demande de Dr Justin du 31/10/2026) :
 *  même présentation que les autres parcours (tuiles des jours, barre, chiffres), pour le mois en cours.
 *  Lecture seule : uniquement les enregistrements confirmés par le serveur, rien n'est calculé ou validé ici. */
type EtatTuile='complete'|'commencee'|'aucune'|'vide'|'a_venir';
export function etatJourHabitudes(j:JourHabitudesLecture|undefined):EtatTuile{
 if(!j)return 'a_venir';
 if(!j.activites.length)return 'vide';
 const faites=j.activites.filter(a=>a.etat==='realisee').length;
 if(faites===j.activites.length)return 'complete';
 if(faites>0||j.activites.some(a=>a.etat==='partielle'||a.etat==='preparee'))return 'commencee';
 return 'aucune';
}

export function CalendrierHabitudes({jours,b,langue}:{jours:readonly JourHabitudesLecture[];b:Bilan;langue:string}){
 const en=langue==='en';
 const parJour=new Map(jours.map(j=>[j.jour,j]));
 const mois=Math.max(1,Math.ceil(Math.max(1,b.joursOuverts)/30));
 const premier=(mois-1)*30+1,dernier=Math.max(premier,Math.min(mois*30,b.duree||mois*30));
 const aujourdhui=!b.termine&&!b.pasCommence?b.joursOuverts:null;
 const activites=jours.flatMap(j=>j.activites);
 const faites=activites.filter(a=>a.etat==='realisee').length;
 const etats=jours.map(j=>etatJourHabitudes(j));
 const completes=etats.filter(e=>e==='complete').length,commencees=etats.filter(e=>e==='commencee').length;
 const aides=activites.filter(a=>a.aide).length;
 const joursAvecActivites=etats.filter(e=>e!=='vide').length;
 // Rien de publié pour les jours ouverts : pas de calendrier de zéros (le bilan l'explique déjà).
 if(!activites.length)return null;
 const tuiles=Array.from({length:dernier-premier+1},(_,i)=>premier+i);
 const symbole=(e:EtatTuile,jour:number)=>e==='a_venir'?<IconeProgres nom="lock" taille={16}/>:e==='complete'?<IconeProgres nom="check" taille={16}/>:e==='commencee'?<IconeProgres nom="contrast" taille={16}/>:<span>{jour}</span>;
 const libelle=(e:EtatTuile)=>({complete:en?'all activities completed':'toutes les activités réalisées',commencee:en?'started':'commencée',aucune:en?'nothing recorded':'rien d’enregistré',vide:en?'no activity':'aucune activité',a_venir:en?'not open yet':'pas encore ouvert'})[e];
 return <section className="card progres-carte hd-calendrier" aria-labelledby="hd-calendrier-titre">
  <div className="parcours-synthese-titre"><h2 id="hd-calendrier-titre">{en?'My calendar':'Mon calendrier'}</h2><span>{en?'Month':'Mois'} {mois}</span></div>
  <p className="progres-compte">{b.termine?(en?'Journey completed':'Parcours terminé'):en?`Day ${b.joursOuverts} of ${b.duree} · days ${premier} to ${dernier} shown`:`Jour ${b.joursOuverts} sur ${b.duree} · jours ${premier} à ${dernier}`}</p>
  <ol className="day-tiles progres-tuiles is-compact" aria-label={en?`Days ${premier} to ${dernier}`:`Jours ${premier} à ${dernier}`}>
   {tuiles.map(jour=>{const e=jour>b.joursOuverts?'a_venir':etatJourHabitudes(parJour.get(jour));
    return <li key={jour} className={['day-tile',jour===aujourdhui&&'is-today',e==='complete'&&'is-done',e==='a_venir'&&'is-locked',e==='commencee'&&'is-partial'].filter(Boolean).join(' ')} aria-label={`${en?'Day':'Jour'} ${jour} : ${libelle(e)}${jour===aujourdhui?(en?' (today)':' (aujourd’hui)'):''}`}>
     <span className="parcours-rond" aria-hidden="true">{symbole(e,jour)}</span><span className="parcours-jour" aria-hidden="true">{en?'D':'J'}{jour}</span></li>;})}
  </ol>
  <p className="hd-calendrier-legende" aria-hidden="true"><span><i className="hd-pastille" style={{background:'var(--vivant-vert)'}}/>{en?'All done':'Tout réalisé'}</span><span><i className="hd-pastille" style={{background:'color-mix(in srgb,var(--vivant-vert) 16%,var(--vivant-fond))'}}/>{en?'Started':'Commencée'}</span><span><IconeProgres nom="lock" taille={14}/>{en?'Not open yet':'À venir'}</span></p>
  {joursAvecActivites>0&&<div className="pc-participation"><div><strong>{en?'Complete days':'Journées complètes'}</strong><span>{completes} / {joursAvecActivites}</span></div><progress max={joursAvecActivites} value={completes} aria-label={en?'Complete days':'Journées complètes'} aria-describedby="hd-calendrier-note"/><p id="hd-calendrier-note">{en?'A day is complete when all its activities are recorded as completed. This reflects only your records.':'Une journée est complète quand toutes ses activités sont enregistrées comme réalisées. Cela décrit uniquement tes enregistrements.'}</p></div>}
  <ul className="progres-chiffres">
   <li><div><IconeProgres nom="check_circle" taille={16}/><strong>{faites}</strong></div><span>{en?'Activities completed':'Activités réalisées'}</span></li>
   <li><div><IconeProgres nom="eco" taille={16}/><strong>{completes}</strong></div><span>{en?'Complete days':'Journées complètes'}</span></li>
   <li><div><IconeProgres nom="hourglass_bottom" taille={16}/><strong>{commencees}</strong></div><span>{en?'Days started':'Journées commencées'}</span></li>
   {aides>0&&<li><div><IconeProgres nom="help" taille={16}/><strong>{aides}</strong></div><span>{en?'Help requested':'Aide demandée'}</span></li>}
  </ul>
 </section>;
}
