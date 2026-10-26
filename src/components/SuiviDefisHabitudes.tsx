import {useEffect,useState} from 'react';
import {chargerDefisHabitudes,type SuiviDefis} from '@/lib/habitudes-defis-api';
import type {EtatOccurrence} from '@/lib/habitudes';
import {supabase} from '@/lib/supabase';
import {DeclarationHabitude} from './DeclarationHabitude';

export function SuiviDefisHabitudes({enrollmentId,participantId,dateLocale,jour,langue}:{enrollmentId:string;participantId:string;dateLocale:string;jour:number;langue:string}){
 const [ouvert,setOuvert]=useState(false),[lecture,setLecture]=useState<{cle:string;data:SuiviDefis}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}`;
 useEffect(()=>{if(!ouvert||jour>30||langue!=='fr')return;let actif=true;setLecture(null);setErreur(false);void chargerDefisHabitudes(enrollmentId,participantId,dateLocale).then(data=>{if(actif)setLecture({cle,data});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[cle,ouvert,tour,jour,langue]);
 if(jour<1||jour>30||langue!=='fr')return null;
 const data=lecture?.cle===cle?lecture.data:null;
 function confirmer(etat:EtatOccurrence){setLecture(ancien=>ancien?.cle===cle?{...ancien,data:{...ancien.data,defis:ancien.data.defis.map(d=>d.occurrence.occurrence_id===etat.occurrence_id?{...d,etat}:d)}}:ancien);}
 return <section className="px-hd-margin py-hd-space-md flex flex-col gap-3" aria-label="Suivi de mes défis facultatifs">
  <button type="button" aria-expanded={ouvert} className="min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary px-4 py-3 font-hd-label-lg" onClick={()=>setOuvert(v=>!v)}>{ouvert?'Fermer le suivi des défis':'Suivre mes défis facultatifs'}</button>
  {ouvert&&<><h3 className="font-hd-headline-sm text-hd-headline-sm">Mes défis, à mon rythme</h3><p className="font-hd-body-md text-hd-body-md">Déclare ce que tu as réellement essayé ou pratiqué. Ce suivi reste distinct de tes habitudes quotidiennes. Aucun nom, montant ou récit personnel n’est demandé.</p>
   {erreur?<><p role="alert">Le suivi des défis ne peut pas être vérifié pour le moment.</p><button type="button" className="min-h-[44px] underline" onClick={()=>setTour(n=>n+1)}>Réessayer les défis</button></>:!data?<p role="status">Chargement de tes défis…</p>:<>
    <p role="status">{data.defis.filter(d=>d.ouvert&&d.etat?.synchronisation==='synchronise'&&d.etat.etat==='realisee').length} défi(s) réalisé(s) sur {data.defis.filter(d=>d.ouvert).length} ouvert(s)</p>
    {data.defis.map(d=><section key={d.occurrence.occurrence_id} className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md flex flex-col gap-2"><p className="font-hd-label-sm text-hd-label-sm">Jours {d.du} à {d.au} · facultatif</p>
     {d.ouvert?<div className="hd-classique"><DeclarationHabitude userId={data.userId} occurrence={d.occurrence} consigne={d.titre} critere={d.critere} etat={d.etat} langue="fr" lectureSeule={false} aideDisponible={false} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer}/></div>:<><h4>{d.titre}</h4><p>Disponible à partir du jour {d.du}.</p></>}
    </section>)}
   </>}
  </>}
 </section>;
}
