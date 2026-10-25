import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter,Routes,Route } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { Confidentialite, DATE_POLITIQUE } from '@/routes/confidentialite';

afterEach(cleanup);

// Politique de confidentialité validée par Dr Justin Tshims le 18/10/2026.
describe('Politique de confidentialité', () => {
  it('nomme le responsable, le contact, la date et l’âge minimum', () => {
    render(<MemoryRouter><Confidentialite /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeInTheDocument();
    expect(screen.getByText(/Cabinet Bethesda du Dr Justin Tshims, à Kinshasa/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'contact@drjustintshims.com' })[0]).toHaveAttribute('href', 'mailto:contact@drjustintshims.com');
    expect(screen.getByText(`Dernière mise à jour : ${DATE_POLITIQUE}`)).toBeInTheDocument();
    expect(screen.getByText(/au moins 18 ans/)).toBeInTheDocument();
    expect(document.title).toBe('Confidentialité — SÉNEVÉ');
  });
  it('présente le journal comme privé et le coach comme une IA', () => {
    render(<MemoryRouter><Confidentialite /></MemoryRouter>);
    expect(screen.getByText(/Tes notes sont privées/)).toBeInTheDocument();
    expect(screen.getByText(/Le coach est une intelligence artificielle, pas une personne/)).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });
});

it('propose des demandes par e-mail à la vraie adresse, sans export ou suppression simulés',()=>{render(<MemoryRouter><Confidentialite/></MemoryRouter>);expect(screen.getByRole('link',{name:'Demander la suppression de mes données'})).toHaveAttribute('href','mailto:contact@drjustintshims.com?subject=Demande%20de%20suppression%20de%20mes%20donn%C3%A9es');expect(screen.getByRole('link',{name:'Demander une copie de mes données'})).toHaveAttribute('href','mailto:contact@drjustintshims.com?subject=Demande%20de%20copie%20de%20mes%20donn%C3%A9es');expect(screen.getByRole('link',{name:'Ouvrir le formulaire d’aide'})).toHaveAttribute('href','/aide');expect(document.body).not.toHaveTextContent('Règle des 12 mois de silence');expect(document.body).not.toHaveTextContent('conservées exclusivement sur ton propre téléphone');});
it('« J’ai compris » retourne à l’application sans enregistrer un accord',()=>{render(<MemoryRouter initialEntries={['/confidentialite']}><Routes><Route path="/confidentialite" element={<Confidentialite/>}/><Route path="/" element={<h1>Accueil du test</h1>}/></Routes></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'J’ai compris'}));expect(screen.getByRole('heading',{name:'Accueil du test'})).toBeInTheDocument();});

it('la version anglaise traduit la politique et renvoie au texte français de référence', () => {
  render(<MemoryRouter initialEntries={['/confidentialite?lang=en']}><Confidentialite /></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
  expect(screen.getByText('Last updated: 25 October 2026')).toBeInTheDocument();
  expect(screen.getByText(/The French version is the reference/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Version française' })).toHaveAttribute('href', '/confidentialite?lang=fr');
  expect(screen.getByRole('heading', { name: '8. Minimum age' })).toBeInTheDocument();
});
