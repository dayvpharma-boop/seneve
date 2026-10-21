import {Bibliotheque} from './routes/bibliotheque';
import {Profil} from './routes/profil';
import {suivreApparence} from './lib/apparence';
import {Offres} from './routes/offres';
import './styles-offres-acces.css';
import {Reglages} from './routes/reglages';
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
// Polices hébergées avec le site (et non chez Google) : elles restent disponibles hors connexion.
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/latin-600.css';
import '@fontsource/lora/latin-500-italic.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './styles.css';
import './styles-maquettes.css';
import './styles-journal.css';
import './styles-aujourdhui.css';
import './styles-lecture.css';
import './styles-accueil-couleurs.css';
import './styles-resultat.css';
import './styles-aujourdhui-suite.css';
import './styles-etats-espace.css';
import './styles-erreur-maquette.css';
import './styles-hors-connexion.css';
import './styles-auth-maquette.css';
import './styles-recuperation.css';
import './styles-decouverte-accueil.css';
import './styles-lecture-seance.css';
import './styles-parcours-maquette.css';
import './styles-journal-nouveau.css';
import './styles-aide-maquette.css';
import './styles-coach-maquette.css';
import './styles-fin-parcours.css';
import './styles-resultat-partage.css';
import './styles-confidentialite-maquette.css';
import './styles-pilotage-maquette.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-400-italic.css';
import '@fontsource/literata/latin-600.css';
import { TestPage } from '@/routes/index';
import { Connexion } from '@/routes/connexion';
import { Espace } from '@/routes/espace';
import { NewPassword } from '@/routes/nouveau-mot-de-passe';
import { ForgotPassword } from '@/routes/mot-de-passe-oublie';
import { Journal } from '@/routes/journal';
import { Aide } from '@/routes/aide';
import { Admin } from '@/routes/admin';
import { Coach } from '@/routes/coach';
import { Progres } from '@/routes/progres';
import { NotFound } from '@/routes/introuvable';
import './styles-introuvable.css';
import './styles-administration-tableau.css';
import './styles-administration-bureau.css';
import './styles-administration-mobile.css';
import './styles-tableau-fidele.css';
import { Confidentialite } from '@/routes/confidentialite';
import { enregistrerServiceWorker } from '@/lib/hors-ligne';

// La Bible n'est chargée que lorsqu'on l'ouvre : le reste du site reste aussi léger qu'avant.
const bible = () => import('@/routes/bible');
const BibleAccueil = lazy(() => bible().then(m => ({ default: m.BibleAccueil })));
const BibleLivres = lazy(() => bible().then(m => ({ default: m.BibleLivres })));
const BibleLecture = lazy(() => bible().then(m => ({ default: m.BibleLecture })));
const BibleRecherche = lazy(() => bible().then(m => ({ default: m.BibleRecherche })));
const BibleAnnotations = lazy(() => bible().then(m => ({ default: m.BibleAnnotations })));

suivreApparence();
enregistrerServiceWorker();

const root = document.getElementById('root');
if (root) createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Suspense fallback={null}><Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/p" element={<TestPage defaultSource="partage" />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/bibliotheque" element={<Bibliotheque/>}/>
        <Route path="/livre" element={<Bibliotheque detail/>}/>
        <Route path="/livre/audio" element={<Bibliotheque detail format="audio"/>}/>
        <Route path="/livre/pdf" element={<Bibliotheque detail format="pdf"/>}/>
        <Route path="/bible" element={<BibleAccueil/>}/>
        <Route path="/bible/livres" element={<BibleLivres/>}/>
        <Route path="/bible/recherche" element={<BibleRecherche/>}/>
        <Route path="/bible/annotations" element={<BibleAnnotations/>}/>
        <Route path="/bible/:livre/:chapitre" element={<BibleLecture/>}/>
        <Route path="/offres" element={<Offres/>}/><Route path="/acces" element={<Offres mode="acces"/>}/><Route path="/paiement" element={<Offres mode="paiement"/>}/><Route path="/reglages" element={<Reglages/>}/>
        <Route path="/profil" element={<Profil/>}/><Route path="/espace" element={<Espace />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/progres" element={<Progres />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/nouveau-mot-de-passe" element={<NewPassword />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes></Suspense>
    </BrowserRouter>
  </StrictMode>,
);

import './styles-registres-administration.css';
import './styles-registres-fideles.css';

import './styles-edition-administration.css';

import './styles-journee-nouvelle.css';

import './styles-profil.css';
import './styles-mode-sombre.css';
import './styles-bibliotheque.css';
import './styles-bible.css';
