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
 return <CadreHabitudes titre="Sénevé" sousTitreCentre={l('Habitudes & Défis','Habits & Challenges')} langue={langue} retour={`/offres?lang=${langue}`} retourLibelle={l('Revenir aux offres','Back to offers')} avecNavigation={false}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg">
  <section className="text-center flex flex-col items-center mb-hd-space-lg">
   <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-hd-surface-container text-hd-primary mb-3"><IconeHD nom="potted_plant" className="text-[16px]"/><span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider font-semibold">{l('Nouveau parcours','New journey')}</span></div>
   <h1 className="font-hd-headline-lg text-hd-headline-lg text-hd-on-surface mb-2">{l('Habitudes & Défis','Habits & Challenges')}</h1>
   <p className="font-hd-body-lg text-hd-body-lg text-hd-on-surface-variant max-w-xs">{l('Six mois pour pratiquer chaque jour les principes du Royaume.','Six months to practise the principles of the Kingdom every day.')}</p>
   {/* Illustration de la maquette Stitch : graine de sénevé qui germe */}
   <div className="relative w-36 h-36 my-hd-space-md flex items-center justify-center"><div className="absolute inset-0 rounded-full bg-hd-secondary-container/20 blur-md"/>
    <svg aria-hidden="true" className="w-32 h-32 relative z-10 text-hd-primary" fill="none" stroke="currentColor" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"> <circle cx="80" cy="80" opacity="0.45" r="72" stroke="currentColor" strokeDasharray="2 3" strokeWidth="0.75" /> <circle cx="80" cy="80" opacity="0.3" r="62" stroke="currentColor" strokeWidth="1" /> <path d="M46 118C62 115 98 115 114 118" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25" /> <path d="M74 114C74 110.5 77 107.5 80 107.5C83 107.5 86 110.5 86 114C86 117.5 83 119.5 80 119.5C77 119.5 74 117.5 74 114Z" fill="#E6C364" stroke="currentColor" strokeWidth="1.2" /> <path d="M80 107.5C79.5 96 82 82 78 64" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /> <path d="M78 72C70 69 61 73 59 81C67 82 75 79 78 72Z" fill="#F4EEDF" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.2" /> <path d="M77 73C71 75 66 77 60 80" opacity="0.6" stroke="currentColor" strokeWidth="0.75" /> <path d="M79 66C87 61 97 64 100 71C92 73 84 72 79 66Z" fill="#FED978" fill-opacity="0.3" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.2" /> <path d="M80 66C86 67 92 68 98 71" opacity="0.6" stroke="currentColor" strokeWidth="0.75" /> <circle cx="78" cy="56" fill="#755B00" r="1.5" /> </svg>
   </div>
   <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Un parcours pour mettre tes habitudes en pratique, pas à pas, avec des horaires adaptés à ton quotidien. Tu déclares toi-même les actions réalisées.','A journey to put your habits into practice, step by step, with a schedule adapted to your daily life. You report completed actions yourself.')}</p>
  </section>
  <section className="mb-hd-space-lg">
   <div className="flex items-baseline justify-between mb-hd-space-sm"><h2 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface">{l('Ce que tu vas pratiquer','What you will practise')}</h2><span className="font-hd-label-sm text-hd-label-sm text-hd-on-surface-variant">{l('8 disciplines','8 disciplines')}</span></div>
   <ul className="flex flex-col gap-2">{([['prayer_times','Trois prières par jour','Three prayers a day'],['menu_book','Bible matin et soir','Bible morning and evening'],['hearing','Lectures et prédication','Reading and preaching'],['favorite','Gratitude matin et soir','Gratitude morning and evening'],['directions_walk','Exercice doux','Gentle exercise'],['bedtime','Lever et coucher choisis','Chosen waking and bedtimes'],['church','Trois cultes par semaine','Three worship services a week'],['volunteer_activism','Engagements et dîme','Commitments and tithe']] as const).map(([i,fr,en])=><li key={i} className="w-full bg-hd-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm"><span className="w-10 h-10 rounded-full bg-hd-surface-container-low flex items-center justify-center shrink-0 text-hd-primary"><IconeHD nom={i} className="text-[20px]"/></span><span className="flex-1 min-w-0 font-hd-label-lg text-hd-label-lg text-hd-on-surface truncate">{l(fr,en)}</span><IconeHD nom="routine" className="text-hd-outline-variant text-[18px]"/></li>)}</ul>
  </section>
  <section className="mb-hd-space-lg">
   <h2 className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface mb-hd-space-sm">{l('Accès','Access')}</h2>
   <div className="w-full bg-hd-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
    <div className="flex items-start gap-3"><span className="w-6 h-6 rounded-full bg-hd-secondary-container/40 flex items-center justify-center shrink-0 mt-0.5 text-hd-primary"><IconeHD nom="check" className="text-[15px]"/></span><div className="flex-1 min-w-0"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface font-semibold">{l('30 premiers jours : gratuits','First 30 days: free')}</span><p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant mt-0.5">{l('Pour installer ton rythme, sans paiement.','To settle your rhythm, without payment.')}</p></div></div>
    <div className="w-full h-px bg-hd-surface-container"/>
    <div className="flex items-start gap-3"><span className="w-6 h-6 rounded-full bg-hd-surface-container flex items-center justify-center shrink-0 mt-0.5 text-hd-outline"><IconeHD nom="calendar_month" className="text-[15px]"/></span><div className="flex-1 min-w-0"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface font-semibold">{l('Mois 2 à 6 : paiement mois par mois','Months 2 to 6: paid month by month')}</span><p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant mt-0.5">{l('Tarif à venir. Tu décides chaque mois de payer ou non.','Price to come. Each month, you decide whether to pay.')}</p></div></div>
    <div className="mt-1 pt-2.5 flex items-center gap-2 text-hd-on-surface-variant"><IconeHD nom="verified_user" className="text-hd-primary text-[17px]"/><span className="font-hd-label-md text-hd-label-md font-medium">{l('Aucun paiement automatique.','No automatic payment.')}</span></div>
   </div>
  </section>
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
