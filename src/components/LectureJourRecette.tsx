import {lecturesHabitudesFr} from '@/data/habitudes-lectures-fr';
import {lecturesHabitudesEn} from '@/data/habitudes-lectures-en';

/** Textes déjà publiés et validés. La lecture ne déclenche aucune déclaration. */
export function LectureJourRecette({jour,langue}:{jour:number;langue:string}){
 const en=langue==='en',lecture=(en?lecturesHabitudesEn:lecturesHabitudesFr).find(l=>l.jour===jour);
 if(!Number.isInteger(jour)||!lecture)return null;
 return <article className="hd-lecture-jour-recette" aria-label={en?'Today’s reading':'La lecture du jour'}>
  <p className="hd-lecture-jour-repere">{en?'A moment to reflect':'Un temps pour réfléchir'} · {en?'Day':'Jour'} {jour}</p>
  <h2>{en?'Today’s reading':'La lecture du jour'}</h2>
  <h3>{lecture.titre}</h3>
  <p className="hd-lecture-jour-objectif">{lecture.objectif}</p>
  <p>{lecture.texte_pedagogique}</p>
  <blockquote>{lecture.question_reflexion}</blockquote>
  <small>{en?'An educational adaptation based on the book. Reading does not mark any activity as completed.':'Adaptation pédagogique à partir du livre. La lecture ne valide aucune activité automatiquement.'}</small>
 </article>;
}
