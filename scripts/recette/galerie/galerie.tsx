// Galerie de recette visuelle HD : vrais composants, données fictives, heure figée à 12 h 45 (Kinshasa).
import {Espace} from '@/routes/espace';
import {Progres} from '@/routes/progres';
import '@/styles-maquettes.css';
import '@/styles-aujourdhui.css';
import '@/styles-journee-nouvelle.css';
import '@/styles-parcours-maquette.css';
import '@/styles-espace-vivant.css';
import '@/styles-illustrations-pages.css';
import '@/styles-preferences.css';
import '@/styles-polices-validees.css';
import '@/styles-mode-sombre.css';
import '@/styles-bleu-lavande.css';
import type {ReactElement} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-500.css';
import '@fontsource/literata/latin-600.css';
import '@fontsource/literata/latin-400-italic.css';
import '@/styles.css';
import '@/styles-recette-habitudes.css';
import '@/styles-habitudes-stitch.css';
import '@/styles-habitudes-polices.css';
import '@/styles-bleu-lavande.css';
document.documentElement.dataset.palette='ivoire';
document.documentElement.dataset.apparence=new URLSearchParams(location.search).get('mode')==='sombre'?'sombre':'clair';
document.documentElement.style.setProperty('--texte-echelle',new URLSearchParams(location.search).get('taille')==='grande'?'1.25':'1');
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
import {InscriptionHabitudes} from '@/components/InscriptionHabitudes';
import {SimulateurDime} from '@/components/SimulateurDime';
import {HistoriqueRecetteHabitudes} from '@/components/HistoriqueRecetteHabitudes';
import {AccesGratuitHabitudes} from '@/components/AccesGratuitHabitudes';
import {HabitudesInscription} from '@/routes/habitudes-inscription';
import {HabitudesEngagements} from '@/routes/habitudes-engagements';
import {RappelsHabitudes} from '@/components/RappelsHabitudes';
import {FuseauVoyage} from '@/components/FuseauVoyage';
import {IconeHD} from '@/components/IconeHabitudes';
import {rythmeProposeHabitudes} from '@/lib/habitudes-rythme-propose';
const configuration={compteId:'GALERIE',programmeId:'GALERIE',version:1,langue:'fr',offreId:'GALERIE',fuseau:'Africa/Kinshasa',planning:rythmeProposeHabitudes.map(h=>({habit_key:h.habit_key,libelle:h.libelle,creneaux:[{creneau_id:'principal',heure_locale:h.heure_proposee!.slice(0,5),jours_iso:[...h.jours_iso]}]}))};
const T=Date.parse('2026-10-26T11:45:00Z');Date.now=()=>T;
const E='11111111-1111-4111-8111-111111111111',P='33333333-3333-4333-8333-333333333333';
const ecrans:Record<string,()=>ReactElement>={
 'design-espace':()=> <Espace/>,
 'design-progres':()=> <Progres/>,
 horaires:()=><CadreHabitudes titre="Sénevé" sousTitreCentre="Habitudes & Défis" langue="fr" retour="/" retourLibelle="Revenir aux offres" avecNavigation={false}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg"><InscriptionHabitudes configuration={configuration}/></div></CadreHabitudes>,
 presentation:()=><HabitudesInscription/>,
 // Compteur de fidélité : masqué par défaut, affiché, puis fenêtre de déclaration ouverte (construire avec VITE_HABITUDES_COMPTEUR=true).
 engagements:()=><HabitudesEngagements/>,
 'engagements-visible':()=><HabitudesEngagements/>,
 'engagements-declaration-visible':()=><HabitudesEngagements/>,
 // Réglage des rappels d'habitudes, dans le cadre de la page Mes réglages (styles chargés pour ces écrans seulement).
 rappels:()=><main className="rn-page journee-nouvelle"><RappelsHabitudes langue="fr"/></main>,
 'rappels-actif':()=><main className="rn-page journee-nouvelle"><RappelsHabitudes langue="fr"/></main>,
 // Voyage : question « Garder tes horaires à l'heure d'ici ? » en haut de l'écran Aujourd'hui.
 fuseau:()=><CadreHabitudes titre="Aujourd’hui" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><div className="px-hd-margin pt-hd-space-md"><FuseauVoyage langue="fr"/></div></CadreHabitudes>,
 acces:()=>{const debut=new Date(T-11*864e5),fin=new Date(+debut+720*3600000);const D='22222222-2222-4222-8222-222222222222';
  return <CadreHabitudes titre="Mes accès" langue="fr" actif="parcours" liens={{parcours:'/'}}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg"><AccesGratuitHabitudes droit={{entitlement_id:D,offre_id:'GALERIE',etat:'actif',debut:debut.toISOString(),fin:fin.toISOString()}} periode={{enrollment_id:E,entitlement_id:D,debut:debut.toISOString(),fin_exclue:fin.toISOString()}} inscription={{enrollment_id:E,entitlement_id:D,programme_id:'GALERIE',date_debut:debut.toISOString().slice(0,10),etat:'active'}} langue="fr" fuseau="Africa/Kinshasa"/></div></CadreHabitudes>;},
 bilan:()=><CadreHabitudes titre="Bilan" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><div className="flex flex-col w-full px-hd-margin pb-hd-space-lg"><HistoriqueRecetteHabitudes enrollmentId={E} participantId={P} dateLocale="2026-10-26" langue="fr" revision={0}/></div></CadreHabitudes>,
 dime:()=><CadreHabitudes titre="Dîme et offrande" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg gap-hd-space-md">
  <div className="flex flex-col gap-1"><span className="font-hd-label-sm text-hd-label-sm uppercase tracking-widest text-hd-secondary">Habitudes &amp; Défis · Gestion fidèle</span><h1 className="font-hd-headline-lg text-hd-headline-lg text-hd-on-surface">Dîme et offrande</h1><p className="font-hd-body-md text-hd-body-md text-hd-on-surface-variant">Comprendre et calculer, sans obligation ni paiement.</p></div>
  <SimulateurDime langue="fr" ouvert/>
 </div></CadreHabitudes>,
 aujourdhui:()=><CadreHabitudes titre="Aujourd’hui" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><ActivitesJourRecette enrollmentId={E} participantId={P} dateLocale="2026-10-26" langue="fr" fuseau="Africa/Kinshasa"/></CadreHabitudes>,
};
const nom=decodeURIComponent(location.hash.slice(1)),Ecran=ecrans[nom];
if(nom.startsWith('rappels')){void import('@/styles-journee-nouvelle.css');void import('@/styles-mode-sombre.css');}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[(nom==='design-progres'?'/progres':'/espace')+location.search]}>{Ecran?<Ecran/>:<ul>{Object.keys(ecrans).map(n=><li key={n}><a href={'#'+n}>{n}</a></li>)}</ul>}</MemoryRouter>);
// Écran dîme : on remplit l'exemple du cahier (commerce 1000 / 650 / 150) comme le ferait un participant.
function saisir(sel:string,valeur:string){const el=document.querySelector(sel) as HTMLInputElement|HTMLSelectElement|null;if(!el)return;const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,valeur);el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));}
setTimeout(()=>{
 if(nom==='engagements-declaration-visible'){[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Faire une déclaration'))?.click();setTimeout(()=>{document.body.dataset.pret='1';},200);}
 else if(nom==='dime'){(document.querySelector('[role=radio]') as HTMLButtonElement)?.click();
  setTimeout(()=>{saisir('#hd-dime-periode','semaine');saisir('#hd-dime-recu','1000');saisir('#hd-dime-cout','650');saisir('#hd-dime-charges','150');
   setTimeout(()=>{(document.querySelector('.hd-simulateur form button[type=submit]') as HTMLButtonElement)?.click();setTimeout(()=>{document.body.dataset.pret='1';},300);},200);},200);}
 else if(nom==='bilan'){(document.querySelector('.hd-historique-recette>button') as HTMLButtonElement)?.click();setTimeout(()=>{document.querySelectorAll('.hd-historique-recette details').forEach((d,i)=>{if(i<2)(d as HTMLDetailsElement).open=true;});document.body.dataset.pret='1';},500);}
 else document.body.dataset.pret='1';
},800);
