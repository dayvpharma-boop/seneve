import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {chargerCatalogueInscription,type CatalogueInscriptionHabitudes} from '@/lib/habitudes-catalogue-api';
import {InscriptionHabitudes} from '@/components/InscriptionHabitudes';

export function HabitudesInscription(){
 const [q]=useSearchParams(),langue=q.get('lang')==='en'?'en':'fr';
 const l=(fr:string,en:string)=>langue==='en'?en:fr;
 useEffect(()=>{document.title=l('Inscription · Habitudes & Défis','Enrollment · Habits & Challenges')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 return <main className="rn-page"><div className="rn-contenu"><Link to={`/offres?lang=${langue}`}>{l('Revenir aux offres','Back to offers')}</Link><h1>{l('Habitudes & Défis','Habits & Challenges')}</h1>{habitudesActivees()?<CatalogueConnecte langue={langue}/>:<p>{l('L’inscription à ce parcours est en préparation.','Enrollment in this journey is being prepared.')}</p>}</div></main>;
}
function CatalogueConnecte({langue}:{langue:string}){
 const l=(fr:string,en:string)=>langue==='en'?en:fr;
 const [compte,setCompte]=useState<string|null|undefined>(undefined),[erreurSession,setErreurSession]=useState(false),[tour,setTour]=useState(0);
 const [charge,setCharge]=useState<{contexte:string;catalogue?:CatalogueInscriptionHabitudes;erreur?:boolean}|null>(null);
 const sequence=useRef(0),compteCourant=useRef<string|null|undefined>(undefined);
 useEffect(()=>{
  let actif=true,revision=0;setCompte(undefined);setErreurSession(false);
  const auth=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(actif){const id=session?.user.id??null;if(compteCourant.current!==id){compteCourant.current=id;sequence.current++;setCharge(null);setCompte(id);}setErreurSession(false);}});
  const n=revision;void supabase.auth.getSession().then(({data,error})=>{if(actif&&n===revision){if(error)setErreurSession(true);else{compteCourant.current=data.session?.user.id??null;setCompte(compteCourant.current);}}}).catch(()=>{if(actif&&n===revision)setErreurSession(true);});
  return()=>{actif=false;sequence.current++;auth.data.subscription.unsubscribe();};
 },[]);
 const contexte=JSON.stringify([compte,langue,tour]);
 useEffect(()=>{const n=++sequence.current;setCharge(null);if(!compte)return;void chargerCatalogueInscription(langue,compte).then(catalogue=>{if(n===sequence.current)setCharge({contexte,catalogue});}).catch(()=>{if(n===sequence.current)setCharge({contexte,erreur:true});});return()=>{sequence.current++;};},[compte,langue,tour,contexte]);
 if(erreurSession)return <p role="alert">{l('Ton compte ne peut pas être vérifié. Recharge la page.','Your account cannot be verified. Reload the page.')}</p>;
 if(compte===null)return <section className="rn-section"><p>{l('Connecte-toi pour vérifier la disponibilité de tes 30 jours gratuits.','Sign in to check the availability of your 30 free days.')}</p><Link className="oa-primary" to={`/connexion?lang=${langue}`}>{l('Se connecter','Sign in')}</Link></section>;
 if(compte===undefined||charge?.contexte!==contexte)return <p role="status">{l('Vérification de ton accès…','Checking your access…')}</p>;
 if(charge.erreur)return <section className="rn-section"><p role="alert">{l('L’offre ne peut pas être vérifiée pour le moment.','The offer cannot be verified right now.')}</p><button type="button" onClick={()=>setTour(t=>t+1)}>{l('Réessayer','Try again')}</button></section>;
 const c=charge.catalogue!;
 if(c.motif==='gratuite_deja_utilisee')return <section className="rn-section"><p>{l('Ton accès gratuit a déjà été utilisé. Ses dates sont conservées.','Your free access has already been used. Its dates are preserved.')}</p><Link className="oa-primary" to={`/acces?lang=${langue}`}>{l('Consulter mes accès','View my access')}</Link></section>;
 if(!c.offres.length)return <p>{l('Aucune offre de 30 jours gratuits n’est ouverte à l’inscription pour ton compte actuellement.','No 30-day free offer is currently open for enrollment for your account.')}</p>;
 return <>{c.offres.map(o=><section key={JSON.stringify([o.programme_id,o.version,o.offre_id])}><h2>{o.nom}</h2><InscriptionHabitudes configuration={{compteId:compte,programmeId:o.programme_id,version:o.version,langue:o.langue,offreId:o.offre_id,fuseau:c.fuseau,planning:o.planning}}/></section>)}</>;
}
