import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {chargerCatalogueInscription,type CatalogueInscriptionHabitudes} from '@/lib/habitudes-catalogue-api';
import {InscriptionHabitudes} from '@/components/InscriptionHabitudes';
import {prenomDuCompte} from '@/lib/connexion-sociale';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {IconeHD} from '@/components/IconeHabitudes';
const CARTE='bg-hd-surface-container-lowest rounded-2xl p-hd-space-md shadow-[0_2px_10px_rgba(29,28,19,0.04)] flex flex-col gap-hd-space-sm',BOUTON='w-full min-h-[52px] bg-hd-secondary text-hd-on-secondary font-hd-label-lg text-hd-label-lg font-medium rounded-xl flex items-center justify-center gap-2';

export function HabitudesInscription(){
 const [q]=useSearchParams(),location=useLocation(),langue=q.get('lang')==='en'?'en':'fr';
 const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
 const erreurConfirmation=['error','error_code','error_description'].some(cle=>q.has(cle)||fragment.has(cle));
 const l=(fr:string,en:string)=>langue==='en'?en:fr;
 useEffect(()=>{document.title=l('Inscription · Habitudes & Défis','Enrollment · Habits & Challenges')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 return <CadreHabitudes titre={l('Habitudes & Défis','Habits & Challenges')} langue={langue} retour={`/offres?lang=${langue}`} retourLibelle={l('Revenir aux offres','Back to offers')} avecNavigation={false}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg">
  <div className="flex flex-col gap-1.5 mb-hd-space-md">
   <span className="font-hd-label-sm text-hd-label-sm uppercase tracking-widest text-hd-secondary">{l('Nouveau parcours','New journey')}</span>
   <h1 className="font-hd-headline-lg text-hd-headline-lg text-hd-on-surface tracking-tight">{l('Habitudes & Défis','Habits & Challenges')}</h1>
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Un parcours pour mettre tes habitudes en pratique, pas à pas, avec des horaires adaptés à ton quotidien. Tu déclares toi-même les actions réalisées.','A journey to put your habits into practice, step by step, with a schedule adapted to your daily life. You report completed actions yourself.')}</p>
  </div>
  <Link className="mb-hd-space-lg flex items-center gap-3 p-3.5 rounded-xl bg-hd-surface-container-low text-hd-on-surface" to={`/confidentialite?lang=${langue}`}><IconeHD nom="lock" className="text-[20px] text-hd-secondary"/><span className="font-hd-label-lg text-hd-label-lg flex-1">{l('Comprendre la confidentialité de mes données','Understand my data privacy')}</span><IconeHD nom="chevron_right" className="text-[20px] text-hd-outline"/></Link>
  {habitudesActivees()?(erreurConfirmation?<section className={CARTE}><p role="alert" className="font-hd-body-md text-hd-body-md">{l('Ce lien n’a pas permis de confirmer ta connexion. Il peut avoir expiré ou déjà été utilisé. Reconnecte-toi pour reprendre ton inscription.','This link could not confirm your sign-in. It may have expired or already been used. Sign in again to resume enrollment.')}</p><Link className={BOUTON} to={`/connexion?lang=${langue}&mode=signin&suite=habitudes`}>{l('Se reconnecter','Sign in again')}</Link></section>:<CatalogueConnecte langue={langue}/>):<p className="font-hd-body-md text-hd-body-md">{l('L’inscription à ce parcours est en préparation.','Enrollment in this journey is being prepared.')}</p>}
 </div></CadreHabitudes>;
}
function CatalogueConnecte({langue}:{langue:string}){
 const l=(fr:string,en:string)=>langue==='en'?en:fr;
 const [compte,setCompte]=useState<string|null|undefined>(undefined),[erreurSession,setErreurSession]=useState(false),[tour,setTour]=useState(0);
 const [charge,setCharge]=useState<{contexte:string;catalogue?:CatalogueInscriptionHabitudes;erreur?:boolean}|null>(null);
 const sequence=useRef(0),compteCourant=useRef<string|null|undefined>(undefined),prenomCourant=useRef('');
 useEffect(()=>{
  let actif=true,revision=0;setCompte(undefined);setErreurSession(false);
  const auth=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(actif){const id=session?.user.id??null;if(compteCourant.current!==id){compteCourant.current=id;prenomCourant.current=prenomDuCompte(session?.user.user_metadata);sequence.current++;setCharge(null);setCompte(id);}setErreurSession(false);}});
  const n=revision;void supabase.auth.getSession().then(({data,error})=>{if(actif&&n===revision){if(error)setErreurSession(true);else{compteCourant.current=data.session?.user.id??null;prenomCourant.current=prenomDuCompte(data.session?.user.user_metadata);setCompte(compteCourant.current);}}}).catch(()=>{if(actif&&n===revision)setErreurSession(true);});
  return()=>{actif=false;sequence.current++;auth.data.subscription.unsubscribe();};
 },[]);
 const contexte=JSON.stringify([compte,langue,tour]);
 useEffect(()=>{const n=++sequence.current;setCharge(null);if(!compte)return;
  void (async()=>{
   const profil=await supabase.rpc('ensure_participant',{p_prenom:prenomCourant.current||null});if(profil.error)throw profil.error;
   if(n!==sequence.current)return;
   const catalogue=await chargerCatalogueInscription(langue,compte);if(n===sequence.current)setCharge({contexte,catalogue});
  })().catch(()=>{if(n===sequence.current)setCharge({contexte,erreur:true});});return()=>{sequence.current++;};},[compte,langue,tour,contexte]);
 if(erreurSession)return <p role="alert" className="font-hd-body-md text-hd-body-md">{l('Ton compte ne peut pas être vérifié. Recharge la page.','Your account cannot be verified. Reload the page.')}</p>;
 if(compte===null)return <section className={CARTE}><p className="font-hd-body-md text-hd-body-md">{l('Connecte-toi pour vérifier la disponibilité de tes 30 jours gratuits.','Sign in to check the availability of your 30 free days.')}</p><Link className={BOUTON} to={`/connexion?lang=${langue}&mode=signin&suite=habitudes`}>{l('Se connecter','Sign in')}</Link></section>;
 if(compte===undefined||charge?.contexte!==contexte)return <p role="status" className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Vérification de ton accès…','Checking your access…')}</p>;
 if(charge.erreur)return <section className={CARTE}><p role="alert" className="font-hd-body-md text-hd-body-md">{l('L’offre ne peut pas être vérifiée pour le moment.','The offer cannot be verified right now.')}</p><button type="button" className={BOUTON} onClick={()=>setTour(t=>t+1)}>{l('Réessayer','Try again')}</button></section>;
 const c=charge.catalogue!;
 if(c.motif==='gratuite_deja_utilisee')return <section className={CARTE}><p className="font-hd-body-md text-hd-body-md">{l('Ton accès gratuit a déjà été utilisé. Ses dates sont conservées.','Your free access has already been used. Its dates are preserved.')}</p><Link className={BOUTON} to={`/acces?lang=${langue}`}>{l('Consulter mes accès','View my access')}</Link></section>;
 if(!c.offres.length)return <p className="font-hd-body-md text-hd-body-md">{l('Aucune offre de 30 jours gratuits n’est ouverte à l’inscription pour ton compte actuellement.','No 30-day free offer is currently open for enrollment for your account.')}</p>;
 return <>{c.offres.map(o=><section key={JSON.stringify([o.programme_id,o.version,o.offre_id])} className="flex flex-col"><h2 className="mb-2 font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-on-surface-variant">{o.nom}</h2><InscriptionHabitudes configuration={{compteId:compte,programmeId:o.programme_id,version:o.version,langue:o.langue,offreId:o.offre_id,fuseau:c.fuseau,planning:o.planning}}/></section>)}</>;
}
