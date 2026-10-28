import {HorairesHabitudes} from '@/components/HorairesHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
import {useEnLigne} from '@/lib/hors-ligne';
import {IconeJournee} from '@/components/IconeJournee';
import {FuseauVoyage} from '@/components/FuseauVoyage';
import {rappelsHabitudesActifs} from '@/lib/habitudes-rappels';
import { IllustrationPage } from '@/components/IllustrationPage';
import {AvatarParticipant} from '@/components/AvatarParticipant';
import {Apparence} from '@/components/Apparence';
import {IconeFinitions} from '@/components/IconeFinitions';
import {useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {EmailMatinCard} from '@/components/EmailMatinCard';
import {WhatsAppLink} from '@/components/WhatsAppLink';
import {CodePlaceCard} from '@/components/CodePlaceCard';
import {IconeJourneeSuite as I} from '@/components/IconeJourneeSuite';
import {IconeConfidentialite as C} from '@/components/IconeConfidentialite';

const TEXTES = {
 fr: { titre: 'Mes réglages', retour: 'Revenir à ma journée', tag: 'Préférences & accès', intro: 'Personnalise tes rappels et gère l’accès à tes parcours.', rythme: 'Le rythme quotidien', pas: 'Un petit pas fidèle, chaque jour.', modifier: 'Modifier l’adresse', adresse: 'Pour changer l’adresse de ton compte, contacte l’équipe SÉNEVÉ.', contacter: 'Contacter l’équipe', chargement: 'Chargement de tes réglages…', navigation: 'Offres et accès', bibliotheque: 'Ma bibliothèque', parcours: 'Découvrir les parcours', acces: 'Mes accès', profil: 'Mon profil', prive: 'Tu choisis tes canaux de contact. Tes coordonnées restent dans ton espace personnel.', pied: 'SÉNEVÉ · Un pas chaque jour' },
 en: { titre: 'My settings', retour: 'Back to my day', tag: 'Preferences & access', intro: 'Personalise your reminders and manage access to your journeys.', rythme: 'The daily rhythm', pas: 'A small faithful step, every day.', modifier: 'Change the address', adresse: 'To change your account’s email address, contact the SÉNEVÉ team.', contacter: 'Contact the team', chargement: 'Loading your settings…', navigation: 'Offers and access', bibliotheque: 'My library', parcours: 'Discover the journeys', acces: 'My access', profil: 'My profile', prive: 'You choose your contact channels. Your details stay in your personal space.', pied: 'SÉNEVÉ · One step every day' },
} as const;

export function Reglages(){
 const navigate=useNavigate();
 const[params]=useSearchParams();
 const[pret,setPret]=useState(false);
 const enLigne=useEnLigne();
 const[langue,setLangue]=useState(params.get('lang')==='en'?'en':'fr');
 const T=TEXTES[langue==='en'?'en':'fr'];
 const suffixe=langue==='en'?'?lang=en':'';
 useEffect(()=>{let actif=true;void supabase.auth.getSession().then(async({data})=>{if(!actif)return;if(!data.session){navigate('/connexion',{replace:true});return;}
  // Sans ?lang=en dans l'adresse, la page suit la langue du compte.
  if(!params.get('lang')){const p=await Promise.resolve(supabase.from('participants').select('langue').maybeSingle()).catch(()=>null);if(actif&&p&&!p.error&&p.data?.langue==='en')setLangue('en');}
  if(actif)setPret(true);});return()=>{actif=false;};},[navigate,params]);
 useEffect(()=>{document.title=`${T.titre} — SÉNEVÉ`;document.documentElement.lang=langue;},[T,langue]);
 return <main className="rn-page journee-nouvelle"><header className="rn-barre"><Link to="/espace" aria-label={T.retour}><IconeFinitions nom="arrow_back_ios_new"/></Link><strong>{T.titre}</strong><span className="rn-profil"><AvatarParticipant><C nom="person" taille={18}/></AvatarParticipant></span></header><div className="rn-contenu"><p className="jn-tag">{T.tag}</p><h1>{T.titre}</h1><p>{T.intro}</p><IllustrationPage theme="reglages" langue={langue} />{pret&&!enLigne?<div className="hc-bandeau" role="status"><IconeJournee nom="wifi_off" taille={20}/><p>{langue==='en'?'You are offline. Your reminders and settings need a connection: reconnect to view or change them. Nothing has been changed.':'Tu es hors connexion. Tes rappels et tes réglages demandent une connexion : reconnecte-toi pour les voir ou les modifier. Rien n’a été changé.'}</p></div>:pret?<>{habitudesActivees()&&params.get('parcours')&&<>{rappelsHabitudesActifs()&&<FuseauVoyage langue={langue}/>}<HorairesHabitudes key={params.get('parcours')} enrollmentId={params.get('parcours')!} langue={langue}/>{rappelsHabitudesActifs()&&<RappelsHabitudes langue={langue}/>}</>}<section className="rn-section rn-email"><C nom="mail"/><EmailMatinCard langue={langue} maquette/><details className="rn-adresse"><summary>{T.modifier}</summary><p>{T.adresse}</p><Link to="/aide">{T.contacter}</Link></details></section><section className="rn-section rn-whatsapp"><I nom="chat"/><WhatsAppLink maquette langue={langue}/></section><section className="rn-section rn-place"><I nom="confirmation_number"/><CodePlaceCard langue={langue} onOuvert={()=>navigate('/espace')}/></section></>:<p role="status">{T.chargement}</p>}<nav aria-label={T.navigation}><Link className="oa-secondary" to={`/bibliotheque${suffixe}`}>{T.bibliotheque}</Link><Link className="oa-secondary" to={`/offres${suffixe}`}>{T.parcours}</Link><Link className="oa-secondary" to={`/acces${suffixe}`}>{T.acces}</Link></nav><Apparence langue={langue}/><Link className="oa-secondary" to={`/profil${suffixe}`}>{T.profil}</Link><p className="rn-prive"><C nom="lock" taille={16}/>{T.prive}</p><footer className="rn-pied">{T.pied}</footer></div></main>;
}
