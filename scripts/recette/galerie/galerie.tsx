// Galerie de recette visuelle HD : vrais composants, données fictives, heure figée à 12 h 45 (Kinshasa).
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
import {CadreHabitudes} from '@/components/CadreHabitudes';
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
import {InscriptionHabitudes} from '@/components/InscriptionHabitudes';
import {rythmeProposeHabitudes} from '@/lib/habitudes-rythme-propose';
const configuration={compteId:'GALERIE',programmeId:'GALERIE',version:1,langue:'fr',offreId:'GALERIE',fuseau:'Africa/Kinshasa',planning:rythmeProposeHabitudes.map(h=>({habit_key:h.habit_key,libelle:h.libelle,creneaux:[{creneau_id:'principal',heure_locale:h.heure_proposee!.slice(0,5),jours_iso:[...h.jours_iso]}]}))};
const T=Date.parse('2026-10-26T11:45:00Z');Date.now=()=>T;
const E='11111111-1111-4111-8111-111111111111',P='33333333-3333-4333-8333-333333333333';
const ecrans:Record<string,()=>ReactElement>={
 horaires:()=><CadreHabitudes titre="Habitudes & Défis" langue="fr" retour="/" retourLibelle="Revenir aux offres" avecNavigation={false}><div className="flex flex-col w-full px-hd-margin pt-hd-space-md pb-hd-space-lg"><InscriptionHabitudes configuration={configuration}/></div></CadreHabitudes>,
 aujourdhui:()=><CadreHabitudes titre="Aujourd’hui" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><ActivitesJourRecette enrollmentId={E} participantId={P} dateLocale="2026-10-26" langue="fr" fuseau="Africa/Kinshasa"/></CadreHabitudes>,
};
const nom=decodeURIComponent(location.hash.slice(1)),Ecran=ecrans[nom];
createRoot(document.getElementById('root')!).render(<MemoryRouter>{Ecran?<Ecran/>:<ul>{Object.keys(ecrans).map(n=><li key={n}><a href={'#'+n}>{n}</a></li>)}</ul>}</MemoryRouter>);
setTimeout(()=>{document.body.dataset.pret='1';},800);
