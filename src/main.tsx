import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
// Polices hébergées avec le site (et non chez Google) : elles restent disponibles hors connexion.
import '@fontsource/lora/latin-400.css';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/latin-600.css';
import '@fontsource/lora/latin-500-italic.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-400-italic.css';
import '@fontsource/literata/latin-600.css';
import './styles.css';
import './styles-questions.css';
import { TestPage } from '@/routes/index';
import { Connexion } from '@/routes/connexion';
import { Espace } from '@/routes/espace';
import { NewPassword } from '@/routes/nouveau-mot-de-passe';
import { Journal } from '@/routes/journal';
import { Aide } from '@/routes/aide';
import { Admin } from '@/routes/admin';
import { Coach } from '@/routes/coach';
import { Progres } from '@/routes/progres';
import { Confidentialite } from '@/routes/confidentialite';
import { enregistrerServiceWorker } from '@/lib/hors-ligne';

enregistrerServiceWorker();

function NotFound() {
  return <main className="wrap"><p className="brand">SÉNEVÉ</p><h1>Page introuvable</h1><p>Cette page n'existe pas ou a été déplacée.</p><Link className="btn btn-link" to="/">Revenir au Test des 7 Racines</Link></main>;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/p" element={<TestPage defaultSource="partage" />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/espace" element={<Espace />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/progres" element={<Progres />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/nouveau-mot-de-passe" element={<NewPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
