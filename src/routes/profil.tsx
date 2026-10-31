import {PhotoProfil} from '@/components/PhotoProfil';
import {useCallback,useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {chargerProfil,enregistrerProfil,effacerProfils,lireProfil,modifierProfil,exporterProfil,type Profil as Donnees} from '@/lib/profil';
import {effacerEspaces,useEnLigne} from '@/lib/hors-ligne';
import {racineTest,dateRacineTest,nomsRacines} from '@/lib/objectif';
import {rawDay} from '@/lib/espace';
import {texts} from '@/lib/test-texts';
import {PreferencesProfil} from '@/components/PreferencesProfil';
import {Apparence} from '@/components/Apparence';
import {GoalCard} from '@/components/GoalCard';
import {EmailMatinCard} from '@/components/EmailMatinCard';
import {RappelsCard} from '@/components/RappelsCard';
import {WhatsAppLink} from '@/components/WhatsAppLink';
import {CodePlaceCard} from '@/components/CodePlaceCard';
import {IconeConfidentialite as C} from '@/components/IconeConfidentialite';
import {BarreNav} from '@/components/BarreNav';
import {IconeProfilModerne as P} from '@/components/IconeProfilModerne';
import {useApparence} from '@/lib/apparence';
import {IconeTrait as T,type SymboleTrait} from '@/components/IconeTrait';
import {HorairesHabitudes} from '@/components/HorairesHabitudes';
import {FuseauVoyage} from '@/components/FuseauVoyage';
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {rappelsHabitudesActifs} from '@/lib/habitudes-rappels';
import {chargerPas,etapesJardin,joursCeMois,pasCetteSemaine,TEXTES_JARDIN,type EtapeJardin,type Pas} from '@/lib/profil-pas';
import {EVENEMENT_GRAINES,envoyerInvitation,lireGraines} from '@/lib/invitation';
import {VERSIONS,lireAnnotations,lireReglages,ecrireReglages,livreParCode,nomReference,type Annotation,type Version} from '@/lib/bible';
import './profil-v2.css';
import {usePreferencesVisuelles} from '@/lib/preferences-visuelles';

type Parcours=Donnees['parcours'][number];
/** Jour n d'un parcours (0 = premier jour), compté en dates sans décalage de fuseau. */
const jourParcours=(debut:string,n:number)=>{const d=new Date(`${debut}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d;};
/** « 19 octobre », avec l'année seulement si ce n'est pas l'année en cours. */
const dateCourte=(d:Date,en:boolean,timeZone='UTC')=>{const annee=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone}).format(d));return new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',...(annee!==new Date().getFullYear()?{year:'numeric' as const}:{}),timeZone}).format(d);};
function etatParcours(p:Parcours){const brut=rawDay(p.debut,new Date());const jour=Math.max(0,Math.min(p.duree,brut));const statut=p.etat==='en_pause'?'pause':jour===0?'avenir':jour>=p.duree&&(p.etat==='terminee'||brut>p.duree)?'termine':'encours';return{p,jour,statut};}

const NOMS_PALETTES:Record<string,[string,string]>={ivoire:['Lavande','Lavender'],sable:['Sable','Sand'],sauge:['Sauge','Sage'],argile:['Argile','Clay'],ardoise:['Bleu ardoise','Slate blue']};
/** Ligne de réglage qui s'ouvre sur place. Le contenu reste monté : les états se chargent comme avant
 *  et le résumé de la ligne reste juste, même fermée (réglages validés le 31/10/2026). */
function Reglage({id,icone,titre,valeur,ouvert,basculer,children}:{id:string;icone:SymboleTrait;titre:string;valeur?:string|null;ouvert:boolean;basculer:()=>void;children:ReactNode}){
 return <div className={`pv-reglage${ouvert?' est-ouvert':''}`} id={`pf-${id}`}>
  <button type="button" className="pv-ligne" aria-expanded={ouvert} aria-controls={`pf-${id}-panneau`} onClick={basculer}>
   <span className="pv-tuile"><T nom={icone} taille={20}/></span><span className="pv-ligne-titre">{titre}{valeur&&<small>{valeur}</small>}</span><span className="pv-chevron pv-chevron-bas"><T nom="bas" taille={18}/></span>
  </button>
  <div className="pv-panneau" id={`pf-${id}-panneau`} role="region" aria-label={titre} hidden={!ouvert}>{children}</div>
 </div>;
}
function LigneLien({to,icone,children,valeur,className=''}:{to:string;icone:SymboleTrait;children:ReactNode;valeur?:string;className?:string}){
 return <Link to={to} className={`pv-ligne${className?` ${className}`:''}`}><span className="pv-tuile"><T nom={icone} taille={20}/></span><span className="pv-ligne-titre">{children}{valeur&&<small>{valeur}</small>}</span><span className="pv-chevron"><T nom="chevron" taille={18}/></span></Link>;
}
type Filtre='tout'|'versets'|'reflexions'|'parcours';
type Element={cle:string;type:'parcours'|'versets'|'reflexions';le:string;titre:string;sujet:string;detail?:string;annotation?:Annotation};
const lienChapitre=(a:Annotation,langue:string)=>`/bible/${a.livre.toLowerCase()}/${a.chapitre}${langue==='en'?'?lang=en':''}`;
function quand(iso:string,en:boolean){const j=Math.round((Date.parse(new Date().toISOString().slice(0,10))-Date.parse(iso.slice(0,10)))/864e5);if(j<=0)return en?'today':'aujourd’hui';if(j===1)return en?'yesterday':'hier';if(j<30)return en?`${j} days ago`:`il y a ${j} jours`;return dateCourte(new Date(`${iso.slice(0,10)}T12:00:00Z`),en);}
function reference(a:Annotation,langue:'fr'|'en'){const l=livreParCode(a.livre);return l?nomReference(l,a.chapitre,a.verset,langue):`${a.livre} ${a.chapitre}:${a.verset}`;}
const ICONES_ETAPES:Record<EtapeJardin,SymboleTrait>={graine:'graine',pousse:'pousse',tige:'tige',arbre:'arbre'};

/** Profil (vue « profil ») et Mes réglages (vue « reglages ») : même chargement, même session, mêmes copies hors connexion. */
export function Profil({vue='profil'}:{vue?:'profil'|'reglages'}){
 const navigate=useNavigate();const location=useLocation();const[apparence]=useApparence();const[visuel]=usePreferencesVisuelles();
 const[ouvert,setOuvert]=useState<string|null>(null);const[resumeRappels,setResumeRappels]=useState<string|null>(null);const[resumeEmail,setResumeEmail]=useState<string|null>(null);const[resumeWhatsApp,setResumeWhatsApp]=useState<string|null>(null);const[params,setParams]=useSearchParams();const enLigne=useEnLigne();
 const[data,setData]=useState<Donnees|null>(null);const[etat,setEtat]=useState<'chargement'|'pret'|'erreur'>('chargement');const[copie,setCopie]=useState<string|null>(null);
 const[editing,setEditing]=useState(false);const[prenom,setPrenom]=useState('');const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[erreur,setErreur]=useState('');
 const[equipe,setEquipe]=useState(false);const generation=useRef(0);const userId=useRef<string|null>(null);const en=(params.get('lang')??data?.langue)==='en';const langue=en?'en':'fr';
 const refresh=useCallback(async()=>{const ticket=++generation.current;setEtat('chargement');setBusy(false);setErreur('');setMessage('');setData(null);setCopie(null);setEditing(false);
  try{const s=await supabase.auth.getSession();if(ticket!==generation.current)return;if(s.error)throw s.error;const u=s.data.session?.user;if(!u){effacerProfils();navigate('/connexion',{replace:true});return;}userId.current=u.id;effacerProfils(u.id);
   const cache=lireProfil(u.id);if(navigator.onLine===false){if(!cache)throw Error('Aucune copie');setData(cache.profil);setCopie(cache.le);setEtat('pret');return;}
   try{const p=await chargerProfil(u);if(ticket!==generation.current)return;setData(p);enregistrerProfil(p);setEtat('pret');}catch(e){if(ticket!==generation.current)return;if(!cache)throw e;setData(cache.profil);setCopie(cache.le);setEtat('pret');}
  }catch{if(ticket===generation.current)setEtat('erreur');}
 },[navigate]);
 useEffect(()=>{void refresh();return()=>{generation.current++;};},[refresh,enLigne]);
 useEffect(()=>{const{data:subscription}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(userId.current&&session?.user.id!==userId.current)){generation.current++;setData(null);setCopie(null);setEditing(false);effacerEspaces();effacerProfils();userId.current=null;if(!session)navigate('/connexion',{replace:true});else queueMicrotask(()=>void refresh());}});return()=>subscription.subscription.unsubscribe();},[navigate,refresh]);
 // Administration déplacée du bas de l'espace vers le profil (demande du 24/10/2026) : visible seulement pour l'équipe.
 useEffect(()=>{if(!data||copie||vue!=='reglages')return;let actif=true;void Promise.resolve().then(()=>supabase.rpc('staff_me')).then(r=>{const d=r?.data as {admin?:boolean;roles?:string[]}|null|undefined;if(actif)setEquipe(Boolean(d&&(d.admin||d.roles?.length)));}).catch(()=>undefined);return()=>{actif=false;};},[data?.userId,copie,vue]);
 useEffect(()=>{document.title=`${vue==='reglages'?(en?'My settings':'Mes réglages'):(en?'My profile':'Mon profil')} — SÉNEVÉ`;document.documentElement.lang=langue;},[en,langue,vue]);
 // « Mes pas » : actions déclarées, chargées en ligne seulement (aucun chiffre inventé hors connexion).
 const[pas,setPas]=useState<Pas[]|null|'indisponible'>(null);const[graines,setGraines]=useState(lireGraines);const[filtre,setFiltre]=useState<Filtre>('tout');
 const onglet=params.get('onglet')==='carnet'?'carnet':params.get('onglet')==='chemin'?'chemin':'pas';
 const choisirOnglet=(o:'pas'|'carnet'|'chemin')=>setParams(q=>{const n=new URLSearchParams(q);if(o==='pas')n.delete('onglet');else n.set('onglet',o);return n;},{replace:true});
 const[annotations]=useState<Annotation[]>(()=>Object.values(lireAnnotations()).sort((a,b)=>b.modifie.localeCompare(a.modifie)));
 const[versionBible,setVersionBible]=useState<Version>(()=>lireReglages(langue).version);
 useEffect(()=>{const f=()=>setGraines(lireGraines());window.addEventListener(EVENEMENT_GRAINES,f);window.addEventListener('storage',f);return()=>{window.removeEventListener(EVENEMENT_GRAINES,f);window.removeEventListener('storage',f);};},[]);
 useEffect(()=>{if(vue!=='profil'||!data)return;if(copie!==null||!enLigne){setPas('indisponible');return;}let actif=true;setPas(null);chargerPas(data.parcours.map(x=>x.id)).then(r=>{if(actif)setPas(r);}).catch(()=>{if(actif)setPas('indisponible');});return()=>{actif=false;};},[vue,data,copie,enLigne]);
 // Liens vers une rubrique (#preferences, #notifications, #rappels, #whatsapp, #email-matin, #code) : la ligne s'ouvre.
 useEffect(()=>{if(etat!=='pret')return;const h=location.hash.replace('#','');const cible=h==='notifications'||h==='rappels'?'rappels':h==='preferences'?'langue':['email-matin','whatsapp','code','prenom','horaires','langue','mode','couleurs','taille','version'].includes(h)?h:null;if(cible&&vue==='profil'){navigate(`/reglages${location.search}#${h}`,{replace:true});return;}if(!cible&&vue==='reglages'&&params.get('parcours')){setOuvert('horaires');return;}if(!cible)return;setOuvert(cible);requestAnimationFrame(()=>document.getElementById(`pf-${cible}`)?.scrollIntoView?.({block:'start'}));},[etat,location.hash,vue]);
 const lectureSeule=!enLigne||copie!==null;const racine=racineTest();const racineLe=dateRacineTest();
 const parcours=(data?.parcours??[]).map(etatParcours);const enCours=parcours.filter(x=>x.statut==='encours'&&x.p.etat==='active').length;
 async function enregistrer(changements:{prenom?:string;langue?:string}){if(!data||busy||lectureSeule)return;const p=data;const ticket=generation.current;setBusy(true);setMessage('');setErreur('');try{const nouveau=await modifierProfil(p,changements);if(ticket!==generation.current)return;setData(nouveau);enregistrerProfil(nouveau);setEditing(false);if(changements.langue)setParams({lang:changements.langue},{replace:true});setMessage(changements.langue==='en'||(en&&!changements.langue)?'Profile saved':'Profil mis à jour');}catch{if(ticket===generation.current)setErreur(en?'Your changes could not be saved. Please try again.':'Tes modifications n’ont pas pu être enregistrées. Réessaie.');}finally{if(ticket===generation.current)setBusy(false);}}
 function sauverPrenom(e:FormEvent){e.preventDefault();const v=prenom.trim();if(v&&v.length<=80)void enregistrer({prenom:v});}
 async function deconnecter(){if(busy)return;setBusy(true);setErreur('');try{const r=await supabase.auth.signOut({scope:'local'});if(r.error)throw r.error;effacerEspaces();effacerProfils();navigate('/connexion',{replace:true});}catch{setErreur(en?'Sign out failed. Please try again.':'La déconnexion a échoué. Réessaie.');}finally{setBusy(false);}}
 async function telecharger(){if(!data||lectureSeule||busy)return;const ticket=generation.current;setBusy(true);setErreur('');try{const copie=await exporterProfil(data);if(ticket!==generation.current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(copie,null,2)],{type:'application/json'}));const lien=document.createElement('a');lien.href=url;lien.download='seneve-profil-journal.json';lien.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{if(ticket===generation.current)setErreur(en?'Download failed. Please try again.':'Le téléchargement a échoué. Réessaie.');}finally{if(ticket===generation.current)setBusy(false);}}
 async function recharger(){try{const r=await navigator.serviceWorker?.getRegistration?.();await r?.update();}catch{/* la page se recharge quand même */}window.location.reload();}
 const suffixe=en?'?lang=en':'';
 const titrePage=vue==='reglages'?(en?'My settings':'Mes réglages'):(en?'My profile':'Mon profil');
 const tete=<header className="pf-header pf-header-moderne"><Link to={vue==='reglages'?`/profil${suffixe}`:'/espace'} aria-label={en?'Back':'Revenir'}><P nom="arrow_back" taille={24}/></Link><h1>{titrePage}</h1><span className="pf-header-espace" aria-hidden="true"/></header>;
 if(etat==='chargement')return <main className="pf-page">{tete}<section className="pf-loading" role="status" aria-label={en?'Loading your profile':'Chargement de ton profil'}><span className="pf-avatar pf-squelette"/><p>{en?'Loading your profile…':'Chargement de ton profil…'}</p>{[0,1,2].map(k=><div className="pf-squelette pf-loading-card" key={k}/>)}</section></main>;
 if(etat==='erreur'||!data)return <main className="pf-page">{tete}<section className="pf-error"><C nom={enLigne?'wifi_off':'wifi_off'} taille={64}/><h2>{en?(enLigne?'Unable to load your profile':'You are offline'):(enLigne?'Impossible de charger ton profil':'Tu es hors connexion')}</h2><p role="alert">{en?(enLigne?'Check your connection, then try again.':'There is no saved profile available on this device.'):(enLigne?'Vérifie ta connexion, puis réessaie.':'Aucune copie de ton profil n’est disponible sur cet appareil.')}</p><button className="btn" onClick={()=>void refresh()}>{en?'Try again':'Réessayer'}</button><Link to="/espace">{en?'Back to today':'Revenir à ma journée'}</Link></section><Apparence langue={langue}/></main>;
 const bandeaux=<>{lectureSeule&&<aside className="pf-offline" role="status"><C nom="wifi_off"/><div><strong>{en?(enLigne?'Connection interrupted':'Offline mode'):(enLigne?'Connexion interrompue':'Mode hors connexion')}</strong><p>{copie?<>{en?'Saved copy from ':'Copie enregistrée le '}<time dateTime={copie}>{new Intl.DateTimeFormat(en?'en-GB':'fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Kinshasa'}).format(new Date(copie))}</time>.</>:null} {en?'Reconnect to edit your profile.':'Reconnecte-toi pour modifier ton profil.'}</p>{enLigne&&<button className="link" onClick={()=>void refresh()}>{en?'Try again':'Réessayer'}</button>}</div></aside>}
 {message&&<div className="pf-saved" role="status"><C nom="check"/><strong>{message}</strong><button aria-label={en?'Dismiss confirmation':'Fermer la confirmation'} onClick={()=>setMessage('')}>×</button></div>}{erreur&&<p className="error" role="alert">{erreur}</p>}</>;
 const basculer=(id:string)=>()=>setOuvert(o=>o===id?null:id);
 const reconnecte=(texte:string)=><p className="pf-reglage-note">{texte}</p>;

 if(vue==='reglages'){
  const hd=params.get('parcours')??(habitudesActivees()?data.parcours.find(x=>x.programme?.startsWith('HABITUDES_DEFIS')&&x.etat==='active')?.id:undefined);
  const emailMasque=data.email.replace(/^(.{4})[^@]*@/,'$1***@');
  const nomApparence=apparence==='sombre'?(en?'Dark':'Sombre'):apparence==='clair'?(en?'Light':'Clair'):(en?'Like my phone':'Comme mon téléphone');
  const tailles={normale:en?'Standard':'Normale',grande:en?'Large':'Grande','tres-grande':en?'Extra large':'Très grande'};
  return <main className="pf-page pv-page avec-nav">
  <header className="pv-haut"><Link className="pv-rond" to={`/profil${suffixe}`} aria-label={en?'Back to my profile':'Revenir à mon profil'}><T nom="retour"/></Link><button type="button" className="pv-pastille" disabled={busy} onClick={()=>void deconnecter()}>{en?'Sign me out':'Me déconnecter'}</button></header>
  {bandeaux}
  <p className="pv-surtitre">{en?'Preferences & access':'Préférences & accès'}</p>
  <h1 className="pv-titre">{titrePage}</h1>
  <p className="pv-intro">{en?'Adjust SÉNEVÉ to your rhythm, your language and the way you read.':'Ajuste SÉNEVÉ à ton rythme, à ta langue et à ta façon de lire.'}</p>

  <h2 className="pv-surtitre" id="pv-espace">{en?'My space':'Mon espace'}</h2>
  <div className="pv-groupe" role="group" aria-labelledby="pv-espace">
   <Reglage id="prenom" icone="photo" titre={en?'My first name and photo':'Mon prénom et ma photo'} valeur={data.prenom||null} ouvert={ouvert==='prenom'} basculer={basculer('prenom')}>
    <div className="pv-identite-reglage"><PhotoProfil key={data.userId} userId={data.userId} prenom={data.prenom} langue={langue} lectureSeule={lectureSeule}/>
    {editing?<form className="pf-prenom-form" onSubmit={sauverPrenom}><label className="field">{en?'First name':'Prénom'}<input value={prenom} maxLength={80} required disabled={lectureSeule||busy} onChange={e=>setPrenom(e.target.value)} autoComplete="given-name"/></label><button className="btn" disabled={busy||lectureSeule||!prenom.trim()}>{en?'Save':'Enregistrer'}</button><button type="button" className="link" onClick={()=>setEditing(false)}>{en?'Cancel':'Annuler'}</button></form>
     :<button className="pf-hero-modifier" disabled={lectureSeule} onClick={()=>{setPrenom(data.prenom);setEditing(true);}}><P nom="edit" taille={16}/>{en?'Edit my first name':'Modifier mon prénom'}</button>}</div>
   </Reglage>
   <LigneLien to="/aide?motif=adresse-email" icone="arobase" valeur={emailMasque}>{en?'Email address':'Adresse e-mail'}</LigneLien>
   <LigneLien to={`/mot-de-passe-oublie?lang=${langue}`} icone="cadenas">{en?'Password':'Mot de passe'}</LigneLien>
   <LigneLien to={`/acces?lang=${langue}`} icone="cle">{en?'My access and purchases':'Mes accès et achats'}</LigneLien>
   {equipe&&<LigneLien to="/admin" icone="equipe" className="pv-admin">Administration</LigneLien>}
  </div>

  <h2 className="pv-surtitre" id="pv-rdv">{en?'My appointments':'Mes rendez-vous'}</h2>
  <div className="pv-groupe" role="group" aria-labelledby="pv-rdv">
   <Reglage id="rappels" icone="cloche" titre={en?'Reminders and announcements':'Rappels et annonces'} valeur={lectureSeule?null:resumeRappels} ouvert={ouvert==='rappels'} basculer={basculer('rappels')}>
    {lectureSeule?reconnecte(en?'Reconnect to view or change your notifications and WhatsApp link.':'Reconnecte-toi pour consulter ou modifier tes notifications et ta liaison WhatsApp.'):<RappelsCard langue={langue} interrupteurs onResume={setResumeRappels}/>}
   </Reglage>
   <Reglage id="email-matin" icone="courriel" titre={en?'Morning e-mail':'E-mail du matin'} valeur={lectureSeule?null:resumeEmail} ouvert={ouvert==='email-matin'} basculer={basculer('email-matin')}>
    {lectureSeule?reconnecte(en?'Reconnect to view or change your notifications and WhatsApp link.':'Reconnecte-toi pour consulter ou modifier tes notifications et ta liaison WhatsApp.'):<EmailMatinCard langue={langue} maquette onResume={setResumeEmail}/>}
   </Reglage>
   <Reglage id="whatsapp" icone="message" titre="WhatsApp" valeur={lectureSeule?null:resumeWhatsApp} ouvert={ouvert==='whatsapp'} basculer={basculer('whatsapp')}>
    {lectureSeule?reconnecte(en?'Reconnect to view or change your notifications and WhatsApp link.':'Reconnecte-toi pour consulter ou modifier tes notifications et ta liaison WhatsApp.'):<WhatsAppLink maquette langue={langue} onResume={setResumeWhatsApp}/>}
   </Reglage>
   {hd&&<Reglage id="horaires" icone="calendrier" titre={en?'My Habits & Challenges times':'Mes horaires Habitudes & Défis'} ouvert={ouvert==='horaires'} basculer={basculer('horaires')}>
    {lectureSeule?reconnecte(en?'Reconnect to view or change your times.':'Reconnecte-toi pour consulter ou modifier tes horaires.'):<>{rappelsHabitudesActifs()&&<FuseauVoyage langue={langue}/>}<HorairesHabitudes key={hd} enrollmentId={hd} langue={langue}/>{rappelsHabitudesActifs()&&<RappelsHabitudes langue={langue}/>}</>}
   </Reglage>}
  </div>

  <h2 className="pv-surtitre" id="pv-affichage">{en?'Display':'Affichage'}</h2>
  <div className="pv-groupe" role="group" aria-labelledby="pv-affichage">
   <Reglage id="langue" icone="langue" titre={en?'Language':'Langue'} valeur={data.langue==='en'?'English':'Français'} ouvert={ouvert==='langue'} basculer={basculer('langue')}><PreferencesProfil seul="langue" langue={langue} langueCompte={data.langue} indisponible={busy||lectureSeule} lectureSeule={lectureSeule} onLangueChange={l=>void enregistrer({langue:l})}/></Reglage>
   <Reglage id="mode" icone="lune" titre={en?'Light or dark':'Clair ou sombre'} valeur={nomApparence} ouvert={ouvert==='mode'} basculer={basculer('mode')}><PreferencesProfil seul="mode" langue={langue} langueCompte={data.langue} onLangueChange={()=>undefined}/></Reglage>
   <Reglage id="couleurs" icone="palette" titre={en?'Colours':'Couleurs'} valeur={(NOMS_PALETTES[visuel.palette]??NOMS_PALETTES.ivoire!)[en?1:0]} ouvert={ouvert==='couleurs'} basculer={basculer('couleurs')}><PreferencesProfil seul="palette" langue={langue} langueCompte={data.langue} onLangueChange={()=>undefined}/></Reglage>
   <Reglage id="taille" icone="note" titre={en?'Text size':'Taille du texte'} valeur={tailles[visuel.taille]} ouvert={ouvert==='taille'} basculer={basculer('taille')}><PreferencesProfil seul="taille" langue={langue} langueCompte={data.langue} onLangueChange={()=>undefined}/></Reglage>
  </div>

  <h2 className="pv-surtitre" id="pv-bible">{en?'My Bible':'Ma Bible'}</h2>
  <div className="pv-groupe" role="group" aria-labelledby="pv-bible">
   <Reglage id="version" icone="livre" titre={en?'Reading translation':'Traduction de lecture'} valeur={VERSIONS[versionBible].nom} ouvert={ouvert==='version'} basculer={basculer('version')}>
    <fieldset className="pv-choix"><legend className="sr-only">{en?'Reading translation':'Traduction de lecture'}</legend>{(['lsg','web'] as const).map(v=><label key={v}><input type="radio" name="pv-version" checked={versionBible===v} onChange={()=>{ecrireReglages({...lireReglages(langue),version:v});setVersionBible(v);}}/><span>{VERSIONS[v].nom}</span></label>)}</fieldset>
    <p className="pf-reglage-note">{en?'Kept on this phone. You can also change it while reading.':'Gardée sur ce téléphone. Tu peux aussi la changer pendant la lecture.'}</p>
   </Reglage>
   <LigneLien to={`/bible/annotations${suffixe}`} icone="verset" valeur={en?'On this phone only':'Sur ce téléphone uniquement'}>{en?'Saved verses and notes':'Versets gardés et notes'}</LigneLien>
  </div>

  <h2 className="pv-surtitre" id="pv-parcours">{en?'My journeys':'Mes parcours'}</h2>
  <div className="pv-groupe" role="group" aria-labelledby="pv-parcours">
   <Reglage id="code" icone="ticket" titre={en?'I received an offered place':'J’ai reçu une place offerte'} ouvert={ouvert==='code'} basculer={basculer('code')}>
    {lectureSeule?reconnecte(en?'Reconnect to use a code.':'Reconnecte-toi pour utiliser un code.'):<CodePlaceCard langue={langue} onOuvert={()=>navigate('/espace')}/>}
   </Reglage>
   <LigneLien to={`/offres?lang=${langue}`} icone="parcours">{en?'Discover the journeys':'Découvrir les parcours'}</LigneLien>
   <LigneLien to={`/bibliotheque?lang=${langue}`} icone="livre">{en?'My library':'Ma bibliothèque'}</LigneLien>
  </div>

  <h2 className="pv-surtitre" id="pv-donnees">{en?'My data':'Mes données'}</h2>
  <p className="pf-note-privee"><P nom="lock" taille={18}/>{en?'Your journal is private. You choose the excerpts you share with the team.':'Ton journal est privé. Tu choisis les extraits que tu partages avec l’équipe.'}</p>
  <div className="pv-groupe" role="group" aria-labelledby="pv-donnees">
   <LigneLien to={en?'/confidentialite?lang=en':'/confidentialite'} icone="bouclier">{en?'How we protect your data':'Comment nous protégeons tes données'}</LigneLien>
   <button type="button" className="pv-ligne" disabled={lectureSeule||busy} onClick={()=>void telecharger()}><span className="pv-tuile"><T nom="telecharger" taille={20}/></span><span className="pv-ligne-titre">{en?'Download my profile and journal':'Télécharger mon profil et mon journal'}</span><span className="pv-chevron"><T nom="chevron" taille={18}/></span></button>
   <LigneLien to="/aide?motif=export-donnees" icone="note">{en?'Request a copy of my data':'Demander une copie de mes données'}</LigneLien>
  </div>

  <button type="button" className="pv-recharger" onClick={()=>void recharger()}>{en?'Reload SÉNEVÉ':'Recharger SÉNEVÉ'}</button>
  <p className="pv-note">{en?'The latest version of SÉNEVÉ is loaded. Your journal, your steps and your saved verses stay in place.':'La dernière version de SÉNEVÉ est chargée. Ton journal, tes pas et tes versets gardés restent en place.'}</p>
  <Link className="pv-supprimer" to="/aide?motif=suppression-compte">{en?'Request account deletion':'Demander la suppression de mon compte'}</Link>
  <p className="pv-marque">SÉNEVÉ · {en?'ONE STEP EVERY DAY':'UN PAS CHAQUE JOUR'}</p>
  <BarreNav langue={langue} maquette iconesJournee/>
  </main>;
 }

 // Vue profil : Mes pas · Mon carnet · Mon chemin.
 const TJ=TEXTES_JARDIN[langue];
 const chargement=pas===null,indispo=pas==='indisponible',liste=Array.isArray(pas)?pas:[];
 const etapes=etapesJardin(parcours.map(({p,statut})=>({id:p.id,debut:p.debut,duree:p.duree,termineLe:statut==='termine'?jourParcours(p.debut,p.duree-1).toISOString().slice(0,10):null})),liste);
 const elements:Element[]=[
  ...(indispo||chargement?[]:etapes.filter(e=>e.atteinte&&e.le).map(e=>({cle:`etape-${e.id}`,type:'parcours' as const,le:e.le!,titre:TJ.fil[e.id],sujet:TJ.detail[e.id]}))),
  ...annotations.filter(a=>a.couleur||a.signet).map(a=>({cle:`v-${a.cle}`,type:'versets' as const,le:a.modifie,titre:en?'Saved verse':'Verset gardé',sujet:reference(a,langue),annotation:a})),
  ...annotations.filter(a=>a.note).map(a=>({cle:`n-${a.cle}`,type:'reflexions' as const,le:a.modifie,titre:en?'Reflection on a verse':'Réflexion sur un verset',sujet:reference(a,langue),detail:a.note,annotation:a})),
 ].sort((x,y)=>y.le.localeCompare(x.le)).slice(0,20);
 const visibles=elements.filter(e=>filtre==='tout'||e.type===filtre);
 const chiffre=(n:number)=>chargement?'…':indispo?'—':String(n);
 const onglets:[('pas'|'carnet'|'chemin'),string][]=[['pas',en?'My steps':'Mes pas'],['carnet',en?'My notebook':'Mon carnet'],['chemin',en?'My path':'Mon chemin']];
 const filtres:[Filtre,string,SymboleTrait|null][]=[['tout',en?'All':'Tout',null],['versets',en?'Verses':'Versets','verset'],['reflexions',en?'Reflections':'Réflexions','note'],['parcours',en?'Journeys':'Parcours','parcours']];
 const extrait=(a:Annotation)=><><blockquote className="pv-verset"><sup>{a.verset}</sup> {a.extrait}</blockquote><p className="pv-ref">{reference(a,langue)} · {VERSIONS[a.version]?.nom??a.version}</p></>;
 return <main className="pf-page pv-page avec-nav">
 <header className="pv-haut"><Link className="pv-pastille" to={`/aide${suffixe}`}><T nom="aide"/>{en?'Need help?':'Besoin d’aide ?'}</Link><span className="pv-pastille pv-icones"><Link to={`/notifications${suffixe}`} aria-label="Notifications"><T nom="cloche"/></Link><Link to={`/reglages${suffixe}`} aria-label={en?'My settings':'Mes réglages'}><T nom="reglages"/></Link></span></header>
 {bandeaux}
 <section className="pv-identite" aria-label={en?'My identity':'Mon identité'}>
  <div><h1>{data.prenom||(en?'My space':'Mon espace')}</h1>
   {data.objectif?.texte&&<p className="pv-objectif"><T nom="objectif" taille={20}/>{en?'My goal: ':'Mon objectif : '}{data.objectif.texte}</p>}
   {(enCours>0||racine!==null)&&<ul className="pf-pastilles">
    {enCours>0&&<li><P nom="auto_stories" taille={16}/>{en?`${enCours} ${enCours>1?'journeys':'journey'} in progress`:`${enCours} parcours en cours`}</li>}
    {racine!==null&&<li><P nom="spa" taille={16}/>{en?'Root: ':'Racine : '}{nomsRacines(langue)[racine]}</li>}
   </ul>}
  </div>
  <PhotoProfil key={data.userId} userId={data.userId} prenom={data.prenom} langue={langue} lectureSeule={lectureSeule}/>
 </section>

 <div className="pv-onglets" role="tablist" aria-label={en?'My profile':'Mon profil'}>{onglets.map(([o,nom])=><button key={o} type="button" role="tab" id={`pv-onglet-${o}`} aria-controls={`pv-panneau-${o}`} aria-selected={onglet===o} onClick={()=>choisirOnglet(o)}>{nom}</button>)}</div>

 <section role="tabpanel" id="pv-panneau-pas" aria-labelledby="pv-onglet-pas" hidden={onglet!=='pas'}>
  <div className="pv-grille">
   <article className="pv-carte"><p className="pv-label">{en?'Steps taken this week':'Pas posés cette semaine'}</p><p className="pv-chiffre">{chiffre(pasCetteSemaine(liste))}</p><small>{en?'Actions completed, fully or partly':'Actions réalisées, entièrement ou en partie'}</small></article>
   <article className="pv-carte"><p className="pv-label">{en?`Days of practice in ${new Intl.DateTimeFormat('en-GB',{month:'long',timeZone:'Africa/Kinshasa'}).format(new Date())}`:`Jours de pratique en ${new Intl.DateTimeFormat('fr-FR',{month:'long',timeZone:'Africa/Kinshasa'}).format(new Date())}`}</p><p className="pv-chiffre">{chiffre(joursCeMois(liste))}</p><small>{en?'At least one step declared':'Au moins un pas déclaré'}</small></article>
  </div>
  <p className="pv-honnete"><T nom="graine" taille={15}/>{indispo?(en?'Your steps are shown when you are online.':'Tes pas s’affichent quand tu es en ligne.'):(en?'These figures repeat what you declared. They measure neither your faith nor your worth.':'Ces chiffres reprennent ce que tu as déclaré. Ils ne mesurent ni ta foi ni ta valeur.')}</p>
  <article className="pv-carte pv-graines"><div><p className="pv-chiffre">{graines}</p><p className="pv-label">{en?'Seeds shared':'Graines partagées'}</p><small>{en?'Invitations to the 7 Roots Test sent from this phone':'Invitations au Test des 7 Racines envoyées depuis ce téléphone'}</small></div><button type="button" className="pv-rond" aria-label={en?'Invite someone to the test':'Inviter un proche au test'} onClick={()=>void envoyerInvitation(langue)}><T nom="envoyer"/></button></article>
  <article className="pv-carte pv-jardin"><div className="pv-jardin-tete"><h2>{en?'My garden':'Mon jardin'}</h2><span>{en?'Matthew':'Matthieu'} 13:31-32</span></div>
   <ol className="pv-etapes">{etapes.map(e=><li key={e.id} className={e.atteinte&&!indispo&&!chargement?'atteinte':''}><span className="pv-etape"><T nom={ICONES_ETAPES[e.id]} taille={24}/></span><span>{TJ[e.id][0]}<br/>{TJ[e.id][1]}</span><span className="sr-only">{e.atteinte&&!indispo&&!chargement?(en?' — reached':' — atteinte'):(en?' — to come':' — à venir')}</span></li>)}</ol>
  </article>
  <div className="pv-puces" role="group" aria-label={en?'Filter':'Filtrer'}>{filtres.map(([f,nom,icone])=><button key={f} type="button" aria-pressed={filtre===f} onClick={()=>setFiltre(f)}>{icone&&<T nom={icone} taille={18}/>}{nom}</button>)}</div>
  <div className="pv-fil">{visibles.length?visibles.map(e=><article className="pv-carte" key={e.cle}>
   <div className="pv-fil-tete"><span className="pv-tuile pv-tuile-fil"><T nom={e.type==='parcours'?'pousse':e.type==='versets'?'verset':'note'} taille={20}/></span><p>{e.titre}<br/><strong>{e.sujet}</strong></p><time dateTime={e.le}>{quand(e.le,en)}</time></div>
   {e.detail&&<p className="pv-note-texte">{e.detail}</p>}
   {e.annotation&&<>{extrait(e.annotation)}<Link className="pv-lien" to={lienChapitre(e.annotation,langue)}>{en?'Read the chapter':'Lire le chapitre'}<T nom="chevron" taille={16}/></Link></>}
  </article>):<p className="pv-vide">{en?'Your feed will fill with your steps, your saved verses and your reflections.':'Ton fil se remplira avec tes pas, tes versets gardés et tes réflexions.'}</p>}</div>
 </section>

 <section role="tabpanel" id="pv-panneau-carnet" aria-labelledby="pv-onglet-carnet" hidden={onglet!=='carnet'}>
  <p className="pv-honnete"><T nom="cadenas" taille={15}/>{en?'Your saved verses and notes stay on this phone only.':'Tes versets gardés et tes notes restent sur ce téléphone uniquement.'}</p>
  {annotations.length?annotations.slice(0,30).map(a=><article className="pv-carte pv-carnet" key={a.cle}>{extrait(a)}{a.note&&<p className="pv-note-texte">{a.note}</p>}<Link className="pv-lien" to={lienChapitre(a,langue)}>{en?'Read the chapter':'Lire le chapitre'}<T nom="chevron" taille={16}/></Link></article>)
   :<article className="pv-carte"><p>{en?'No saved verse yet. In the Bible, touch a verse to highlight it or write a note.':'Aucun verset gardé pour l’instant. Dans la Bible, touche un verset pour le surligner ou y écrire une note.'}</p><Link className="pv-lien" to={`/bible${suffixe}`}>{en?'Open the Bible':'Ouvrir la Bible'}<T nom="chevron" taille={16}/></Link></article>}
  <div className="pv-groupe"><LigneLien to={`/bible/annotations${suffixe}`} icone="verset">{en?'All my annotations':'Toutes mes annotations'}</LigneLien><LigneLien to={`/journal${suffixe}`} icone="journal">{en?'My journal':'Mon journal'}</LigneLien></div>
 </section>

 <section role="tabpanel" id="pv-panneau-chemin" aria-labelledby="pv-onglet-chemin" hidden={onglet!=='chemin'} className="pf-moderne">
  {parcours.length?parcours.map(({p,jour,statut})=><article className="pf-carte pf-parcours" key={p.id}>
   <div className="pf-parcours-tete"><h3>{p.nom}</h3><p>{statut==='pause'?(en?'Paused':'En pause'):statut==='avenir'?(en?`Starts on ${dateCourte(jourParcours(p.debut,0),en)}`:`Commence le ${dateCourte(jourParcours(p.debut,0),en)}`):statut==='termine'?(en?`Completed on ${dateCourte(jourParcours(p.debut,p.duree-1),en)}`:`Terminé le ${dateCourte(jourParcours(p.debut,p.duree-1),en)}`):(en?`Day ${jour} of ${p.duree}`:`Jour ${jour} sur ${p.duree}`)}</p></div>
   <progress value={jour} max={p.duree} aria-label={en?'Journey calendar':'Calendrier du parcours'}/>
   <Link className="pf-lien-action" to={`/espace?parcours=${encodeURIComponent(p.id)}`}>{en?'Open my journey':'Ouvrir mon parcours'}<P nom="arrow_forward" taille={16}/></Link>
  </article>):<article className="pf-carte"><p>{en?'You have not started a journey yet.':'Tu n’as pas encore commencé de parcours.'}</p></article>}
  <Link className="pf-lien-action pf-lien-seul" to={`/offres?lang=${langue}`}>{en?'Discover the journeys':'Découvrir les parcours'}<P nom="arrow_forward" taille={16}/></Link>
  <article className="pf-carte pf-goal">{lectureSeule?<><h3>{en?'My goal':'Mon objectif'}</h3><blockquote>{data.objectif?.texte||(en?'No goal in this saved copy.':'Aucun objectif dans cette copie.')}</blockquote></>:<GoalCard langue={langue} onSaved={()=>{setMessage(en?'Goal saved':'Objectif enregistré');void chargerProfil({id:data.userId,email:data.email}).then(p=>{if(userId.current===p.userId){setData(p);enregistrerProfil(p);}}).catch(()=>undefined);}}/>}</article>
  <article className="pf-carte pf-racine"><span className="pf-tuile"><P nom="spa"/></span><div><h3>{en?'My root from the test':'Ma racine au test'}</h3>{racine===null?<p>{en?'No root selected on this device.':'Aucune racine choisie sur cet appareil.'}</p>:<><p className="pf-root-label">{texts[langue].share.card.start}</p><p className="pf-root-nom">{nomsRacines(langue)[racine]}</p>{racineLe&&<p className="pf-root-date">{en?'Chosen on ':'Choisie le '}{dateCourte(new Date(racineLe),en,'Africa/Kinshasa')}</p>}</>}<Link className="pf-lien-action" to={`/?lang=${langue}`}>{en?'Take the test again':'Refaire le test'}<P nom="arrow_forward" taille={16}/></Link></div></article>
 </section>
 <BarreNav langue={langue} maquette iconesJournee/>
 </main>;
}
