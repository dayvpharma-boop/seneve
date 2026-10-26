import {useEffect,useState} from 'react';
import {chargerJourRecette,type JourRecette} from '@/lib/habitudes-jour-recette';
import {bilanHabitudes,type EtatOccurrence} from '@/lib/habitudes';
import {supabase} from '@/lib/supabase';
import {HistoriqueRecetteHabitudes} from './HistoriqueRecetteHabitudes';
import {DeclarationHabitude} from './DeclarationHabitude';

export function ActivitesJourRecette({enrollmentId,participantId,dateLocale,langue}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [lecture,setLecture]=useState<{cle:string;data:JourRecette}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const [revision,setRevision]=useState(0);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}`;
 useEffect(()=>{let vivant=true;setLecture(null);setErreur(false);void chargerJourRecette(enrollmentId,participantId,dateLocale).then(data=>{if(vivant)setLecture({cle,data});}).catch(()=>{if(vivant)setErreur(true);});return()=>{vivant=false;};},[cle,tour]);
 const data=lecture?.cle===cle?lecture.data:null;
 const bilan=data?bilanHabitudes({enrollment_id:enrollmentId,version:1,date_locale:dateLocale},data.activites.map(a=>a.occurrence),data.activites.flatMap(a=>a.etat?[a.etat]:[])):null;
 function confirmer(etat:EtatOccurrence){setRevision(n=>n+1);setLecture(ancien=>ancien?.cle===cle?{...ancien,data:{...ancien.data,activites:ancien.data.activites.map(a=>a.occurrence.occurrence_id===etat.occurrence_id?{...a,etat}:a)}}:ancien);}
 return <section className="hd-activites-recette" aria-label={l('Mes activités quotidiennes','My daily activities')}>
  <h2>{l('Un pas après l’autre','One step at a time')}</h2>
  <p>{l('Tes déclarations décrivent ta pratique. Elles ne mesurent ni ta foi ni ta valeur.','Your records describe your practice. They do not measure your faith or worth.')}</p>
  {erreur?<><p role="alert">{l('Les activités ne peuvent pas être vérifiées. Actualise avant de déclarer une action.','Activities cannot be verified. Refresh before recording an action.')}</p><button className="oa-primary" onClick={()=>setTour(t=>t+1)}>{l('Actualiser les activités','Refresh activities')}</button></>:!data?<p role="status">{l('Chargement des activités…','Loading activities…')}</p>:<>
   <p>{l('Jour','Day')} {data.jour} · <time dateTime={dateLocale}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',dateStyle:'long'}).format(new Date(dateLocale+'T12:00:00Z'))}</time></p>
   <p role="status">{bilan!.realisees} / {bilan!.total} {l('activités réalisées','activities completed')} · {bilan!.partielles} {l('en partie','partly done')}</p>
   <progress aria-label={l('Activités réalisées aujourd’hui','Activities completed today')} value={bilan!.realisees} max={bilan!.total}/>
   {data.activites.map(a=><div key={a.occurrence.occurrence_id}><p className="hd-activite-heure"><time dateTime={a.heure}>{a.heure}</time></p><DeclarationHabitude userId={data.userId} occurrence={a.occurrence} consigne={a.consigne} critere={a.critere} etat={a.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer}/></div>)}
   <HistoriqueRecetteHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} revision={revision}/>
  </>}
 </section>;
}
