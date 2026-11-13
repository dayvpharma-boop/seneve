import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ENGAGEMENTS} from '@/lib/habitudes-engagements';
import {IconeHD} from './IconeHabitudes';

/** Rappel quotidien des engagements (demande de Dr Justin du 13/11/2026), juste après l'Amidah.
 * N'apparaît qu'en fin de journée (18 h, heure du planning ; à ajuster si une autre heure convient mieux) :
 * la question porte sur la journée déjà largement vécue.
 * Volontairement léger : jamais compté, jamais remis à zéro automatiquement. « Oui » referme tout de suite ;
 * pour « Non », « Continuer ma route » referme aussi, après avoir vu la liste et le lien vers « Mes engagements »
 * (où reste, à l'initiative de la personne, la déclaration qui réinitialise le compteur de fidélité). */
const HEURE_APPARITION=18;
function heureLocale(fuseau:string,t:number):number{
 try{return parseInt(new Intl.DateTimeFormat('fr-FR',{timeZone:fuseau,hour:'2-digit',hour12:false}).format(t),10);}catch{return HEURE_APPARITION;}
}
export function EngagementsJourHabitudes({participantId,dateLocale,langue,fuseau='Africa/Kinshasa'}:{participantId:string;dateLocale:string;langue:string;fuseau?:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const suffixe=en?'?lang=en':'';
 const cle=`seneve:hd:engagements-jour:v2:${participantId}:${dateLocale}`;
 const [ferme,setFerme]=useState(()=>{try{return localStorage.getItem(cle)==='1';}catch{return false;}});
 const [reponse,setReponse]=useState<'oui'|'non'|null>(null);
 const [manques,setManques]=useState<Set<number>>(new Set());
 const [maintenant,setMaintenant]=useState(Date.now);
 useEffect(()=>{const t=window.setInterval(()=>setMaintenant(Date.now()),60000);return()=>window.clearInterval(t);},[]);
 function fermerDefinitivement(){setFerme(true);try{localStorage.setItem(cle,'1');}catch{/* reste affiché pour cette visite */}}
 function repondre(v:'oui'|'non'){setReponse(v);if(v==='oui')fermerDefinitivement();}
 function basculer(i:number){setManques(m=>{const n=new Set(m);n.has(i)?n.delete(i):n.add(i);return n;});}
 if(ferme||heureLocale(fuseau,maintenant)<HEURE_APPARITION)return null;
 const carte='rounded-2xl bg-hd-surface-container-lowest p-hd-space-md shadow-sm flex flex-col gap-hd-space-sm';
 return <section className="ios-section mb-hd-space-lg" aria-label={l('Mes engagements du jour','Today’s commitments')}>
  <h3 className="ios-titre-section">{l('Mes engagements','My commitments')}</h3>
  <div className={carte}>
   {reponse===null?<>
    <p className="font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2"><IconeHD nom="favorite" className="text-[18px] text-hd-secondary"/>{l('As-tu marché selon la Parole aujourd’hui ?','Have you walked according to the Word today?')}</p>
    <div className="flex gap-2">
     <button type="button" className="flex-1 min-h-[48px] bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg rounded-xl" onClick={()=>repondre('oui')}>{l('Oui','Yes')}</button>
     <button type="button" className="flex-1 min-h-[48px] bg-hd-surface-container text-hd-on-surface font-hd-label-lg text-hd-label-lg rounded-xl" onClick={()=>repondre('non')}>{l('Non','No')}</button>
    </div>
   </>:<>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Lequel ? (facultatif)','Which one? (optional)')}</p>
    <ul className="flex flex-col gap-2">{ENGAGEMENTS.map((e,i)=><li key={e.icone}><label className="flex items-center gap-2.5 min-h-[44px] font-hd-label-md text-hd-label-md text-hd-on-surface cursor-pointer"><input type="checkbox" className="w-5 h-5 shrink-0 accent-current text-hd-secondary" checked={manques.has(i)} onChange={()=>basculer(i)}/>{(en?e.en:e.fr)[0]}</label></li>)}</ul>
    <Link to={`/habitudes/engagements${suffixe}`} className="self-start min-h-[44px] inline-flex items-center gap-1.5 font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4"><IconeHD nom="folded_hands" className="text-[16px]"/>{l('Voir comment reprendre','See how to come back')}</Link>
    <button type="button" className="self-start min-h-[44px] px-3.5 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-md text-hd-label-md" onClick={fermerDefinitivement}>{l('Continuer ma route','Keep going')}</button>
   </>}
  </div>
 </section>;
}
