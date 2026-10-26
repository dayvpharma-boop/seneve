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
const T=Date.parse('2026-10-26T11:45:00Z');Date.now=()=>T;
const E='11111111-1111-4111-8111-111111111111',P='33333333-3333-4333-8333-333333333333';
const ecrans:Record<string,()=>ReactElement>={
 aujourdhui:()=><CadreHabitudes titre="Aujourd’hui" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/'}}><ActivitesJourRecette enrollmentId={E} participantId={P} dateLocale="2026-10-26" langue="fr" fuseau="Africa/Kinshasa"/></CadreHabitudes>,
};
const nom=decodeURIComponent(location.hash.slice(1)),Ecran=ecrans[nom];
createRoot(document.getElementById('root')!).render(<MemoryRouter>{Ecran?<Ecran/>:<ul>{Object.keys(ecrans).map(n=><li key={n}><a href={'#'+n}>{n}</a></li>)}</ul>}</MemoryRouter>);
setTimeout(()=>{document.body.dataset.pret='1';},800);
