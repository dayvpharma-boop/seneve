import {useEffect,useState} from 'react';
import {chargerDefisHabitudes,type SuiviDefis} from '@/lib/habitudes-defis-api';
import type {EtatOccurrence} from '@/lib/habitudes';
import {supabase} from '@/lib/supabase';
import {DeclarationHabitude} from './DeclarationHabitude';

export function SuiviDefisHabitudes({enrollmentId,participantId,dateLocale,jour,langue}:{enrollmentId:string;participantId:string;dateLocale:string;jour:number;langue:string}){
 const [ouvert,setOuvert]=useState(false),[lecture,setLecture]=useState<{cle:string;data:SuiviDefis}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}`;
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 // Défis validés en français (26/10/2026) et en anglais (28/10/2026).
 const disponible=langue==='fr'||en;
 useEffect(()=>{if(!ouvert||jour>30||!disponible)return;let actif=true;setLecture(null);setErreur(false);void chargerDefisHabitudes(enrollmentId,participantId,dateLocale).then(data=>{if(actif)setLecture({cle,data});}).catch(()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[cle,ouvert,tour,jour,disponible]);
 if(jour<1||jour>30||!disponible)return null;
 const data=lecture?.cle===cle?lecture.data:null;
 function confirmer(etat:EtatOccurrence){setLecture(ancien=>ancien?.cle===cle?{...ancien,data:{...ancien.data,defis:ancien.data.defis.map(d=>d.occurrence.occurrence_id===etat.occurrence_id?{...d,etat}:d)}}:ancien);}
 return <section className="px-hd-margin py-hd-space-md flex flex-col gap-3" aria-label={l('Suivi de mes défis facultatifs','Tracking my optional challenges')}>
  <button type="button" aria-expanded={ouvert} className="min-h-[48px] rounded-xl bg-hd-secondary text-hd-on-secondary px-4 py-3 font-hd-label-lg" onClick={()=>setOuvert(v=>!v)}>{ouvert?l('Fermer le suivi des défis','Close challenge tracking'):l('Suivre mes défis facultatifs','Track my optional challenges')}</button>
  {ouvert&&<><h3 className="font-hd-headline-sm text-hd-headline-sm">{l('Mes défis, à mon rythme','My challenges, at my own pace')}</h3><p className="font-hd-body-md text-hd-body-md">{l('Déclare ce que tu as réellement essayé ou pratiqué. Ce suivi reste distinct de tes habitudes quotidiennes. Aucun nom, montant ou récit personnel n’est demandé.','Declare what you actually tried or practiced. This tracking stays separate from your daily habits. No name, amount or personal story is requested.')}</p>
   {erreur?<><p role="alert">{l('Le suivi des défis ne peut pas être vérifié pour le moment.','Challenge tracking cannot be verified right now.')}</p><button type="button" className="min-h-[44px] underline" onClick={()=>setTour(n=>n+1)}>{l('Réessayer les défis','Try the challenges again')}</button></>:!data?<p role="status">{l('Chargement de tes défis…','Loading your challenges…')}</p>:<>
    <p role="status">{en?`${data.defis.filter(d=>d.ouvert&&d.etat?.synchronisation==='synchronise'&&d.etat.etat==='realisee').length} challenge(s) completed out of ${data.defis.filter(d=>d.ouvert).length} open`:`${data.defis.filter(d=>d.ouvert&&d.etat?.synchronisation==='synchronise'&&d.etat.etat==='realisee').length} défi(s) réalisé(s) sur ${data.defis.filter(d=>d.ouvert).length} ouvert(s)`}</p>
    {data.defis.map(d=><section key={d.occurrence.occurrence_id} className="rounded-2xl bg-hd-surface-container-lowest p-hd-space-md flex flex-col gap-2"><p className="font-hd-label-sm text-hd-label-sm">{en?`Days ${d.du} to ${d.au} · optional`:`Jours ${d.du} à ${d.au} · facultatif`}</p>
     {d.ouvert?<div className="hd-classique"><DeclarationHabitude userId={data.userId} occurrence={d.occurrence} consigne={d.titre} critere={d.critere} etat={d.etat} langue={en?'en':'fr'} lectureSeule={false} aideDisponible={false} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer}/></div>:<><h4>{d.titre}</h4><p>{en?`Available from day ${d.du}.`:`Disponible à partir du jour ${d.du}.`}</p></>}
    </section>)}
   </>}
  </>}
 </section>;
}
