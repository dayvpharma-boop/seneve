import {PhotosParticipant} from '@/components/AvatarParticipant';
import {suivrePreferencesVisuelles} from './lib/preferences-visuelles';
import {suivreApparence} from './lib/apparence';
import './styles-offres-acces.css';
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
import './styles-polices-validees.css';
import { TestPage } from '@/routes/index';
import { GarderLangue } from '@/components/GarderLangue';
import './styles-introuvable.css';
import { enregistrerServiceWorker } from '@/lib/hors-ligne';

// Pages chargées à la demande : seul le Test des 7 Racines (la page d'arrivée) reste dans le fichier principal.
// L'administration, que les participants n'ouvrent jamais, a son propre fichier avec ses styles.
const Connexion = lazy(() => import('@/routes/connexion').then(m => ({ default: m.Connexion })));
const NotFound = lazy(() => import('@/routes/introuvable').then(m => ({ default: m.NotFound })));
const Espace = lazy(() => import('@/routes/espace').then(m => ({ default: m.Espace })));
const Journal = lazy(() => import('@/routes/journal').then(m => ({ default: m.Journal })));
const Aide = lazy(() => import('@/routes/aide').then(m => ({ default: m.Aide })));
const Coach = lazy(() => import('@/routes/coach').then(m => ({ default: m.Coach })));
const Progres = lazy(() => import('@/routes/progres').then(m => ({ default: m.Progres })));
const Profil = lazy(() => import('@/routes/profil').then(m => ({ default: m.Profil })));
const Reglages = lazy(() => import('@/routes/reglages').then(m => ({ default: m.Reglages })));
const Habitudes = lazy(() => import('@/routes/habitudes').then(m => ({ default: m.Habitudes })));
const HabitudesInscription = lazy(() => import('@/routes/habitudes-inscription').then(m => ({ default: m.HabitudesInscription })));
const HabitudesAujourdhui = lazy(() => import('@/routes/habitudes-aujourdhui').then(m => ({ default: m.HabitudesAujourdhui })));
const HabitudesEngagements = lazy(() => import('@/routes/habitudes-engagements').then(m => ({ default: m.HabitudesEngagements })));
const HabitudesAide = lazy(() => import('@/routes/habitudes-aide').then(m => ({ default: m.HabitudesAide })));
const Offres = lazy(() => import('@/routes/offres').then(m => ({ default: m.Offres })));
const Bibliotheque = lazy(() => import('@/routes/bibliotheque').then(m => ({ default: m.Bibliotheque })));
const Confidentialite = lazy(() => import('@/routes/confidentialite').then(m => ({ default: m.Confidentialite })));
const NewPassword = lazy(() => import('@/routes/nouveau-mot-de-passe').then(m => ({ default: m.NewPassword })));
const ForgotPassword = lazy(() => import('@/routes/mot-de-passe-oublie').then(m => ({ default: m.ForgotPassword })));
const Admin = lazy(() => import('@/routes/admin').then(m => ({ default: m.Admin })));
const bible = () => import('@/routes/bible');
const BibleAccueil = lazy(() => bible().then(m => ({ default: m.BibleAccueil })));
const BibleLivres = lazy(() => bible().then(m => ({ default: m.BibleLivres })));
const BibleLecture = lazy(() => bible().then(m => ({ default: m.BibleLecture })));
const BibleRecherche = lazy(() => bible().then(m => ({ default: m.BibleRecherche })));
const BibleAnnotations = lazy(() => bible().then(m => ({ default: m.BibleAnnotations })));

suivreApparence();
suivrePreferencesVisuelles();
enregistrerServiceWorker();

const root = document.getElementById('root');
if (root) createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <PhotosParticipant><GarderLangue />
      <Suspense fallback={null}><Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/p" element={<TestPage defaultSource="partage" />} />
        <Route path="/en" element={<TestPage defaultLanguage="en" />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/habitudes/inscription" element={<HabitudesInscription />} />
        <Route path="/habitudes/aujourdhui" element={<HabitudesAujourdhui />} />
        <Route path="/habitudes/engagements" element={<HabitudesEngagements />} />
        <Route path="/habitudes/aide" element={<HabitudesAide />} />
        <Route path="/bibliotheque" element={<Bibliotheque/>}/>
        <Route path="/livre" element={<Bibliotheque detail/>}/>
        <Route path="/livre/audio" element={<Bibliotheque detail format="audio"/>}/>
        <Route path="/livre/pdf" element={<Bibliotheque detail format="pdf"/>}/>
        <Route path="/bible" element={<BibleAccueil/>}/>
        <Route path="/bible/livres" element={<BibleLivres/>}/>
        <Route path="/bible/recherche" element={<BibleRecherche/>}/>
        <Route path="/bible/annotations" element={<BibleAnnotations/>}/>
        <Route path="/bible/:livre/:chapitre" element={<BibleLecture/>}/>
        <Route path="/habitudes" element={<Habitudes/>}/>
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
      </Routes></Suspense></PhotosParticipant>
    </BrowserRouter>
  </StrictMode>,
);

import './styles-journee-nouvelle.css';

import './styles-profil.css';
import './styles-mode-sombre.css';
import './styles-bibliotheque.css';
import './styles-bible.css';

import './styles-resultat-stitch.css';

import './styles-profil-preferences.css';
import './styles-preferences.css';

import './styles-avatar-participant.css';
import './styles-espace-vivant.css';

import './styles-illustrations-pages.css';
import './styles-habitudes-stitch.css';
import './styles-habitudes-polices.css';
