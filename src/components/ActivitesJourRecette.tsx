import {EN_PAUSE_LE_DIMANCHE,estDimanche} from '@/lib/habitudes-dimanche';
import {RepereDureeHabitudes,aRepereDuree} from './RepereDureeHabitudes';
import {CultesSemaineHabitudes} from './CultesSemaineHabitudes';
import {MaDimeHabitudes} from './MaDimeHabitudes';
import {VoletFinanceHabitudes} from './VoletFinanceHabitudes';
import {DimancheHabitudes} from './DimancheHabitudes';
import {LecteurPriereHabitudes,momentPriere} from './LecteurPriereHabitudes';
import {LecturesJourHabitudes,estLectureHabitudes} from './LecturesJourHabitudes';
import {useEffect,useRef,useState,type ReactNode} from 'react';
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
import {ExportCalendrierHabitudes} from './ExportCalendrierHabitudes';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';
import {lectureReprise,moisHabitudes} from '@/lib/habitudes-calendrier';
import {SuiviDefisHabitudes} from './SuiviDefisHabitudes';
import {defiDuJour} from '@/data/habitudes-defis-fr';
import {defiDuJourEn} from '@/data/habitudes-defis-en';
import {lecturesHabitudesEnMois2a6} from '@/data/habitudes-lectures-en-mois-2-6';
import {enregistrerCopieJourHd,type CopieJourHd} from '@/lib/habitudes-copie-jour';
import {IconeJournee} from './IconeJournee';
import {AnneauxJournee} from './AnneauxJournee';
import {TuileHabitude} from './IconesIphone';

/** Heure locale « HH:MM » du participant ; null si le fuseau est invalide. */
function heureLocale(fuseau:string,maintenant:number){try{return new Intl.DateTimeFormat('en-GB',{timeZone:fuseau,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(maintenant));}catch{return null;}}
const minutes=(h:string)=>{const [a,b]=h.split(':').map(Number);return (a??0)*60+(b??0);};

/** Écran « Aujourd’hui » des maquettes Stitch : mêmes lectures serveur, mêmes déclarations, même historique.
 * Le prochain rendez-vous n’est qu’un repère d’affichage : il ne valide ni n’envoie rien.
 */
export function ActivitesJourRecette({enrollmentId,participantId,dateLocale,langue,fuseau='Africa/Kinshasa',finExclue=null,copie,avantDefis}:{enrollmentId:string;participantId:string;dateLocale:string;langue:string;fuseau?:string;finExclue?:string|null;
 /** Sans réseau : journée gardée sur l'appareil (décision du 29/10/2026). Aucun appel serveur pour l'afficher. */
 copie?:CopieJourHd;
 /** Raccourcis « Mes habitudes », placés juste avant « Suivre mes défis facultatifs » (demande du 08/11/2026). */
 avantDefis?:ReactNode}){
 const horsLigne=Boolean(copie);
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [lecture,setLecture]=useState<{cle:string;data:JourRecette}|null>(null),[erreur,setErreur]=useState(false),[tour,setTour]=useState(0);
 const [revision,setRevision]=useState(0),[maintenant,setMaintenant]=useState(Date.now);
 const [moment,setMoment]=useState<string|null>(null);
 const [priereId,setPriereId]=useState<string|null>(null),[lecturesOuvertes,setLecturesOuvertes]=useState(false),[lectureInitialeId,setLectureInitialeId]=useState<string|null>(null);
 const cle=`${enrollmentId}:${participantId}:${dateLocale}`;
 useEffect(()=>{setLecturesOuvertes(false);setLectureInitialeId(null);},[cle]);
 useEffect(()=>{if(copie){setLecture({cle,data:copie.data});setErreur(false);return;}let vivant=true;setLecture(null);setErreur(false);void chargerJourRecette(enrollmentId,participantId,dateLocale).then(data=>{if(vivant)setLecture({cle,data});}).catch(()=>{if(vivant)setErreur(true);});return()=>{vivant=false;};},[cle,tour,copie]);
 // Copie de la journée pour la consultation hors connexion : réécrite à chaque lecture et à chaque déclaration confirmée.
 useEffect(()=>{if(copie||lecture?.cle!==cle)return;enregistrerCopieJourHd(lecture.data.userId,{enrollmentId,participantId,dateLocale,fuseau,finExclue,data:lecture.data});},[lecture,copie,cle,enrollmentId,participantId,dateLocale,fuseau,finExclue]);
 useEffect(()=>{const t=window.setInterval(()=>setMaintenant(Date.now()),60000);return()=>window.clearInterval(t);},[]);
 const data=lecture?.cle===cle?lecture.data:null;
 // Demande de Dr Justin (03/11/2026) : un rappel touché (#hd-activite-<id>) ouvre directement son activité :
 // la prière dans son lecteur, la Bible dans la lecture du jour, sinon la carte de l'activité, mise en évidence.
 const cibleOuverte=useRef<string|null>(null);
 useEffect(()=>{
  if(!data)return;
  const m=/^#hd-activite-([0-9a-f-]{36})$/i.exec(window.location.hash);
  if(!m||cibleOuverte.current===m[1])return;
  const id=m[1]!,a=data.activites.find(x=>x.occurrence.occurrence_id===id);
  if(!a)return;
  cibleOuverte.current=id;
  if(momentPriere(a.habit_key))setPriereId(id);
  else if(!horsLigne&&estLectureHabitudes(a.habit_key)){setLectureInitialeId(id);setLecturesOuvertes(true);}
  const t=window.setTimeout(()=>{
   const el=document.getElementById(`hd-activite-${id}`);if(!el)return;
   el.scrollIntoView?.({block:'center'});
   el.style.outline='3px solid #c9a84c';el.style.outlineOffset='4px';el.style.borderRadius='16px';
   window.setTimeout(()=>{el.style.outline='';el.style.outlineOffset='';},4000);
  },50);
  return()=>window.clearTimeout(t);
 },[data,horsLigne]);
 const bilan=data?bilanHabitudes({enrollment_id:enrollmentId,version:data.version??1,date_locale:dateLocale},data.activites.map(a=>a.occurrence),data.activites.flatMap(a=>a.etat?[a.etat]:[])):null;
 function confirmer(etat:EtatOccurrence){setRevision(n=>n+1);setLecture(ancien=>ancien?.cle===cle?{...ancien,data:{...ancien.data,activites:ancien.data.activites.map(a=>a.occurrence.occurrence_id===etat.occurrence_id?{...a,etat}:a)}}:ancien);}
 if(erreur)return <section className="hd-jour-stitch px-hd-margin py-hd-space-md flex flex-col gap-hd-space-md" aria-label={l('Mes activités quotidiennes','My daily activities')}>
  <div className="bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-sm">
   <div className="flex items-center gap-2 text-hd-on-surface"><IconeHD nom="cloud_off" className="text-[20px] text-hd-secondary"/><p role="alert" className="font-hd-body-md text-hd-body-md">{l('Les activités ne peuvent pas être vérifiées. Actualise avant de déclarer une action.','Activities cannot be verified. Refresh before recording an action.')}</p></div>
   <button type="button" className="min-h-[48px] bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2" onClick={()=>setTour(t=>t+1)}><IconeHD nom="refresh" className="text-[20px]"/>{l('Actualiser les activités','Refresh activities')}</button>
  </div>
 </section>;
 if(!data)return <p role="status" className="px-hd-margin py-hd-space-md font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Chargement des activités…','Loading activities…')}</p>;
 // Mois 2 à 6 : textes propres validés (français les 27 et 28/10/2026, anglais le 28/10/2026).
 // Au-delà (jour 181), reprise des 30 lectures du mois 1 (jour 181 → lecture 1).
 const mois=data.mois??moisHabitudes(data.jour),jourLecture=lectureReprise(data.jour);
 const textePropre=(en?lecturesHabitudesEnMois2a6:[...lecturesHabitudesFrMois2,...lecturesHabitudesFrMois3,...lecturesHabitudesFrMois4,...lecturesHabitudesFrMois5,...lecturesHabitudesFrMois6]).find(x=>x.jour===data.jour);
 const texte=textePropre??(en?lecturesHabitudesEn:lecturesHabitudesFr).find(x=>x.jour===jourLecture);
 const defi=(en?defiDuJourEn:defiDuJour)(jourLecture);
 const date=new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(dateLocale+'T12:00:00Z'));
 const activites=[...data.activites].sort((a,b)=>a.heure.localeCompare(b.heure));
 const prieres=activites.filter(a=>momentPriere(a.habit_key));
 const priere=activites.find(a=>a.occurrence.occurrence_id===priereId);
 const ouverte=(a:typeof activites[number])=>a.etat?.synchronisation!=='synchronise'||a.etat.etat!=='realisee';
 const h=heureLocale(fuseau,maintenant);
 const momentHeure=h?(minutes(h)<11*60?'matin':minutes(h)<17*60?'midi':'soir'):'matin';
 const priereChoisie=prieres.find(a=>a.occurrence.occurrence_id===moment)??prieres.find(a=>momentPriere(a.habit_key)===momentHeure)??prieres[0];
 const nomMoment=(k?:string)=>momentPriere(k)==='matin'?l('Matin','Morning'):momentPriere(k)==='midi'?l('Midi','Midday'):l('Soir','Evening');
 // Dimanche allégé (maquette validée le 08/11/2026) : seulement ce qui compte en haut, le reste « Au repos aujourd'hui ».
 const dimanche=estDimanche(dateLocale);
 const visibles=dimanche?activites.filter(a=>a.occurrence.requise):activites;
 const auRepos=dimanche?activites.filter(a=>!a.occurrence.requise):[];
 const prochain=visibles.find(a=>ouverte(a)&&h!==null&&a.heure>=h)??visibles.find(ouverte)??null;
 const ecart=prochain&&h?minutes(prochain.heure)-minutes(h):null;
 const iProchain=prochain?visibles.indexOf(prochain):-1;
 // Les rendez-vous éloignés du soir sont présentés en lignes discrètes, comme dans la maquette ; un appui les déplie.
 const plusTard=(i:number)=>!dimanche&&iProchain>=0&&i>iProchain+2&&minutes(visibles[i]!.heure)>=18*60;
 const premierPlusTard=visibles.findIndex((_,i)=>plusTard(i));
 const ligne=(a:typeof activites[number],i:number,repos:boolean)=><div key={a.occurrence.occurrence_id} id={`hd-activite-${a.occurrence.occurrence_id}`} className={`ios-ligne${repos?' ios-ligne-repos':plusTard(i)?' opacity-85':''}`}>
     {i===premierPlusTard&&<span className="block pt-2 pb-2 font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant px-1 uppercase tracking-wider">{l('Plus tard aujourd’hui','Later today')}</span>}
     {repos&&(EN_PAUSE_LE_DIMANCHE as readonly string[]).includes(a.habit_key??'')&&<span className="ios-repos-pause"><IconeHD nom="notifications_paused" className="text-[13px]"/>{l('Rappel en pause','Reminder paused')}</span>}
     <div className="ios-ligne-corps"><TuileHabitude habitKey={a.habit_key}/><DeclarationHabitude variante="stitch" complement={aRepereDuree(a.habit_key)||estLectureHabitudes(a.habit_key)?<div className="flex flex-col items-start gap-1.5"><RepereDureeHabitudes habitKey={a.habit_key} langue={langue} dansCarte/>{horsLigne&&estLectureHabitudes(a.habit_key)&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('La durée de lecture demande une connexion : tu pourras noter cette lecture au retour du réseau.','Reading time needs a connection: you can record this reading when the network is back.')}</p>}{!horsLigne&&estLectureHabitudes(a.habit_key)&&<button type="button" aria-label={l(`Renseigner la durée — ${a.consigne}`,`Record time — ${a.consigne}`)} className="min-h-[44px] px-3 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-md text-hd-label-md" onClick={()=>{setLectureInitialeId(a.occurrence.occurrence_id);setLecturesOuvertes(true);}}>{l('Durée de lecture','Reading time')}</button>}</div>:undefined} lienLecture={a.habit_key==='bible_matin'||a.habit_key==='bible_soir'?{href:`${import.meta.env.BASE_URL}bible/livres?depuis=habitudes&moment=${a.habit_key==='bible_matin'?'matin':'soir'}&lang=${en?'en':'fr'}`,label:a.habit_key==='bible_matin'?l('Lire la Bible du matin','Read the morning Bible reading'):l('Lire la Bible du soir','Read the evening Bible reading')}:undefined} lienEcriture={a.habit_key==='gratitude_matin'||a.habit_key==='gratitude_soir'?{href:`${import.meta.env.BASE_URL}journal?ecrire=1&depuis=habitudes&gratitude=${a.habit_key==='gratitude_matin'?'matin':'soir'}&lang=${en?'en':'fr'}`,label:a.habit_key==='gratitude_matin'?l('Écrire ma gratitude du matin','Write my morning gratitude'):l('Écrire ma gratitude du soir','Write my evening gratitude')}:undefined} heure={a.heure} attenue={repos||plusTard(i)} userId={data.userId} occurrence={a.occurrence} consigne={a.consigne} critere={a.critere} etat={a.etat} langue={langue} lectureSeule={horsLigne&&estLectureHabitudes(a.habit_key)} horsLigne={horsLigne} aideDisponible={false} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onDemanderLecture={estLectureHabitudes(a.habit_key)?()=>{setLectureInitialeId(a.occurrence.occurrence_id);setLecturesOuvertes(true);}:undefined} onConfirme={confirmer}/></div>
    </div>;
 return <section className="hd-jour-stitch flex flex-col w-full px-hd-margin pb-hd-space-xl" aria-label={l('Mes activités quotidiennes','My daily activities')}>
  {/* Carte du jour en photo plein cadre (style iPhone du 04/11/2026). */}
  <header className="ios-jour">
   <span className="ios-puce"><time dateTime={dateLocale}>{date.charAt(0).toUpperCase()+date.slice(1)}</time> · {l('Jour','Day')} {data.jour} · {mois===1?l('30 jours gratuits','30 free days'):l(`Mois ${mois} sur 6`,`Month ${mois} of 6`)}</span>
   <small>{l('Le pas d’aujourd’hui','Today’s step')}</small>
   <h2>{texte?.titre??l('Un pas après l’autre','One step at a time')}</h2>
   {texte&&<p>{texte.objectif}</p>}
   {prochain&&!horsLigne&&<a className="ios-jour-bouton" href={`#hd-activite-${prochain.occurrence.occurrence_id}`}><IconeHD nom="play_arrow" className="text-[20px]"/>{l('Commencer','Start')}</a>}
  </header>
  {bilan&&<AnneauxJournee realisees={dimanche?bilan.requises_realisees:bilan.realisees} total={dimanche?bilan.requises:bilan.total} jour={data.jour} en={en}/>}
  {horsLigne&&copie&&<div className="hc-bandeau" role="status"><IconeJournee nom="wifi_off" taille={20}/><p>{l('Copie du ','Copy from ')}<time dateTime={copie.le}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:fuseau}).format(new Date(copie.le))}</time>. {l('Tu es hors connexion : tu peux noter tes habitudes, elles seront envoyées au retour du réseau. Les prières guidées, la durée de lecture, les cultes, les défis et l’historique demandent une connexion.','You are offline: you can record your habits; they will be sent when the network is back. Guided prayers, reading time, worship, challenges and history need a connection.')}</p></div>}
  {dimanche&&<aside className="ios-repos" aria-label={l('Dimanche, jour de repos','Sunday, day of rest')}><span className="ios-repos-icone" aria-hidden="true"><IconeHD nom="spa" className="text-[22px]"/></span><div><small>{l('Dimanche · jour de repos','Sunday · day of rest')}</small><h2>{l('Une journée plus légère','A lighter day')}</h2><p>{l(`${visibles.length} moments seulement aujourd’hui. Le reste se repose : tu peux l’ouvrir plus bas, il ne compte jamais comme oublié.`,`Only ${visibles.length} moments today. The rest is resting: you can open it below, it never counts as missed.`)}</p></div></aside>}
  {!horsLigne&&<section className="ios-section" aria-label={l('Prière Amidah','Amidah prayer')}>
   <h3 className="ios-titre-section">{l('Prière','Prayer')}</h3>
   <div className="ios-carte ios-priere">
    <div className="ios-priere-tete"><TuileHabitude habitKey="priere"/><div><b>{l('L’Amidah','The Amidah')}</b><small>{l('Choisis le moment, puis prie.','Choose the moment, then pray.')}</small></div></div>
    {prieres.length?<>
     <div className="ios-segment" role="radiogroup" aria-label={l('Moment de la prière','Prayer time')} style={{['--n' as string]:prieres.length,['--i' as string]:Math.max(0,prieres.indexOf(priereChoisie!))}}>
      <span className="ios-segment-curseur" aria-hidden="true"/>
      {prieres.map(a=><button key={a.occurrence.occurrence_id} type="button" role="radio" aria-checked={a===priereChoisie} onClick={()=>setMoment(a.occurrence.occurrence_id)}>{nomMoment(a.habit_key)}</button>)}
     </div>
     <button type="button" className="ios-bouton" aria-label={l(`Lire et prier — ${momentPriere(priereChoisie!.habit_key)}`,`Read and pray — ${momentPriere(priereChoisie!.habit_key)}`)} onClick={()=>setPriereId(priereChoisie!.occurrence.occurrence_id)}><IconeHD nom="auto_stories" className="text-[20px]"/>{l(`Ouvrir la prière ${momentPriere(priereChoisie!.habit_key)==='matin'?'du matin':momentPriere(priereChoisie!.habit_key)==='midi'?'de midi':'du soir'}`,`Open the ${momentPriere(priereChoisie!.habit_key)==='matin'?'morning':momentPriere(priereChoisie!.habit_key)==='midi'?'midday':'evening'} prayer`)}</button>
    </>:<a href={`${import.meta.env.BASE_URL}amidah.html?retour=espace`} className="ios-bouton"><IconeHD nom="auto_stories" className="text-[20px]"/>{l('Lire l’Amidah en français','Read the Amidah')}</a>}
    <p className="ios-note">{l('Lire ne valide rien : appuie sur « J’ai prié » après avoir prié.','Reading completes nothing: press “I prayed” after praying.')}</p>
   </div>
  </section>}
  {!horsLigne&&activites.some(a=>estLectureHabitudes(a.habit_key))&&<button type="button" onClick={()=>{setLectureInitialeId(null);setLecturesOuvertes(true);}} className="mb-hd-space-lg min-h-[48px] px-4 rounded-xl bg-hd-surface-container text-hd-secondary font-hd-label-lg text-hd-label-lg flex items-center justify-center gap-2"><IconeHD nom="menu_book"/>{l('Lectures du jour','Today’s readings')}<IconeHD nom="chevron_right"/></button>}
  {/* Extras du dimanche (04/11/2026), facultatifs et jamais comptés. */}
  {!horsLigne&&estDimanche(dateLocale)&&<DimancheHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue}/>}
  {!horsLigne&&<CultesSemaineHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} onConfirme={confirmer}/>}
  {!horsLigne&&<MaDimeHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} lienReglages={`/reglages?parcours=${encodeURIComponent(enrollmentId)}${en?'&lang=en':''}#horaires`}/>}
  {!horsLigne&&<VoletFinanceHabitudes langue={langue}/>}
  {/* Prochain rendez-vous */}
  {prochain&&<section className="hd-prochain-rendez-vous ios-section" aria-label={l('Prochain rendez-vous','Next appointment')}>
   <h3 className="ios-titre-section">{l('Prochain rendez-vous','Next appointment')}</h3>
   <a className="ios-prochain" href={`#hd-activite-${prochain.occurrence.occurrence_id}`}>
    <div><small>{ecart!==null&&ecart>=0?(ecart===0?l('Maintenant','Now'):ecart<60?l(`Dans ${ecart} min`,`In ${ecart} min`):l(`Dans ${Math.floor(ecart/60)} h ${String(ecart%60).padStart(2,'0')}`,`In ${Math.floor(ecart/60)} h ${String(ecart%60).padStart(2,'0')}`)):l('À venir','Coming up')}</small><time dateTime={prochain.heure}>{prochain.heure}</time></div>
    <div className="ios-prochain-texte"><b>{prochain.consigne}</b>{prochain.critere&&<p>{prochain.critere}</p>}</div>
    <span className="ios-rond" aria-label={l('Commencer','Start')}><IconeHD nom="play_arrow" className="text-[22px]"/></span>
   </a>
  </section>}
  {!horsLigne&&<ExportCalendrierHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue}/>}
  {/* Ma journée */}
  <section className="ios-section ios-journee flex flex-col gap-hd-space-sm" aria-label={l('Ma journée','My day')}>
   <div className="flex items-baseline justify-between mb-1">
    <div>
     <h3 className="ios-titre-section">{dimanche?l('Ce qui compte aujourd’hui','What counts today'):l('Ma journée','My day')}</h3>
     <p role="status" className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant uppercase tracking-wider">{dimanche?bilan!.requises_realisees:bilan!.realisees} / {dimanche?bilan!.requises:bilan!.total} {l('réalisées','completed')} · {bilan!.partielles} {l('en partie','partly done')}</p>
    </div>
    <span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant italic whitespace-nowrap">{l('Sans hâte ni retard','No rush, no delay')}</span>
   </div>
   <progress className="sr-only" aria-label={l('Activités réalisées aujourd’hui','Activities completed today')} value={dimanche?bilan!.requises_realisees:bilan!.realisees} max={dimanche?bilan!.requises:bilan!.total}/>
   <div className="ios-liste flex flex-col">
    {visibles.map((a,i)=>ligne(a,i,false))}
   </div>
   {auRepos.length>0&&<>
    <h3 className="ios-titre-section mt-4">{l('Si tu veux','If you like')}</h3>
    <details className="ios-repos-volet">
     <summary><span className="ios-repos-tuile" aria-hidden="true"><IconeHD nom="spa" className="text-[18px]"/></span><span className="flex-1"><b>{l('Au repos aujourd’hui','Resting today')}</b><small>{l('Facultatif · jamais compté','Optional · never counted')}</small></span><span className="ios-repos-nombre">{auRepos.length}</span><IconeHD nom="chevron_right" className="ios-repos-chevron text-[22px]"/></summary>
     <div className="ios-liste flex flex-col">{auRepos.map((a,i)=>ligne(a,i,true))}</div>
     <p className="ios-note px-1 pt-2">{l('Tu peux en cocher une si tu en as envie. Ta journée est complète sans elles. Lundi, tout revient comme d’habitude.','You can tick one if you feel like it. Your day is complete without them. On Monday, everything is back to usual.')}</p>
    </details>
   </>}
  </section>
  {/* Lecture du jour : question pour réfléchir */}
  {texte&&<aside className="mt-hd-space-lg mb-hd-space-sm bg-hd-surface-container p-hd-space-md rounded-2xl border-l-4 border-hd-secondary flex flex-col gap-2" aria-label={l('La lecture du jour','Today’s reading')}>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{l('Un temps pour réfléchir','A moment to reflect')} · {mois===1||textePropre?`${l('Jour','Day')} ${data.jour}`:l(`Lecture ${jourLecture} reprise`,`Reading ${jourLecture} again`)}</span>
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{texte.texte_pedagogique}</p>
   <p className="font-hd-scripture-verse text-hd-scripture-verse text-hd-on-surface italic">{texte.question_reflexion}</p>
   <small className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Adaptation pédagogique à partir du livre. La lecture ne valide aucune activité automatiquement.','An educational adaptation based on the book. Reading does not mark any activity as completed.')}</small>
  </aside>}
  {/* Défi de la semaine : lecture seule, facultatif, aucune donnée collectée */}
  {defi&&<section className="mb-hd-space-sm bg-hd-surface-container-lowest p-hd-space-md rounded-2xl shadow-sm flex flex-col gap-2" aria-label={l('Défi de la semaine','Challenge of the week')}>
   <span className="font-hd-label-sm text-hd-label-sm text-hd-secondary uppercase tracking-wider">{defi.du===29?l('Bilan','Review'):l('Défi de la semaine','Challenge of the week')} · {en?`Days ${defi.du} to ${defi.au} · optional`:`Jours ${defi.du} à ${defi.au} · facultatif`}</span>
   <h3 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{defi.titre}</h3>
   {defi.objectif&&<p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant"><strong>{l('Objectif :','Aim:')}</strong> {defi.objectif}</p>}
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface">{defi.texte}</p>
   {defi.questions&&<ul className="list-disc pl-5 font-hd-body-md text-hd-body-md text-hd-on-surface">{defi.questions.map(q=><li key={q}>{q}</li>)}</ul>}
   {defi.adapter&&<details className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant"><summary className="min-h-[44px] flex items-center cursor-pointer font-hd-label-md text-hd-label-md text-hd-secondary">{l('Adapter','Adapting')}</summary><p>{defi.adapter}</p></details>}
   {defi.relire&&<p className="font-hd-scripture-verse text-hd-scripture-verse text-hd-on-surface italic">{l('Pour relire la semaine :','Looking back on the week:')} {defi.relire}</p>}
  </section>}
  {avantDefis}
  {!horsLigne&&<SuiviDefisHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} jour={data.jour} langue={langue}/>}
  {/* Note de bas de page */}
  <footer className="mt-hd-space-md pt-hd-space-sm pb-hd-space-sm flex flex-col items-center text-center gap-2">
   <div className="inline-flex items-center gap-1.5 text-hd-on-surface-variant px-3 py-1 rounded-full bg-hd-surface-container/50"><IconeHD nom="cloud_done" className="text-[16px] text-hd-secondary"/><span className="font-hd-label-sm text-hd-label-sm">{l('Ta progression est conservée.','Your progress is saved.')}</span></div>
   <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant max-w-[280px]">{l('Tes déclarations décrivent ta pratique. Elles ne mesurent ni ta foi ni ta valeur.','Your records describe your practice. They do not measure your faith or worth.')}</p>
  </footer>
  {!horsLigne&&lecturesOuvertes&&<LecturesJourHabitudes lectureInitialeId={lectureInitialeId} activites={activites.filter(a=>estLectureHabitudes(a.habit_key))} userId={data.userId} langue={langue} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer} onFermer={()=>setLecturesOuvertes(false)}/>}
  {!horsLigne&&priere&&<LecteurPriereHabitudes activite={priere} userId={data.userId} langue={langue} transport={{rpc:(nom,params)=>supabase.rpc(nom,params)}} onConfirme={confirmer} onFermer={()=>setPriereId(null)}/>}
  {!horsLigne&&<HistoriqueRecetteHabitudes enrollmentId={enrollmentId} participantId={participantId} dateLocale={dateLocale} langue={langue} revision={revision}/>}
 </section>;
}
