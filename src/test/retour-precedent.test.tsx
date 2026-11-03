import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {BrowserRouter,Link} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {retourPrecedent} from '@/lib/retour-precedent';

// Demande de Dr Justin (03/11/2026) : « Retour » ramène à la page d'où l'on vient, pas à une page fixe.
afterEach(()=>{cleanup();vi.restoreAllMocks();window.history.replaceState(null,'','/');});
const lien=()=>render(<BrowserRouter><Link to="/espace" onClick={retourPrecedent}>Retour</Link></BrowserRouter>);
it('revient à la page précédente de l’app quand il y en a une',()=>{
 window.history.replaceState({idx:2},'','/profil');const back=vi.spyOn(window.history,'back').mockImplementation(()=>{});
 lien();fireEvent.click(screen.getByRole('link',{name:'Retour'}));
 expect(back).toHaveBeenCalledTimes(1);expect(window.location.pathname).toBe('/profil');
});
it('ouvre la page de secours quand on arrive directement (lien partagé)',()=>{
 window.history.replaceState({idx:0},'','/profil');const back=vi.spyOn(window.history,'back').mockImplementation(()=>{});
 lien();fireEvent.click(screen.getByRole('link',{name:'Retour'}));
 expect(back).not.toHaveBeenCalled();expect(window.location.pathname).toBe('/espace');
});
it('laisse le navigateur ouvrir un nouvel onglet (Ctrl ou Cmd)',()=>{
 window.history.replaceState({idx:3},'','/profil');const back=vi.spyOn(window.history,'back').mockImplementation(()=>{});
 lien();fireEvent.click(screen.getByRole('link',{name:'Retour'}),{ctrlKey:true});
 expect(back).not.toHaveBeenCalled();
});
