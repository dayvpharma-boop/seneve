import { Fragment, useState, type KeyboardEvent, type ReactNode } from 'react';
import { texts, type Language } from '@/lib/test-texts';
import { categorie } from '@/lib/racines';
import { IconeOffresDemarrage as I } from './IconesDemarrage';
const SYMBOLS:Parameters<typeof I>[0]['nom'][]=['anchor','favorite','flare','inventory_2','spa','check_circle','compass_calibration'];

/** Les cartes restent un choix explicite : aucune sélection par défaut en cas d’égalité.
 * `detail` s’ouvre juste sous la racine choisie, et non en bas de la liste (demande du 24/10/2026). */
export function ChoixRacines({indices,totals,chosenRoot,onChoose,language,allSupport,detail}:{indices:number[];totals:number[];chosenRoot:number|null;onChoose:(k:number)=>void;language:Language;allSupport:boolean;detail?:ReactNode}){
 const [expanded,setExpanded]=useState(false),t=texts[language],en=language==='en';
 const visible=allSupport&&!expanded?indices.slice(0,3):indices;
 function keyboard(e:KeyboardEvent<HTMLButtonElement>,position:number){
  const direction=['ArrowDown','ArrowRight'].includes(e.key)?1:['ArrowUp','ArrowLeft'].includes(e.key)?-1:0;
  if(!direction&&!['Home','End'].includes(e.key))return;e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?visible.length-1:(position+direction+visible.length)%visible.length;
  const root=visible[next];if(root===undefined)return;onChoose(root);
  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus();
 }
 return <div className={'choix-racines'+(allSupport?' choix-appuis':'')}>
  {allSupport?<><div className="choix-appuis-image"><img src={`${import.meta.env.BASE_URL}illustrations/resultats-appuis.svg`} alt="" width="96" height="96"/></div><section className="choix-etat" aria-label={en?'Overview of your roots':'État des racines'}><header><span>{en?'Your roots':'État des racines'}</span><b>{en?'7 / 7 anchors':'7 / 7 points d’appui'}</b></header><dl>{t.roots.map((r,k)=><div key={r.n}><I nom={SYMBOLS[k]??'spa'} taille={18}/><dt>{r.n}</dt><dd>{totals[k]} / 15</dd></div>)}</dl></section><p className="choix-invitation">{en?'Choose the root you would like to deepen:':'Choisis librement la racine que tu souhaites approfondir :'}</p></>:<section className="choix-jardin" aria-label={en?'Roots at the same level':'Racines au même niveau'}><header><span>{en?`${indices.length} roots at the same level`:`${indices.length} racines ex æquo`}</span><b>{totals[indices[0]??0]} / 15</b></header><img src={`${import.meta.env.BASE_URL}illustrations/resultats-egalite.svg`} width="340" height="80" alt=""/><p>{en?'Choose one starting point, one step at a time.':'Un point de départ à choisir, un pas à la fois.'}</p></section>}
  <div className="root-choices" role="radiogroup" aria-label={t.choose}>{visible.map((k,position)=><Fragment key={k}><button type="button"className="root-choice" role="radio" aria-label={t.roots[k]?.n} aria-checked={chosenRoot===k} tabIndex={chosenRoot===k||(!visible.includes(chosenRoot??-1)&&position===0)?0:-1} onClick={()=>onChoose(k)} onKeyDown={e=>keyboard(e,position)}><span className="choix-radio" aria-hidden="true">{chosenRoot===k&&<I nom="check" taille={16}/>}</span><span className="choix-contenu"><strong>{t.roots[k]?.n}</strong><span className="choix-score">{totals[k]} / 15 <span>· {categorie(totals[k]??3,language)}</span></span><span className="choix-description">{t.roots[k]?.p}</span></span></button>{chosenRoot===k&&detail&&<div className="choix-detail">{detail}</div>}</Fragment>)}</div>
  {allSupport&&indices.length>3&&<button type="button" className="choix-autres" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?(en?'Show fewer roots':'Afficher moins de racines'):(en?'See the other 4 roots':'Voir les 4 autres racines disponibles')}<I nom="expand_more" taille={18}/></button>}
 </div>;
}
