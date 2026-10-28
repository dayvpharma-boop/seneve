import {RepereDureeHabitudes} from './RepereDureeHabitudes';
import {CultesSemaineHabitudes} from './CultesSemaineHabitudes';
import {LecteurPriereHabitudes,momentPriere} from './LecteurPriereHabitudes';
import {LecturesJourHabitudes,estLectureHabitudes} from './LecturesJourHabitudes';
import {useEffect,useState} from 'react';
import {chargerJourRecette,type JourRecette} from '@/lib/habitudes-jour-recette';
import {bilanHabitudes,type EtatOccurrence} from '@/lib/habitudes';
import {supabase} from '@/lib/supabase';
import {lecturesHabitudesFr} from '@/data/habitudes-lectures-fr';
import {lecturesHabitudesFrMois2} from '@/data/habitudes-lectures-fr-mois-2';
import {lecturesHabitudesFrMois3} from '@/data/habitudes-lectures-fr-mois-3';
import {lecturesHabitudesFrMois4} from '@/data/habitudes-lectures-fr-mois-4';
import {lecturesHabitudesFrMois5} from '@/data/habitudes-lectures-fr-mois-5';
import {lecturesHabitudesFrMois6} from '@/data/habitudes-lectures-fr-mois-6';
import {lecturesHabitudesEn} from '@/data/habitudes-lectures-en';
import {HistoriqueRecetteHabitudes} from './HistoriqueRecetteHabitudes';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';
import {lectureReprise,moisHabitudes} from '@/lib/habitudes-calendrier';
import {SuiviDefisHabitudes} from './SuiviDefisHabitudes';
import {defiDuJour} from '@/data/habitudes-defis-fr';

/** Heure locale « HH:MM » du participant ; null si le fuseau est invalide. */
function heureLocale(fuseau:string,maintenant:number){try{return new Intl.DateTimeFormat('en-GB',{timeZone:fuseau,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(maintenant));}catch{return null;}}
const minutes=(h:string)=>{const [a,b]=h.split(':').map(Number);return (a??0)*60+(b??0);};

/** Écran « Aujourd’hui » des maquettes Stitch : mêmes lectures serveur, mêmes déclarations, même historique.
 * Le prochain rendez-vous n’est qu’un repère d’affichage : il ne valide ni n’envoie rien.
 */
export function ActivitesJourRecette({enrollmentId,participantId,dateLocale,langue,fuseau='Africa/Kinshasa'}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;fuseau?:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [lecture,setLecture]=useState<{cle:string;data:JourRecette}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const [revision,setRevision]=useState(0),[maintenant,setMaintenant]=useState(Date.now);
 const [priereId,setPriereId]=useState<string|null>(null),[lecturesOuvertes,setLecturesOuvertes]=useState(false),[lectureInitialeId,setLectureInitialeId]=useState<string|null>(null);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}`;
 useEffect(()=>{setLecturesOuvertes(false);setLectureInitialeId(null);},[cle]);
 useEffect(()=>{let vivant=true;setLecture(null);setErreur(false);void chargerJourRecette(enrollmentId,participantId,dateLocale).then(data=>{if(vivant)setLecture({cle,data});}).catch(()=>{if(vivant)setErreur(true);});return()=>{vivant=false;};},[cle,tour]);
 useEffect(()=>{const t=window.setInterval(()=>setMaintenant(Date.now()),60000);return()=>window.clearInterval(t);},[]);
 const data=lecture?.cle===cle?lecture.data:null;
 const bilan=data?bilanHabitudes({enrollment_id:enrollmentId,version:1,date_locale:dateLocale},data.activites.map(a=>a.occurrence),data.activites.flatMap(a=>a.etat?[a.etat]:[])):null;
 function confirmer(etat:EtatOccurrence){setRevision(n=>n+1);setLecture(ancien=>ancien?.cle===cle?{...ancien,data:{...ancien.data,activites:ancien.data.activites.map(a=>a.occurrence.occurrence_id===etat.occurrence_id?{...a,etat}:a)}}:ancien);}
 if(erreur)return <section className="hd-jour-stitch px-hd-margin py-hd-space-md flex flex-col gap-hd-space-md" aria-label={l('Mes activités quotidiennes','My daily activities')}>
  <div className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-sm">
   <div className="flex items-center gap-2 text-hd-on-surface"><IconeHD nom="cloud_off" className="text-[20px] text-hd-secondary"/><p role="alert" className="font-hd-body-md text-hd-body-md">{l('Les activités ne peuvent pas être vérifiées. Actualise avant de déclarer une action.','Activities cannot be verified. Refresh before recording an action.')}</p></div>
   <button type="button" className="min-h-[48px] bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2" onClick={()=>setTour(t=>t+1)}><IconeHD nom="refresh" className="text-[20px]"/>{l('Actualiser les activités','Refresh activities')}</button>
  </div>
 </section>;
 if(!data)return <p role="status" className="px-hd-margin py-hd-space-md font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Chargement des activités…','Loading activities…')}</p>;
 // En anglais (aucune traduction relue) : reprise des 30 lectures approuvées (jour 31 → lecture 1, etc.), décision du 26/10/2026.
 // En français, mois 2 à 6 : textes propres validés les 27 et 28/10/2026.
 const mois=data.mois??moisHabitudes(data.jour),jourLecture=lectureReprise(data.jour);
 const textePropre=en?undefined:[...lecturesHabitudesFrMois2,...lecturesHabitudesFrMois3,...lecturesHabitudesFrMois4,...lecturesHabitudesFrMois5,...lecturesHabitudesFrMois6].find(x=>x.jour===data.jour);
 const texte=textePropre??(en?lecturesHabitudesEn:lecturesHabitudesFr).find(x=>x.jour===jourLecture);
 // Défis approuvés en français seulement (aucune version anglaise relue).
 const defi=en?undefined:defiDuJour(jourLecture);
 const date=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(dateLocale+'T12:00:00Z'));
 const activites=[...data.activites].sort((a,b)=>a.heure.localeCompare(b.heure));
 const prieres=activites.filter(a=>momentPriere(a.habit_key));
 const priere=activites.find(a=>a.occurrence.occurrence_id===priereId);
 const ouverte=(a:typeof activites[number])=>a.etat?.synchronisation!=='synchronise'||a.etat.etat!=='realisee';
 const h=heureLocale(fuseau,maintenant);
 const prochain=activites.find(a=>ouverte(a)&&h!==null&&a.heure>=h)??activites.find(ouverte)??null;
 const ecart=prochain&&h?minutes(prochain.heure)-minutes(h):null;
 const iProchain=prochain?activites.indexOf(prochain):-1;
 // Les rendez-vous éloignés du soir sont présentés en lignes discrètes, comme dans la maquette ; un appui les déplie.
 const plusTard=(i:number)=>iProchain>=0&&i>iProchain+2&&minutes(activites[i]!.heure)>=18*60;
 const premierPlusTard=activites.findIndex((_,i)=>plusTard(i));
 return <section className="hd-jour-stitch flex flex-col w-full px-hd-margin pb-hd-space-xl" aria-label={l('Mes activités quotidiennes','My daily activities')}>
  {/* Date et lecture du jour */}
  <header className="py-hd-space-md flex flex-col gap-1">
   <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded-full bg-hd-surface-container text-hd-on-surface-variant">
    <IconeHD nom="calendar_today" className="text-[14px] text-hd-secondary"/>
    <span className="font-hd-label-sm text-hd-label-sm tracking-wide"><time dateTime={dateLocale}>{date.charAt(0).toUpperCase()+date.slice(1)}</time> · {l('Jour','Day')} {data.jour} · {mois===1?l('30 jours gratuits','30 free days'):l(`Mois ${mois} sur 6`,`Month ${mois} of 6`)}</span>
   </div>
   {texte?<>
    <h2 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface mt-1">{texte.titre}</h2>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant italic">{texte.objectif}</p>
   </>:<h2 className="font-hd-headline-md text-hd-headline-md text-hd-on-surface mt-1">{l('Un pas après l’autre','One step at a time')}</h2>}
  </header>
  <aside className="mb-hd-space-lg bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-sm flex flex-col gap-2" aria-label={l('Prière Amidah','Amidah prayer')}>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{l('Matin · Midi · Soir','Morning · Midday · Evening')}</span>
   <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('L’Amidah','The Amidah')}</h3>
   {prieres.length?<div className="flex flex-wrap gap-2">{prieres.map(a=><button key={a.occurrence.occurrence_id} type="button" aria-label={l(`Lire et prier — ${momentPriere(a.habit_key)}`,`Read and pray — ${momentPriere(a.habit_key)}`)} onClick={()=>setPriereId(a.occurrence.occurrence_id)} className="flex-1 min-h-[48px] px-3 bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg rounded-xl flex items-center justify-center gap-2"><IconeHD nom="auto_stories" className="text-[20px]"/>{momentPriere(a.habit_key)==='matin'?l('Matin','Morning'):momentPriere(a.habit_key)==='midi'?l('Midi','Midday'):l('Soir','Evening')}</button>)}</div>:<a href={`${import.meta.env.BASE_URL}amidah.html?retour=espace`} className="min-h-[48px] px-4 bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg rounded-xl flex items-center justify-center gap-2"><IconeHD nom="auto_stories" className="text-[20px]"/>{l('Lire l’Amidah en français','Read the Amidah in French')}</a>}
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Choisis ta prière. Lire ne valide rien : appuie sur « J’ai prié » après avoir prié.','Choose your prayer. Reading completes nothing: press “I prayed” after praying.')}</p>
  </aside>
  {activites.some(a=>estLectureHabitudes(a.habit_key))&&<button type="button" onClick={()=>{setLectureInitialeId(null);setLecturesOuvertes(true);}} className="mb-hd-space-lg min-h-[48px] px-4 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-lg text-hd-label-lg flex items-center justify-center gap-2"><IconeHD nom="menu_book"/>{l('Lectures du jour','Today’s readings')}<IconeHD nom="chevron_right"/></button>}
  <CultesSemaineHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} onConfirme={confirmer}/>
  {/* Prochain rendez-vous */}
  {prochain&&<section className="mt-hd-space-xs mb-hd-space-lg" aria-label={l('Prochain rendez-vous','Next appointment')}>
   <div className="relative bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_4px_20px_rgba(117,91,0,0.06)] overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-1.5 bg-hd-secondary"/>
    <div className="flex items-center justify-between mb-hd-space-sm pt-1">
     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hd-secondary-container/40 text-hd-secondary font-hd-label-sm text-hd-label-sm uppercase tracking-wider"><IconeHD nom="schedule" className="text-[15px]"/>{l('Prochain rendez-vous','Next appointment')}</span>
     {ecart!==null&&ecart>=0&&<span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{ecart===0?l('Maintenant','Now'):ecart<60?l(`Dans ${ecart} min`,`In ${ecart} min`):l(`Dans ${Math.floor(ecart/60)} h ${String(ecart%60).padStart(2,'0')}`,`In ${Math.floor(ecart/60)} h ${String(ecart%60).padStart(2,'0')}`)}</span>}
    </div>
    <div className="mb-hd-space-sm">
     <div className="flex items-baseline gap-2"><span className="font-hd-label-lg text-hd-label-lg font-semibold text-hd-secondary"><time dateTime={prochain.heure}>{prochain.heure}</time></span><p className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{prochain.consigne}</p></div>
     {prochain.critere&&<p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant mt-1.5">{prochain.critere}</p>}
    </div>
    <div className="pt-2 flex items-center justify-between gap-hd-space-sm">
     <a href={`#hd-activite-${prochain.occurrence.occurrence_id}`} className="flex-1 min-h-[48px] bg-hd-secondary hover:bg-hd-on-secondary-fixed-variant text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"><IconeHD nom="play_arrow" className="text-[20px]"/><span>{l('Commencer','Start')}</span></a>
    </div>
   </div>
  </section>}
  {/* Ma journée */}
  <section className="flex flex-col gap-hd-space-sm" aria-label={l('Ma journée','My day')}>
   <div className="flex items-baseline justify-between mb-1">
    <div>
     <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Ma journée','My day')}</h3>
     <p role="status" className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant uppercase tracking-wider">{bilan!.realisees} / {bilan!.total} {l('réalisées','completed')} · {bilan!.partielles} {l('en partie','partly done')}</p>
    </div>
    <span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant italic whitespace-nowrap">{l('Sans hâte ni retard','No rush, no delay')}</span>
   </div>
   <progress className="sr-only" aria-label={l('Activités réalisées aujourd’hui','Activities completed today')} value={bilan!.realisees} max={bilan!.total}/>
   <div className="flex flex-col gap-2.5">
    {activites.map((a,i)=><div key={a.occurrence.occurrence_id} id={`hd-activite-${a.occurrence.occurrence_id}`} className={plusTard(i)?'opacity-85':''}>
     {i===premierPlusTard&&<span className="block pt-2 pb-2 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant px-1 uppercase tracking-wider">{l('Plus tard aujourd’hui','Later today')}</span>}
     <DeclarationHabitude variante="stitch" lienLecture={a.habit_key==='bible_matin'||a.habit_key==='bible_soir'?{href:`${import.meta.env.BASE_URL}bible/livres?depuis=habitudes&moment=${a.habit_key==='bible_matin'?'matin':'soir'}&lang=${en?'en':'fr'}`,label:a.habit_key==='bible_matin'?l('Lire la Bible du matin','Read the morning Bible reading'):l('Lire la Bible du soir','Read the evening Bible reading')}:undefined} lienEcriture={a.habit_key==='gratitude_matin'||a.habit_key==='gratitude_soir'?{href:`${import.meta.env.BASE_URL}journal?ecrire=1&depuis=habitudes&gratitude=${a.habit_key==='gratitude_matin'?'matin':'soir'}&lang=${en?'en':'fr'}`,label:a.habit_key==='gratitude_matin'?l('Écrire ma gratitude du matin','Write my morning gratitude'):l('Écrire ma gratitude du soir','Write my evening gratitude')}:undefined} heure={a.heure} attenue={plusTard(i)} userId={data.userId} occurrence={a.occurrence} consigne={a.consigne} critere={a.critere} etat={a.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onDemanderLecture={estLectureHabitudes(a.habit_key)?()=>{setLectureInitialeId(a.occurrence.occurrence_id);setLecturesOuvertes(true);}:undefined} onConfirme={confirmer}/>
     <RepereDureeHabitudes habitKey={a.habit_key} langue={langue}/>
     {estLectureHabitudes(a.habit_key)&&<button type="button" aria-label={l(`Renseigner la durée — ${a.consigne}`,`Record time — ${a.consigne}`)} className="min-h-[44px] mb-2 px-3 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-md text-hd-label-md" onClick={()=>{setLectureInitialeId(a.occurrence.occurrence_id);setLecturesOuvertes(true);}}>{l('Durée de lecture','Reading time')}</button>}
    </div>)}
   </div>
  </section>
  {/* Lecture du jour : question pour réfléchir */}
  {texte&&<aside className="mt-hd-space-lg mb-hd-space-sm bg-hd-surface-container p-hd-space-md rounded-2xl border-l-4 border-hd-secondary flex flex-col gap-2" aria-label={l('La lecture du jour','Today’s reading')}>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{l('Un temps pour réfléchir','A moment to reflect')} · {mois===1||textePropre?`${l('Jour','Day')} ${data.jour}`:l(`Lecture ${jourLecture} reprise`,`Reading ${jourLecture} again`)}</span>
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{texte.texte_pedagogique}</p>
   <p className="font-hd-scripture-verse text-hd-scripture-verse text-hd-on-surface italic">{texte.question_reflexion}</p>
   <small className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Adaptation pédagogique à partir du livre. La lecture ne valide aucune activité automatiquement.','An educational adaptation based on the book. Reading does not mark any activity as completed.')}</small>
  </aside>}
  {/* Défi de la semaine : lecture seule, facultatif, aucune donnée collectée */}
  {defi&&<section className="mb-hd-space-sm bg-hd-surface-container-lowest p-hd-space-md rounded-2xl shadow-sm flex flex-col gap-2" aria-label="Défi de la semaine">
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{defi.du===29?'Bilan':'Défi de la semaine'} · Jours {defi.du} à {defi.au} · facultatif</span>
   <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{defi.titre}</h3>
   {defi.objectif&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant"><strong>Objectif :</strong> {defi.objectif}</p>}
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{defi.texte}</p>
   {defi.questions&&<ul className="list-disc pl-5 font-hd-body-md text-hd-body-md text-hd-on-surface">{defi.questions.map(q=><li key={q}>{q}</li>)}</ul>}
   {defi.adapter&&<details className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant"><summary className="min-h-[44px] flex items-center cursor-pointer font-hd-label-md text-hd-label-md text-hd-secondary">Adapter</summary><p>{defi.adapter}</p></details>}
   {defi.relire&&<p className="font-hd-scripture-verse text-hd-scripture-verse text-hd-on-surface italic">Pour relire la semaine : {defi.relire}</p>}
  </section>}
  <SuiviDefisHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} jour={data.jour} langue={langue}/>
  {/* Note de bas de page */}
  <footer className="mt-hd-space-md pt-hd-space-sm pb-hd-space-sm flex flex-col items-center text-center gap-2">
   <div className="inline-flex items-center gap-1.5 text-hd-on-surface-variant px-3 py-1 rounded-full bg-hd-surface-container/50"><IconeHD nom="cloud_done" className="text-[16px] text-hd-secondary"/><span className="font-hd-label-sm text-hd-label-sm">{l('Ta progression est conservée.','Your progress is saved.')}</span></div>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant max-w-[280px]">{l('Tes déclarations décrivent ta pratique. Elles ne mesurent ni ta foi ni ta valeur.','Your records describe your practice. They do not measure your faith or worth.')}</p>
  </footer>
  {lecturesOuvertes&&<LecturesJourHabitudes lectureInitialeId={lectureInitialeId} activites={activites.filter(a=>estLectureHabitudes(a.habit_key))} userId={data.userId} langue={langue} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer} onFermer={()=>setLecturesOuvertes(false)}/>}
  {priere&&<LecteurPriereHabitudes activite={priere} userId={data.userId} langue={langue} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer} onFermer={()=>setPriereId(null)}/>}
  <HistoriqueRecetteHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} revision={revision}/>
 </section>;
}
