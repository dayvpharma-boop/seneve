import {lazy,Suspense,useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {supabase} from '@/lib/supabase';
import {chargerMesLivres,cheminPdf,lienLivre,type LangueLivre,type MesLivres} from '@/lib/livre-fichiers';
import {IconeBibliotheque as I} from './IconeBibliotheque';
const LecteurPdfLivre=lazy(()=>import('./LecteurPdfLivre').then(m=>({default:m.LecteurPdfLivre})));
const LecteurAudioLivre=lazy(()=>import('./LecteurAudioLivre').then(m=>({default:m.LecteurAudioLivre})));

/** Page d'un format du livre : le lecteur pour un acheteur de ce format et de cette langue,
 * sinon l'invitation à l'acheter (décision de Dr Justin du 04/11/2026 : « seulement les acheteurs »). */
export function LivreFormatAcces({format,langue}:{format:'pdf'|'audio';langue:LangueLivre}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr,suffixe=en?'?lang=en':'';
 const pageDemandee=Number(useSearchParams()[0].get('page'))||undefined;
 const [droits,setDroits]=useState<MesLivres|null>(null),[userId,setUserId]=useState(''),[erreur,setErreur]=useState(false),[pdfUrl,setPdfUrl]=useState<string|null>(null);
 useEffect(()=>{let actif=true;void Promise.all([chargerMesLivres(),supabase.auth.getSession()]).then(([d,s])=>{if(!actif)return;setDroits(d);setUserId(s.data.session?.user.id??'');},()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[]);
 const autorise=!!droits?.[`${format}_${langue}`],autreLangue:LangueLivre=en?'fr':'en',autre=!!droits?.[`${format}_${autreLangue}`];
 useEffect(()=>{if(!autorise||format!=='pdf')return;let actif=true;void lienLivre(cheminPdf(langue),3600).then(u=>{if(actif)setPdfUrl(u);},()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[autorise,format,langue]);
 if(erreur)return <p role="alert" className="lf-message">{l('Impossible de vérifier ton accès au livre pour le moment. Vérifie ta connexion puis réessaie.','Unable to check your access to the book right now. Check your connection and try again.')}</p>;
 if(!droits)return <p role="status" className="lf-message">{l('Vérification de ton accès…','Checking your access…')}</p>;
 if(autorise)return <Suspense fallback={<p role="status" className="lf-message">{l('Ouverture…','Opening…')}</p>}>
  {format==='pdf'?(pdfUrl?<LecteurPdfLivre url={pdfUrl} cleMemoire={`seneve:livre-pdf:v1:${userId}:${langue}`} en={en} pageDemandee={pageDemandee&&pageDemandee>0?Math.floor(pageDemandee):undefined}/>:<p role="status" className="lf-message">{l('Ouverture du livre…','Opening the book…')}</p>)
   :<LecteurAudioLivre langue={langue} userId={userId}/>}
 </Suspense>;
 const nom=format==='pdf'?l('le livre numérique (PDF)','the digital book (PDF)'):l('le livre audio','the audiobook');
 return <section className="bl-card lf-reserve" aria-label={l('Accès réservé','Restricted access')}>
  <div className="lf-titre"><I nom="lock" taille={24}/><h2>{l('Réservé aux acheteurs','For buyers only')}</h2></div>
  <p>{l(`Pour lire ${nom} ici, achète-le avec la même adresse e-mail que ton compte SÉNEVÉ. Il s’ouvrira ensuite directement dans l’application.`,`To open ${nom} here, buy it with the same email address as your SÉNEVÉ account. It will then open right in the app.`)}</p>
  {autre&&<p className="lf-autre"><Link to={`/livre/${format}${en?'':'?lang=en'}`}>{en?'You bought the French edition: open it →':'Tu as acheté l’édition anglaise : l’ouvrir →'}</Link></p>}
  <div className="lf-actions"><Link className="bl-principal" to={`/offres${suffixe}`}>{l('Voir les offres','View the offers')}<I nom="east" taille={20}/></Link><Link to={`/acces${suffixe}`}>{l('Déjà acheté ? Consulter mes accès','Already bought? View my access')}</Link></div>
 </section>;
}
