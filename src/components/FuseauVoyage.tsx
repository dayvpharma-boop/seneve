import './FuseauVoyage.css';
import {useEffect,useRef,useState} from 'react';
import {changerFuseauHabitudes,lireRappelsHabitudes} from '@/lib/habitudes-rappels';
import {fuseauTelephone} from '@/lib/rappels';
import {IconeHD} from './IconeHabitudes';

/** « Africa/Kinshasa » → « Kinshasa », « America/New_York » → « New York ». */
export function nomVille(fuseau:string){return (fuseau.split('/').pop()??fuseau).replaceAll('_',' ');}
function heureA(fuseau:string,langue:string){
 try{return new Intl.DateTimeFormat(langue==='en'?'en-GB':'fr-FR',{timeZone:fuseau,hour:'2-digit',minute:'2-digit'}).format(new Date());}catch{return '';}
}
/** Deux noms pour la même heure (ex. Lagos et Kinshasa) ne sont pas un voyage : comparer l'heure affichée
 * maintenant et à quatre moments de l'année, pour tenir compte des heures d'été. */
export function memeHeure(a:string,b:string,maintenant=Date.now()){
 try{
  const f=(z:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const fa=f(a),fb=f(b);
  return [0,91,182,273].every(j=>{const d=new Date(maintenant+j*864e5);return fa.format(d)===fb.format(d);});
 }catch{return false;}
}
// Choix « garder l'heure d'avant » : propre à ce téléphone et à ce voyage, jamais envoyé au serveur.
const cle=(horaires:string,telephone:string)=>`seneve-fuseau-garde:${horaires}:${telephone}`;
function garde(horaires:string,telephone:string){try{return localStorage.getItem(cle(horaires,telephone))==='1';}catch{return false;}}

/** Voyage : quand le téléphone n'est plus dans le fuseau des horaires d'habitudes, proposer de les garder à l'heure d'ici.
 * Rien ne change sans le « oui » de la personne ; les heures restent les mêmes (06:00 reste 06:00, heure d'ici). */
export function FuseauVoyage({langue}:{langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const telephone=fuseauTelephone();
 const [horaires,setHoraires]=useState<string|null>(null),[cache,setCache]=useState(false);
 const [occupe,setOccupe]=useState(false),[fait,setFait]=useState(false),[erreur,setErreur]=useState(false);
 const verrou=useRef(false);
 useEffect(()=>{let actif=true;void lireRappelsHabitudes().then(e=>{if(actif&&e.inscrit&&e.fuseau)setHoraires(e.fuseau);}).catch(()=>undefined);return()=>{actif=false;};},[]);
 async function oui(){
  if(verrou.current)return;verrou.current=true;setOccupe(true);setErreur(false);
  try{const e=await changerFuseauHabitudes(telephone);if(e.inscrit&&e.fuseau===telephone)setFait(true);else setErreur(true);}catch{setErreur(true);}finally{verrou.current=false;setOccupe(false);}
 }
 function non(){try{localStorage.setItem(cle(horaires!,telephone),'1');}catch{/* le choix vaut alors pour cette visite seulement */}setCache(true);}
 if(fait)return <section role="status" className="hd-fuseau hd-fuseau-fait"><IconeHD nom="check_circle" className="text-[20px]"/><p>{l(`C’est fait. Tes habitudes suivent maintenant l’heure de ${nomVille(telephone)}, aux mêmes heures qu’avant.`,`Done. Your habits now follow ${nomVille(telephone)} time, at the same hours as before.`)}</p></section>;
 if(!horaires||horaires===telephone||memeHeure(horaires,telephone)||cache||garde(horaires,telephone))return null;
 return <section aria-labelledby="hd-fuseau-titre" className="hd-fuseau">
  <h2 id="hd-fuseau-titre"><IconeHD nom="schedule" className="text-[20px]"/>{l('Tu as changé de fuseau horaire','You are in a different time zone')}</h2>
  <p>{l(`Ton téléphone est à l’heure de ${nomVille(telephone)} (${heureA(telephone,langue)}). Tes horaires d’habitudes suivent encore l’heure de ${nomVille(horaires)} (${heureA(horaires,langue)}).`,
   `Your phone is on ${nomVille(telephone)} time (${heureA(telephone,langue)}). Your habit schedule still follows ${nomVille(horaires)} time (${heureA(horaires,langue)}).`)}</p>
  <p><strong>{l('Garder tes horaires à l’heure d’ici ?','Keep your schedule on local time?')}</strong> {l('Par exemple, une prière prévue à 6 h restera à 6 h, heure d’ici.','For example, a prayer set for 6:00 stays at 6:00, local time.')}</p>
  <div className="hd-fuseau-choix">
   <button type="button" className="hd-fuseau-oui" disabled={occupe} onClick={()=>void oui()}>{occupe?l('Un instant…','Just a moment…'):l('Oui, à l’heure d’ici','Yes, local time')}</button>
   <button type="button" className="hd-fuseau-non" disabled={occupe} onClick={non}>{l(`Non, garder l’heure de ${nomVille(horaires)}`,`No, keep ${nomVille(horaires)} time`)}</button>
  </div>
  {erreur&&<p role="alert">{l('Le changement n’a pas pu être enregistré. Réessaie dans un instant.','The change could not be saved. Please try again in a moment.')}</p>}
 </section>;
}
