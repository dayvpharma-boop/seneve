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

// 12/11/2026 : après un rechargement complet (nouvelle version), l'historique repart de zéro ;
// « Retour » ramène quand même à la page visitée juste avant, pas à Aujourd'hui.
it('après un rechargement, revient à la page visitée juste avant (et non à la page de secours)',async()=>{
 const {noterPage,pagePrecedente}=await import('@/lib/retour-precedent');
 sessionStorage.clear();
 noterPage('/habitudes/epargne');noterPage('/habitudes/compteurs');
 window.history.replaceState({idx:0},'','/habitudes/compteurs');
 const back=vi.spyOn(window.history,'back').mockImplementation(()=>{});
 expect(pagePrecedente()).toBe('/habitudes/epargne');
 lien();fireEvent.click(screen.getByRole('link',{name:'Retour'}));
 expect(back).not.toHaveBeenCalled();
 expect(window.location.pathname).toBe('/habitudes/epargne');
 // Le retour retire la page de la liste ; la langue ne compte pas pour reconnaître une page.
 noterPage('/habitudes/epargne');
 expect(pagePrecedente('/habitudes/epargne')).toBeNull();
 sessionStorage.clear();
});
