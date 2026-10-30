import {IconeFinitions as F} from './IconeFinitions';
import {IconeResultat} from './IconeResultat';
import {MemoireParcours} from './MemoireParcours';
import {useState,type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {IconeJournee as I} from './IconeJournee';
import {IconeConfidentialite as C} from './IconeConfidentialite';
import {IconeMaquette as M} from './IconeMaquette';
import {IconeRegistre as R} from './IconeRegistre';
import {IconeAdministration as A} from './IconeAdministration';
import {IconeEdition as E} from './IconeEdition';
import type {Bilan} from '@/lib/progres';
import {rawDay,dateDuJour,avecLangue} from '@/lib/espace';

/** Écrans « Aujourd'hui » des maquettes (à venir, pause, parcours long, terminé), en français et en anglais (22/10/2026). */
type Langue = 'fr' | 'en';
const lg = (langue?: string | null): Langue => (langue === 'en' ? 'en' : 'fr');
const T = {
 fr: {
  bonjour: 'Bonjour', reglages: 'Mes réglages', bientot: 'Bientôt disponible', ouverture: 'Ouverture prochaine',
  commence: (d: string) => `Ton parcours commence le ${d}.`,
  chaqueJour: 'Chaque jour, un court enseignement, une action concrète et une question pour écrire dans ton journal. Prends ce temps pour choisir ton objectif.',
  avantDebut: (n: number) => (n === 1 ? 'Jour avant le début' : 'Jours avant le début'),
  heureKinshasa: 'Les journées s’ouvrent à la date prévue, selon l’heure de Kinshasa.',
  petitPas: 'Un petit pas fidèle prépare la suite.', etapePrep: 'Étape préparatoire', intention: 'Mon intention spirituelle',
  reglagesParcours: 'Mes réglages du parcours', tousReglages: 'Ouvrir tous mes réglages', reperes: 'Les repères du parcours',
  premierPas: 'Préparer mon premier pas',
  fonctionnement: 'Retrouve le fonctionnement de SÉNEVÉ et les repères de pratique fondés sur « Arrête de mendier des miracles » du Dr Justin Tshims.',
  decouvrir: 'Découvrir les repères', pdf: 'Télécharger en PDF', pdfAbsent: 'Aucun livret préparatoire PDF publié pour le moment',
  pauseNom: 'Parcours en pause', suspendu: 'Suspendu', enPause: 'Ton parcours est en pause.',
  pauseTexte: 'Tu peux relire les journées déjà ouvertes et retrouver tes écrits. La validation des actions reste désactivée pendant la pause.',
  reprendre: 'Reprendre mon parcours', repriseConvenir: 'La reprise et sa date sont à convenir avec l’équipe qui gère ton parcours.',
  demanderReprise: 'Demander la reprise à l’équipe', respiration: 'Temps de respiration', lectureSeule: 'Consultation en lecture seule',
  doute: 'Un moment de doute ou d’empêchement ?', echange: 'Tu peux demander un échange ou convenir d’une date de reprise avec l’équipe.',
  coach: 'Parler au coach', reprogrammer: 'Reprogrammer la date de reprise avec l’équipe',
  unPas: 'Un pas chaque jour', parcoursDe: (n: number) => `Parcours de ${n} jours`, contenu: 'Enseignement, action et réflexion',
  progression: 'Progression du parcours', realisees: (n: number) => `${n} actions réalisées`,
  legende: ['✓ Réalisée', '● Aujourd’hui', '○ À venir', '— À reprendre'], joursParcours: 'Jours du parcours',
  etatJour: (j: number, e: string) => `Jour ${j}, ${e}`, aujourdhui: 'aujourd’hui', actionRealisee: 'action réalisée', ouvert: 'ouvert', aVenir: 'à venir',
  trente: 'Afficher les 30 premiers jours', tous: (n: number) => `Afficher les ${n} jours`, ouvrirJournee: 'Ouvrir une journée', jour: (n: number) => `Jour ${n}`,
  termine: 'Parcours terminé', clos: 'Ce parcours est terminé : les actions sont fermées. Tes journées, ton journal et tes progrès restent enregistrés, tu peux tout relire.',
  bilanNom: 'Bilan du parcours', accomplissement: 'Accomplissement', termineLe: (d: string) => `Terminé le ${d}`,
  geste: 'Chaque geste posé compte. Tu peux revenir sur ce que tu as vécu.',
  realiseesSur: (r: number, t: number) => `${r}/${t} actions réalisées`,
  partielles: (p: number, pr: number) => `${p} ${p === 1 ? 'faite' : 'faites'} en partie · ${pr} ${pr === 1 ? 'préparée' : 'préparées'}`,
  mesure: 'Ce bilan reprend tes enregistrements. Il ne mesure ni ta foi ni ta valeur.',
  revoir: (n: number) => `Revoir tes ${n} jours`, replier: 'Tout replier', deplier: 'Tout déplier', relire: 'Relire cette journée',
  etat: { realisee: 'Action réalisée', partielle: 'Action faite en partie', preparee: 'Action préparée', aucune: 'Sans action enregistrée' } as Record<string, string>,
  sansAction: 'Sans action', reflexions: 'Ton bilan & tes réflexions', partager: 'Relis tes notes et choisis toi-même ce que tu souhaites partager.',
  journal: 'Ouvrir mon journal', exporter: 'Exporter l’image de synthèse', exportErreur: 'L’image n’a pas pu être créée sur cet appareil.', bilanComplet: 'Voir mon bilan complet',
  image: { titre: 'Mon bilan de parcours', ligne: (d: number, r: number) => `${d} jours · ${r} actions réalisées`, partielles: (n: number) => `${n} actions faites en partie`, preparees: (n: number) => `${n} actions préparées`, pas: 'Un petit pas fidèle, chaque jour.', mesure: 'Ce bilan ne mesure ni ma foi ni ma valeur.' },
 },
 en: {
  bonjour: 'Hello', reglages: 'My settings', bientot: 'Coming soon', ouverture: 'Opening soon',
  commence: (d: string) => `Your journey starts on ${d}.`,
  chaqueJour: 'Each day, a short teaching, a practical action and a question to write in your journal. Take this time to choose your goal.',
  avantDebut: (n: number) => (n === 1 ? 'Day before the start' : 'Days before the start'),
  heureKinshasa: 'Days open on the planned date, according to Kinshasa time.',
  petitPas: 'A small faithful step prepares what comes next.', etapePrep: 'Preparation step', intention: 'My spiritual intention',
  reglagesParcours: 'My journey settings', tousReglages: 'Open all my settings', reperes: 'Journey guidelines',
  premierPas: 'Prepare my first step',
  fonctionnement: 'Find out how SÉNEVÉ works and the practice guidelines based on “Stop Begging for Miracles” by Dr Justin Tshims.',
  decouvrir: 'Discover the guidelines', pdf: 'Download as PDF', pdfAbsent: 'No preparatory PDF booklet has been published yet',
  pauseNom: 'Journey paused', suspendu: 'Paused', enPause: 'Your journey is paused.',
  pauseTexte: 'You can reread the days already opened and find your writings. Confirming actions stays disabled during the pause.',
  reprendre: 'Resume my journey', repriseConvenir: 'Resuming and its date are to be agreed with the team that manages your journey.',
  demanderReprise: 'Ask the team to resume', respiration: 'Time to breathe', lectureSeule: 'Read-only access',
  doute: 'A moment of doubt or a hindrance?', echange: 'You can ask for a conversation or agree on a date to resume with the team.',
  coach: 'Talk to the coach', reprogrammer: 'Reschedule the resume date with the team',
  unPas: 'One step every day', parcoursDe: (n: number) => `${n}-day journey`, contenu: 'Teaching, action and reflection',
  progression: 'Journey progress', realisees: (n: number) => `${n} actions completed`,
  legende: ['✓ Completed', '● Today', '○ Coming', '— To catch up'], joursParcours: 'Days of the journey',
  etatJour: (j: number, e: string) => `Day ${j}, ${e}`, aujourdhui: 'today', actionRealisee: 'action completed', ouvert: 'open', aVenir: 'coming',
  trente: 'Show the first 30 days', tous: (n: number) => `Show all ${n} days`, ouvrirJournee: 'Open a day', jour: (n: number) => `Day ${n}`,
  termine: 'Journey completed', clos: 'This journey is over: actions are closed. Your days, your journal and your progress remain saved; you can reread everything.',
  bilanNom: 'Journey review', accomplissement: 'Accomplishment', termineLe: (d: string) => `Completed on ${d}`,
  geste: 'Every step taken counts. You can look back on what you lived.',
  realiseesSur: (r: number, t: number) => `${r}/${t} actions completed`,
  partielles: (p: number, pr: number) => `${p} partly done · ${pr} prepared`,
  mesure: 'This review reflects what you recorded. It measures neither your faith nor your worth.',
  revoir: (n: number) => `Look back on your ${n} days`, replier: 'Collapse all', deplier: 'Expand all', relire: 'Reread this day',
  etat: { realisee: 'Action completed', partielle: 'Action partly done', preparee: 'Action prepared', aucune: 'No action recorded' } as Record<string, string>,
  sansAction: 'No action', reflexions: 'Your review & reflections', partager: 'Reread your notes and choose for yourself what you wish to share.',
  journal: 'Open my journal', exporter: 'Export the summary image', exportErreur: 'The image could not be created on this device.', bilanComplet: 'See my full review',
  image: { titre: 'My journey review', ligne: (d: number, r: number) => `${d} days · ${r} actions completed`, partielles: (n: number) => `${n} actions partly done`, preparees: (n: number) => `${n} actions prepared`, pas: 'A small faithful step, every day.', mesure: 'This review measures neither my faith nor my worth.' },
 },
} as const;
const locale = (l: Langue) => (l === 'en' ? 'en-GB' : 'fr-FR');
const etatDe = (l: Langue, etat: string | null | undefined) => T[l].etat[etat === 'realisee' || etat === 'partielle' || etat === 'preparee' ? etat : 'aucune'] ?? '';

export function EnteteJournee({prenom,repere,langue}:{prenom:string;repere?:ReactNode;langue?:string|null}){const t=T[lg(langue)];return <><header className="jn-barre"><Link to="/espace">SÉNEVÉ</Link><Link to={avecLangue("/reglages",langue)} aria-label={t.reglages}><C nom="person" taille={18}/></Link></header><div className="jn-bienvenue">{repere}<h1>{t.bonjour}{prenom?` ${prenom}`:''}</h1></div></>;}
export function ParcoursAVenir({prenom,nom,date,objectif,reglages,onglets,footer,langue,entete}:{prenom:string;nom:string;date:string;objectif:ReactNode;reglages:ReactNode;onglets:ReactNode;footer:ReactNode;langue?:string|null;
 /** En-tête commun de la page Aujourd'hui (logo, salutation, photo, onglets) : le haut ne change pas d'un parcours à l'autre (demande de Dr Justin du 30/10/2026). */
 entete?:ReactNode}){
 const l=lg(langue);const t=T[l];
 const debut=dateDuJour(date,1);const maintenant=new Date();const jours=Math.max(0,1-rawDay(date,maintenant));
 return <>{entete!==undefined&&<>{entete}<p className="today-parcours today-hd-repere">{nom} · {t.bientot}</p></>}<div className="jn-page jn-attente">{entete===undefined&&<><EnteteJournee langue={l} prenom={prenom} repere={<span className="jn-tag">{nom} · {t.bientot}</span>}/>{onglets}</>}<section className="jn-carte jn-ouverture"><p className="jn-tag"><F nom="auto_awesome"/>{t.ouverture}</p><h2>{t.commence(new Intl.DateTimeFormat(locale(l),{timeZone:'Africa/Kinshasa',weekday:'long',day:'numeric',month:'long'}).format(debut))}</h2><p>{t.chaqueJour}</p><div className="jn-compteur"><strong>{jours}<small>{t.avantDebut(jours)}</small></strong><span>{t.heureKinshasa}</span></div><img src={`${import.meta.env.BASE_URL}illustrations/journee-attente.webp`} width={512} height={279} alt="" loading="lazy" decoding="async"/><blockquote>{t.petitPas}</blockquote></section><section className="jn-intention"><p className="jn-tag">{t.etapePrep}</p><h2>{t.intention} <F nom="psychology_alt"/></h2>{objectif}</section><details className="repli"><summary>{t.reglagesParcours}</summary>{reglages}<Link to={l==='en'?'/reglages?lang=en':'/reglages'}>{t.tousReglages}</Link></details><section className="jn-carte"><p className="jn-tag"><I nom="menu_book"/>{t.reperes}</p><h2>{t.premierPas}</h2><p>{t.fonctionnement}</p><Link className="jn-principal" to={avecLangue("/aide",l)}>{t.decouvrir} <I nom="arrow_forward"/></Link><button type="button" className="jn-secondaire" disabled title={t.pdfAbsent}><F nom="bookmark_added"/>{t.pdf}</button></section>{footer}</div></>;
}
export function PauseParcours({inscription,langue}:{inscription:string;langue?:string|null}){const t=T[lg(langue)];const [aide,setAide]=useState(false);return <section className="jn-pause" aria-label={t.pauseNom}><div className="jn-pause-bandeau"><p className="jn-tag"><E nom="hourglass_top"/>{t.suspendu}</p><h2>{t.enPause}</h2><p>{t.pauseTexte}</p><button className="jn-principal" onClick={()=>setAide(!aide)} aria-expanded={aide}><R nom="play_arrow"/>{t.reprendre}</button>{aide&&<div className="jn-reprise-aide"><p>{t.repriseConvenir}</p><Link to={`/aide?inscription=${encodeURIComponent(inscription)}`}>{t.demanderReprise}</Link></div>}</div><figure className="jn-pause-photo"><img src={`${import.meta.env.BASE_URL}illustrations/journee-pause.webp`} width={512} height={279} alt="" loading="lazy" decoding="async"/><figcaption className="jn-legende"><I nom="self_improvement"/>{t.respiration}</figcaption></figure><div className="jn-note"><C nom="lock"/><span>{t.lectureSeule}</span></div><aside className="jn-pause-accompagnement"><h3><C nom="support_agent"/>{t.doute}</h3><p>{t.echange}</p><Link className="jn-principal" to={`/coach?inscription=${encodeURIComponent(inscription)}`}>{t.coach}</Link><Link className="jn-secondaire" to={`/aide?inscription=${encodeURIComponent(inscription)}`}>{t.reprogrammer}</Link></aside></section>;}
export function ProgressionLongue({b,current,jour,choisir,langue}:{b:Bilan;current:number;jour:number;choisir:(n:number)=>void;langue?:string|null}){const t=T[lg(langue)];const[tous,setTous]=useState(false);const jours=b.jours.slice(0,tous?b.duree:Math.min(30,b.duree));return <section className="jn-longue"><div className="jn-theme"><div><p className="jn-tag">{t.unPas}</p><h2>{t.parcoursDe(b.duree)}</h2><p>{t.contenu}</p></div><strong>{current}<small>/ {b.duree}</small></strong></div><div className="jn-titre"><h2><A nom="grid_view"/>{t.progression}</h2><span>{t.realisees(b.realisees)}</span></div><div className="jn-legende">{t.legende.map(x=><span key={x}>{x}</span>)}</div><div className="jn-grille-longue" aria-label={t.joursParcours}>{jours.map(j=><span key={j.jour} className={j.jour===jour?'aujourdhui':j.etat==='realisee'?'fait':j.ouvert?'ouvert':'futur'} aria-label={t.etatJour(j.jour,j.jour===jour?t.aujourdhui:j.etat==='realisee'?t.actionRealisee:j.ouvert?t.ouvert:t.aVenir)}>{j.jour}</span>)}</div><div className="jn-controles-longue">{b.duree>30&&<button aria-expanded={tous} onClick={()=>setTous(!tous)}>{tous?t.trente:t.tous(b.duree)}</button>}<label>{t.ouvrirJournee}<select value={current} onChange={e=>choisir(Number(e.target.value))}>{b.jours.filter(j=>j.ouvert).map(j=><option key={j.jour} value={j.jour}>{t.jour(j.jour)}{j.theme?` · ${j.theme}`:''}</option>)}</select></label></div></section>;}
export function BilanTermine({prenom,nom,b,inscription,dateFin,onglets,suite,reglages,footer,cloture=false,langue,entete}:{entete?:ReactNode;cloture?:boolean;prenom:string;nom:string;b:Bilan;inscription:string;dateFin:string;onglets:ReactNode;suite:ReactNode;reglages:ReactNode;footer:ReactNode;langue?:string|null}){const l=lg(langue);const t=T[l];const [deplies,setDeplies]=useState(false);const [exportErreur,setExportErreur]=useState(false);function exporter(){try{const c=document.createElement('canvas');c.width=1080;c.height=1350;const ctx=c.getContext('2d');if(!ctx)throw new Error();ctx.fillStyle='#fff9ea';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#1d1c13';ctx.font='bold 54px sans-serif';ctx.fillText('SÉNEVÉ',80,140);ctx.font='36px serif';ctx.fillText(t.image.titre,80,260);ctx.font='28px sans-serif';ctx.fillText(t.image.ligne(b.duree,b.realisees),80,360);ctx.fillText(t.image.partielles(b.partielles),80,420);ctx.fillText(t.image.preparees(b.preparees),80,480);ctx.font='26px serif';ctx.fillText(t.image.pas,80,680);ctx.fillText(t.image.mesure,80,750);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download=l==='en'?'seneve-journey-review.png':'seneve-bilan-parcours.png';a.click();}catch{setExportErreur(true);}}return <>{entete!==undefined&&<>{entete}<p className="today-parcours today-hd-repere">{nom} · {t.termine}</p></>}<div className="jn-page jn-termine">{entete===undefined&&<><EnteteJournee langue={l} prenom={prenom} repere={<small className="jn-tag">{nom} · {t.termine}</small>}/>{onglets}</>}<section className="jn-carte jn-accomplissement" aria-label={t.bilanNom}>{cloture&&<p role="status">{t.clos}</p>}<p className="jn-tag"><M nom="spa"/>{t.accomplissement}</p><h2>{t.termineLe(dateFin)}</h2><img src={`${import.meta.env.BASE_URL}illustrations/journee-terminee.webp`} width={512} height={286} alt="" loading="lazy" decoding="async"/><blockquote>{t.geste}</blockquote><div className="jn-note"><strong>{t.realiseesSur(b.realisees,b.actionsOuvertes)}</strong><span>{t.partielles(b.partielles,b.preparees)}</span></div><p>{t.mesure}</p></section><section className="jn-revoir"><div className="jn-titre"><h2>{t.revoir(b.duree)}</h2><button onClick={()=>setDeplies(!deplies)} aria-expanded={deplies}>{deplies?t.replier:t.deplier}</button></div>{b.jours.map(j=><details className="jn-jour-detail" key={j.jour} open={deplies}><summary><span>{l==='en'?`D${j.jour}`:`J${j.jour}`}</span><strong>{j.theme??t.relire}</strong>{j.etat==='realisee'&&<I nom="check_circle"/>}</summary><p>{etatDe(l,j.etat)}</p><Link aria-label={`${t.jour(j.jour)} · ${j.etat==='realisee'||j.etat==='partielle'||j.etat==='preparee'?etatDe(l,j.etat):t.sansAction}`} key={j.jour} to={`/espace?parcours=${encodeURIComponent(inscription)}&jour=${j.jour}`}><span className="jn-jour-etat">{j.etat==='realisee'?<I nom="check"/>:j.jour}</span><span><small>{t.jour(j.jour)}</small><strong>{j.theme??t.relire}</strong><em>{etatDe(l,j.etat)}</em></span><I nom="arrow_forward"/></Link></details>)}</section><section className="jn-carte"><h2>{t.reflexions}</h2><MemoireParcours inscription={inscription} langue={l}/><p>{t.partager}</p><Link className="jn-principal" to={avecLangue("/journal",l)}><I nom="menu_book"/>{t.journal}</Link><button className="jn-secondaire" onClick={exporter}><IconeResultat nom="download" taille={18}/>{t.exporter}</button>{exportErreur&&<p role="alert">{t.exportErreur}</p>}<Link className="jn-secondaire" to={avecLangue("/progres",l)}>{t.bilanComplet}</Link></section>{suite}{reglages}{footer}</div></>;}
