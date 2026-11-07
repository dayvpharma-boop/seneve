import {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {SimulateurEpargne} from '@/components/SimulateurEpargne';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {NotFound} from '@/routes/introuvable';

/** Page « Épargne » ouverte depuis les raccourcis de la journée (maquette validée le 07/11/2026).
 * Simple calcul local : aucun appel serveur, rien n'est enregistré. */
export function HabitudesSimulateurEpargne(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',suffixe=en?'?lang=en':'';
 useEffect(()=>{document.title=(en?'Savings':'Épargne')+' — SÉNEVÉ';document.documentElement.lang=langue;},[en,langue]);
 if(!habitudesActivees())return <NotFound/>;
 return <CadreHabitudes titre={en?'Savings':'Épargne'} langue={langue} retour={`/espace${suffixe}`} retourLibelle={en?'Back to my day':'Revenir à ma journée'} liens={{aujourdhui:`/espace${suffixe}`}} actif="aujourdhui">
  <div className="px-hd-margin pt-hd-space-lg pb-hd-space-lg" style={{background:'var(--ios-fond,#f2f2f7)'}}>
   <h1 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface" style={{fontSize:34,lineHeight:1.1,letterSpacing:'-.02em',fontWeight:700,margin:'0 4px 6px'}}>{en?'Savings':'Épargne'}</h1>
   <SimulateurEpargne langue={langue} replie={false}/>
  </div>
 </CadreHabitudes>;
}
