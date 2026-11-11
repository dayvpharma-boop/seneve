import './CalendrierPlage.css';
import {useState} from 'react';
import {IconeHD} from '@/components/IconeHabitudes';

/** Calendrier façon iPhone pour choisir un jour ou une suite de jours (décision de Dr Justin du 11/11/2026) :
 * un premier toucher choisit le début, un second la fin (ou le même jour) ; un troisième recommence.
 * Raccourcis : aujourd'hui, 7 derniers jours, ce mois-ci, cette année. Les jours futurs ne sont pas sélectionnables. */
export type Plage={du:string;au:string};
const iso=(d:Date)=>new Intl.DateTimeFormat('en-CA').format(d);
const versDate=(s:string)=>{const [a=2000,m=1,j=1]=s.split('-').map(Number);return new Date(a,m-1,j);};
export const nbJours=(p:Plage)=>Math.round((versDate(p.au).getTime()-versDate(p.du).getTime())/86400000)+1;

export function CalendrierPlage({valeur,changer,langue}:{valeur:Plage|null;changer:(p:Plage|null)=>void;langue:'fr'|'en'}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const auj=iso(new Date());
 const [mois,setMois]=useState(()=>{const d=valeur?versDate(valeur.au):new Date();return new Date(d.getFullYear(),d.getMonth(),1);});
 const [attente,setAttente]=useState<string|null>(null);
 const titre=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{month:'long',year:'numeric'}).format(mois);
 const jours=Array.from({length:new Date(mois.getFullYear(),mois.getMonth()+1,0).getDate()},(_,i)=>iso(new Date(mois.getFullYear(),mois.getMonth(),i+1)));
 const decalage=(mois.getDay()+6)%7;
 const entetes=en?['M','T','W','T','F','S','S']:['L','M','M','J','V','S','D'];
 const moisSuivantFutur=iso(new Date(mois.getFullYear(),mois.getMonth()+1,1))>auj;
 const nomJour=(d:string)=>new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(versDate(d));

 function toucher(d:string){
  if(d>auj)return;
  if(attente===null){setAttente(d);changer({du:d,au:d});return;}
  setAttente(null);changer(d<attente?{du:d,au:attente}:{du:attente,au:d});
 }
 function raccourci(p:Plage){setAttente(null);changer(p);setMois(new Date(versDate(p.au).getFullYear(),versDate(p.au).getMonth(),1));}
 const maintenant=new Date();
 const raccourcis:[string,Plage][]=[
  [l('Aujourd’hui','Today'),{du:auj,au:auj}],
  [l('7 derniers jours','Last 7 days'),{du:iso(new Date(maintenant.getFullYear(),maintenant.getMonth(),maintenant.getDate()-6)),au:auj}],
  [l('Ce mois-ci','This month'),{du:iso(new Date(maintenant.getFullYear(),maintenant.getMonth(),1)),au:auj}],
  [l('Cette année','This year'),{du:`${maintenant.getFullYear()}-01-01`,au:auj}],
 ];

 return <div className="cp">
  <div className="cp-raccourcis" role="group" aria-label={l('Choix rapides','Quick choices')}>{raccourcis.map(([n,p])=><button key={n} type="button" aria-pressed={valeur?.du===p.du&&valeur?.au===p.au} onClick={()=>raccourci(p)}>{n}</button>)}</div>
  <div className="cp-carte">
   <div className="cp-entete">
    <span className="cp-titre">{titre.charAt(0).toUpperCase()+titre.slice(1)}</span>
    <span className="cp-fleches">
     <button type="button" aria-label={l('Mois précédent','Previous month')} onClick={()=>setMois(new Date(mois.getFullYear(),mois.getMonth()-1,1))}><IconeHD nom="chevron_left" className="text-[24px]"/></button>
     <button type="button" aria-label={l('Mois suivant','Next month')} disabled={moisSuivantFutur} onClick={()=>setMois(new Date(mois.getFullYear(),mois.getMonth()+1,1))}><IconeHD nom="chevron_right" className="text-[24px]"/></button>
    </span>
   </div>
   <div className="cp-grille" role="grid" aria-label={titre}>
    {entetes.map((e,i)=><span key={i} className="cp-jsem" aria-hidden="true">{e}</span>)}
    {Array.from({length:decalage},(_,i)=><span key={'v'+i}/>)}
    {jours.map(d=>{
     const dans=!!valeur&&d>=valeur.du&&d<=valeur.au,debut=valeur?.du===d,fin=valeur?.au===d,futur=d>auj;
     const semaine=(versDate(d).getDay()+6)%7;
     return <span key={d} role="gridcell" className={`cp-case${dans?' cp-dans':''}${debut?' cp-debut':''}${fin?' cp-fin':''}${dans&&(semaine===0)?' cp-lundi':''}${dans&&(semaine===6)?' cp-dimanche':''}`}>
      <button type="button" disabled={futur} aria-pressed={debut||fin} aria-label={nomJour(d)} onClick={()=>toucher(d)} className={d===auj?'cp-aujourdhui':''}>{Number(d.slice(8))}</button>
     </span>;})}
   </div>
  </div>
  <p className="cp-aide" aria-live="polite">{attente?l('Touche le dernier jour (ou le même jour pour un seul jour).','Tap the last day (or the same day for a single day).'):valeur?'':l('Touche le premier jour à effacer.','Tap the first day to erase.')}</p>
 </div>;
}
