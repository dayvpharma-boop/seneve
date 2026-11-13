import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import {it,expect,vi,beforeEach} from 'vitest';
import {BarreNav} from '@/components/BarreNav';
import {dejaSurCettePage} from '@/lib/remonter-en-haut';

function Ou(){const l=useLocation();return <p data-testid="ou">{l.pathname+l.search}</p>;}
beforeEach(()=>{window.scrollTo=vi.fn() as unknown as typeof window.scrollTo;});

it('déjà sur la page : même chemin, seul « lang » peut différer',()=>{
 expect(dejaSurCettePage('/espace','/espace','')).toBe(true);
 expect(dejaSurCettePage('/espace?lang=en','/espace','?lang=en')).toBe(true);
 expect(dejaSurCettePage('/bibliotheque','/bibliotheque','?livre=1')).toBe(false);
 expect(dejaSurCettePage('/progres','/espace','')).toBe(false);
});

it('toucher l’onglet de la page en cours remonte en haut sans changer de page ; un autre onglet navigue',()=>{
 render(<MemoryRouter initialEntries={['/bibliotheque']}><Routes><Route path="*" element={<><BarreNav langue="fr"/><Ou/></>}/></Routes></MemoryRouter>);
 fireEvent.click(screen.getByRole('link',{name:'Bibliothèque'}));
 expect(window.scrollTo).toHaveBeenCalled();
 expect(screen.getByTestId('ou').textContent).toBe('/bibliotheque');
 (window.scrollTo as unknown as ReturnType<typeof vi.fn>).mockClear();
 fireEvent.click(screen.getByRole('link',{name:'Journal'}));
 expect(screen.getByTestId('ou').textContent).toBe('/journal');
});
