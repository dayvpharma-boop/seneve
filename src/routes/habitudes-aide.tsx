import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {EmailMatinCard} from '@/components/EmailMatinCard';
import {IconeHD} from '@/components/IconeHabitudes';
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
import {habitudesActivees} from '@/lib/habitudes-configuration';
import {rappelsHabitudesActifs} from '@/lib/habitudes-rappels';
import {NotFound} from '@/routes/introuvable';
import '../styles-recette-habitudes.css';

/** Ce que SÉNEVÉ garde de chaque élément sensible. Textes vérifiés dans la base le 28/10/2026 :
 * journal lisible par son seul titulaire (politique journal_prive), coach limité aux notes autorisées
 * (claim_coach_jobs), demande d'aide limitée aux notes choisies (request_help), compteur dans seneve_private,
 * effacé 30 jours après la fin du parcours. Aucune promesse de stockage « sur le téléphone ». */
const CONFIDENTIALITE:{icone:string;fr:[string,string];en:[string,string]}[]=[
 {icone:'lock',fr:['Mes jours de fidélité : visibles par moi seul','Masqué par défaut. Aucun motif ni détail n’est enregistré, seulement la date de début de ta série. Aucun écran de l’équipe ni du coach ne l’affiche. Il est effacé 30 jours après la fin de ton parcours.'],en:['My faithful days: visible to me only','Hidden by default. No reason or detail is recorded, only the start date of your streak. No team or coach screen shows it. It is deleted 30 days after your journey ends.']},
 {icone:'edit_note',fr:['Mon journal : privé','Ton journal est enregistré sur ton compte. Dans SÉNEVÉ, toi seul peux le lire. Le coach ne lit que les notes pour lesquelles tu l’autorises, et l’équipe ne voit que les notes que tu choisis de joindre à une demande d’aide.'],en:['My journal: private','Your journal is saved to your account. In SÉNEVÉ, only you can read it. The coach only reads the notes you allow, and the team only sees the notes you choose to attach to a help request.']},
 {icone:'calculate',fr:['Calcul de dîme : non enregistré','Le calcul se fait sur ton téléphone. Aucun montant n’est enregistré ni envoyé, et aucun paiement n’est lancé.'],en:['Tithe calculation: not saved','The calculation runs on your phone. No amount is saved or sent, and no payment is started.']},
 {icone:'church',fr:['Cultes : « Je n’ai pas pu »','Rien n’est envoyé. Ta raison et ton mot ne vont dans ton journal que si tu choisis de les y enregistrer.'],en:['Worship: “I couldn’t go”','Nothing is sent. Your reason and your word only go to your journal if you choose to save them there.']},
];

/** Écran « Aide et confidentialité » d'Habitudes & Défis (maquette Stitch 11). Il rassemble des fonctions déjà
 * en service ; rien n'est enregistré par cette page elle-même. Pas de WhatsApp tant qu'il n'existe pas (décision
 * de Dr Justin du 28/10/2026). */
export function HabitudesAide(){
 const [q]=useSearchParams(),en=q.get('lang')==='en',langue=en?'en':'fr',l=(fr:string,english:string)=>en?english:fr,suffixe=en?'?lang=en':'',et=en?'&lang=en':'';
 const [enLigne,setEnLigne]=useState(()=>typeof navigator==='undefined'||navigator.onLine!==false);
 useEffect(()=>{document.title=l('Aide et confidentialité','Help and privacy')+' — SÉNEVÉ';document.documentElement.lang=langue;},[langue]);
 useEffect(()=>{const maj=()=>setEnLigne(navigator.onLine!==false);window.addEventListener('online',maj);window.addEventListener('offline',maj);return()=>{window.removeEventListener('online',maj);window.removeEventListener('offline',maj);};},[]);
 if(!habitudesActivees())return <NotFound/>;
 const lien='min-h-[48px] rounded-xl font-hd-label-lg text-hd-label-lg font-medium flex items-center justify-center gap-2 px-4';
 return <CadreHabitudes titre={l('Aide et confidentialité','Help and privacy')} langue={langue} retour={`/espace${suffixe}`} liens={{aujourdhui:`/espace${suffixe}`}}>
  <div className="px-hd-margin pt-hd-space-lg pb-hd-space-lg flex flex-col gap-hd-space-lg">
   <section aria-labelledby="hd-aide-titre" className="flex flex-col gap-hd-space-sm">
    <p className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary flex items-center gap-1"><IconeHD nom="spa" className="text-[14px]"/>{l('Habitudes & Défis · Assistance et réglages','Habits & Challenges · Support and settings')}</p>
    <h1 id="hd-aide-titre" className="font-hd-headline-md text-hd-headline-md text-hd-on-surface">{l('Aide et confidentialité','Help and privacy')}</h1>
    <p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">{l('Trouver de l’aide, régler tes rappels et savoir ce qui est protégé.','Find help, set your reminders and know what is protected.')}</p>
   </section>
   {!enLigne&&<p role="status" className="bg-hd-surface-container rounded-xl p-hd-space-md font-hd-body-sm text-hd-body-sm text-hd-on-surface flex items-start gap-2"><IconeHD nom="help" className="text-[18px] text-hd-secondary shrink-0"/>{l('Tu es hors connexion. Les informations de cette page restent lisibles ; l’aide, le coach et les réglages demandent une connexion.','You are offline. The information on this page stays readable; help, the coach and settings need a connection.')}</p>}

   <section aria-labelledby="hd-besoin-aide" className="flex flex-col gap-hd-space-sm">
    <h2 id="hd-besoin-aide" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface flex items-center gap-2"><IconeHD nom="support_agent" className="text-[20px] text-hd-secondary"/>{l('Besoin d’aide ?','Need help?')}</h2>
    <div className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm flex flex-col gap-2">
     <Link to={`/aide${suffixe}`} className={`${lien} bg-hd-secondary text-hd-on-secondary`}><IconeHD nom="edit_note" className="text-[18px]"/>{l('Demander de l’aide à l’équipe','Ask the team for help')}</Link>
     <Link to={`/coach${suffixe}`} className={`${lien} bg-hd-surface-container text-hd-on-surface`}><IconeHD nom="volunteer_activism" className="text-[18px]"/>{l('Parler au coach','Talk to the coach')}</Link>
     <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant italic">{l('Une personne de l’équipe te répondra. Le coach n’est pas inclus pendant les 30 jours gratuits.','A team member will reply to you. The coach is not included during the 30 free days.')}</p>
    </div>
   </section>

   <section aria-labelledby="hd-mes-rappels" className="flex flex-col gap-hd-space-sm">
    <h2 id="hd-mes-rappels" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface flex items-center gap-2"><IconeHD nom="spa" className="text-[20px] text-hd-secondary"/>{l('Mes rappels','My reminders')}</h2>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('Choisis comment recevoir les invitations à tes temps de prière et d’action.','Choose how to receive invitations to your times of prayer and action.')}</p>
    {rappelsHabitudesActifs()&&<RappelsHabitudes langue={langue}/>}
    <div className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm"><EmailMatinCard langue={langue} maquette/></div>
   </section>

   <section aria-labelledby="hd-confidentialite" className="flex flex-col gap-hd-space-sm">
    <h2 id="hd-confidentialite" className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface flex items-center gap-2"><IconeHD nom="verified_user" className="text-[20px] text-hd-secondary"/>{l('Confidentialité','Privacy')}</h2>
    <ul className="bg-hd-surface-container-lowest rounded-xl p-hd-space-md shadow-sm flex flex-col divide-y divide-hd-outline-variant/40">{CONFIDENTIALITE.map(c=><li key={c.icone} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
     <span className="w-9 h-9 rounded-full bg-hd-surface-container flex items-center justify-center text-hd-secondary shrink-0"><IconeHD nom={c.icone} className="text-[18px]"/></span>
     <span className="flex flex-col gap-0.5"><span className="font-hd-label-lg text-hd-label-lg text-hd-on-surface">{(en?c.en:c.fr)[0]}</span><span className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{(en?c.en:c.fr)[1]}</span></span>
    </li>)}</ul>
    <Link to={`/confidentialite${suffixe}`} className="self-start min-h-[44px] inline-flex items-center gap-1 font-hd-label-md text-hd-label-md text-hd-secondary underline underline-offset-4">{l('Lire la charte de confidentialité','Read the privacy charter')}<IconeHD nom="arrow_forward" className="text-[16px]"/></Link>
   </section>

   <section aria-labelledby="hd-mes-donnees" className="bg-hd-surface-container rounded-xl p-hd-space-md flex flex-col gap-2">
    <h2 id="hd-mes-donnees" className="font-hd-label-lg text-hd-label-lg text-hd-on-surface flex items-center gap-2"><IconeHD nom="delete" className="text-[18px] text-hd-secondary"/>{l('Mes données','My data')}</h2>
    <p className="font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant">{l('L’export et la suppression de ton compte passent par une demande à l’équipe, qui la traite pour toi.','Exporting and deleting your account go through a request to the team, who handle it for you.')}</p>
    <Link to={`/aide?motif=export-donnees${et}`} className={`${lien} bg-hd-surface-container-lowest text-hd-on-surface`}>{l('Demander l’export de mes données','Request an export of my data')}</Link>
    <Link to={`/aide?motif=suppression-compte${et}`} className={`${lien} bg-hd-surface-container-lowest text-hd-error`}><IconeHD nom="delete" className="text-[18px]"/>{l('Demander la suppression de mon compte','Request deletion of my account')}</Link>
   </section>
  </div>
 </CadreHabitudes>;
}
