import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { GarderLangue, langueDeLAdresse } from '@/components/GarderLangue';

function Adresse() { const l = useLocation(); return <p data-testid="adresse">{l.pathname + l.search}</p>; }
function monter(depart: string) {
  render(<MemoryRouter initialEntries={[depart]}><GarderLangue /><Adresse />
    <Routes><Route path="*" element={<nav><Link to="/offres">offres</Link><Link to="/aide?motif=livre-pdf">aide</Link><Link to="/connexion?lang=fr">français</Link><Link to="/admin">admin</Link></nav>} /></Routes>
  </MemoryRouter>);
}
// Signalé le 24/10/2026 : depuis une page anglaise, certains liens ouvraient la page suivante en français.
describe('La langue anglaise suit la personne de page en page', () => {
  afterEach(cleanup);
  it('lit la langue de l’adresse', () => {
    expect(langueDeLAdresse('/bible', '?lang=en')).toBe('en');
    expect(langueDeLAdresse('/en', '')).toBe('en');
    expect(langueDeLAdresse('/', '?lang=fr')).toBe('fr');
    expect(langueDeLAdresse('/offres', '')).toBeNull();
  });
  it('un lien sans langue depuis une page anglaise reste en anglais', () => {
    monter('/bibliotheque?lang=en');
    fireEvent.click(screen.getByText('offres'));
    expect(screen.getByTestId('adresse')).toHaveTextContent('/offres?lang=en');
  });
  it('garde les autres paramètres', () => {
    monter('/livre?lang=en');
    fireEvent.click(screen.getByText('aide'));
    expect(screen.getByTestId('adresse')).toHaveTextContent('/aide?motif=livre-pdf&lang=en');
  });
  it('depuis /en (test anglais) aussi', () => {
    monter('/en');
    fireEvent.click(screen.getByText('offres'));
    expect(screen.getByTestId('adresse')).toHaveTextContent('/offres?lang=en');
  });
  it('le choix « Français » est respecté', () => {
    monter('/connexion?lang=en');
    fireEvent.click(screen.getByText('français'));
    expect(screen.getByTestId('adresse')).toHaveTextContent('/connexion?lang=fr');
  });
  it('en français, rien n’est ajouté', () => {
    monter('/bibliotheque');
    fireEvent.click(screen.getByText('offres'));
    expect(screen.getByTestId('adresse')).toHaveTextContent(/^\/offres$/);
  });
  it('l’administration n’est pas concernée', () => {
    monter('/bible?lang=en');
    fireEvent.click(screen.getByText('admin'));
    expect(screen.getByTestId('adresse')).toHaveTextContent(/^\/admin$/);
  });
});
