import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {chargerRecommandations,CATEGORIES_RECOMMANDATIONS,type Recommandation,type TransportRecommandations} from '@/lib/habitudes-recommandations-api';
export function RecommandationsHabitudes({langue,transport=supabase}:{langue:string;transport?:TransportRecommandations}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false),[tour,setTour]=useState(0),[resultat,setResultat]=useState<{langue:string;lignes:Recommandation[]}|null>(null),[erreur,setErreur]=useState(false);
 useEffect(()=>{if(!ouvert)return;let actif=true;setResultat(null);setErreur(false);
  void chargerRecommandations(transport,langue).then(lignes=>{if(actif)setResultat({langue,lignes});}).catch(()=>{if(actif)setErreur(true);});
  return()=>{actif=false;};
 },[ouvert,tour,langue,transport]);
 const rows=resultat?.langue===langue?resultat.lignes:null;
 return <section className="rounded-2xl bg-hd-surface-container p-hd-space-md font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">
  <button type="button" aria-expanded={ouvert} onClick={()=>setOuvert(v=>!v)} className="min-h-[44px] text-left font-hd-label-lg text-hd-label-lg text-hd-on-surface">{l('Livres et prédications conseillés','Recommended books and teaching')} {ouvert?'−':'+'}</button>
  {ouvert&&<div className="flex flex-col gap-3 mt-2">
   <p>{l('Choisis selon tes besoins. Ouvrir un lien ne valide aucune activité : déclare ensuite le temps réellement consacré.','Choose what suits your needs. Opening a link does not complete an activity: record the time you actually spent afterwards.')}</p>
   {erreur?<p role="alert">{l('Les recommandations ne peuvent pas être chargées. Réessaie.','Recommendations could not be loaded. Try again.')}</p>:rows===null?<p role="status">{l('Chargement des recommandations…','Loading recommendations…')}</p>:!rows.length?<p>{l('Aucune recommandation publiée en français pour le moment. Tu peux utiliser les livres et prédications de ton choix.','No recommendations have been published in English yet. You can use books and teaching of your choice.')}</p>:CATEGORIES_RECOMMANDATIONS.map(([categorie,titre])=>{
    const lignes=rows.filter(r=>r.categorie===categorie);if(!lignes.length)return null;
    return <section key={categorie} className="flex flex-col gap-2"><h3 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{en?{lecture_pro:'Professional reading',lecture_personnelle:'Personal development',predication:'Sermons and teaching'}[categorie]:titre}</h3>{lignes.map(r=><article key={r.id} className="rounded-xl bg-hd-surface-container-lowest p-3 flex flex-col gap-2">
     <h4 className="font-hd-label-lg text-hd-label-lg text-hd-on-surface [overflow-wrap:anywhere]">{r.titre}</h4>
     <p>{r.auteur} · {en?'English':'Français'} · {r.acces==='gratuit'?l('Accès gratuit','Free access'):r.acces==='payant'?l('Accès payant','Paid access'):l('Accès à vérifier sur le site','Check access on the website')}</p>
     {r.description&&<p className="[overflow-wrap:anywhere]">{r.description}</p>}
     <a className="min-h-[44px] inline-flex items-center text-hd-secondary font-hd-label-md text-hd-label-md underline" href={r.url} target="_blank" rel="noopener noreferrer">{categorie==='predication'?l('Ouvrir la prédication','Open teaching'):l('Voir le livre','View book')} ↗ <span className="sr-only">{r.titre} · {l('site externe','external website')}</span></a>
    </article>)}</section>;
   })}
   <button type="button" className="min-h-[44px] px-3 rounded-xl bg-hd-surface-container-high text-hd-on-surface" onClick={()=>setTour(t=>t+1)}>{l('Actualiser les recommandations','Refresh recommendations')}</button>
  </div>}
 </section>;
}

