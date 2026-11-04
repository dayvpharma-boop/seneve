import {cleanup,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {CadreHabitudes} from '@/components/CadreHabitudes';
afterEach(cleanup);

// Demande de Dr Justin (04/11/2026) : après l'ouverture d'un rappel, les onglets du bas ne répondaient pas.
it('tous les onglets du bas mènent à leur page, comme la barre de l’espace',()=>{
 render(<MemoryRouter><CadreHabitudes titre="Aujourd’hui" langue="fr" actif="aujourdhui" liens={{aujourdhui:'/habitudes/aujourdhui?lang=fr'}}><p>contenu</p></CadreHabitudes></MemoryRouter>);
 const nav=screen.getByRole('navigation',{name:'Navigation principale'});
 const cible=(nom:string)=>within(nav).getByRole('link',{name:nom}).getAttribute('href');
 expect(cible('Aujourd’hui')).toBe('/habitudes/aujourdhui?lang=fr');
 expect(cible('Parcours')).toBe('/progres');expect(cible('Bibliothèque')).toBe('/bibliotheque');
 expect(cible('Bible')).toBe('/bible');expect(cible('Journal')).toBe('/journal');
});
it('garde la langue anglaise dans les liens',()=>{
 render(<MemoryRouter><CadreHabitudes titre="Today" langue="en" actif="aujourdhui"><p>content</p></CadreHabitudes></MemoryRouter>);
 expect(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name:'Library'})).toHaveAttribute('href','/bibliotheque?lang=en');
});
