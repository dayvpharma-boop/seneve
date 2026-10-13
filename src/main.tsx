import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './styles.css';
import { TestPage } from '@/routes/index';
import { Connexion } from '@/routes/connexion';
import { Espace } from '@/routes/espace';
import { NewPassword } from '@/routes/nouveau-mot-de-passe';
import { Journal } from '@/routes/journal';
import { Aide } from '@/routes/aide';
import { Admin } from '@/routes/admin';

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
        <Route path="/nouveau-mot-de-passe" element={<NewPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
