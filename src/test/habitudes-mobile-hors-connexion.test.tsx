import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({natif:true,etat:vi.fn(),stop:vi.fn()}));
vi.mock('@/lib/rappels-locaux',()=>({rappelsLocauxDisponibles:()=>m.natif,etatRappelsLocaux:m.etat,arreterRappelsLocaux:m.stop}));
vi.mock('@/lib/mobile',()=>({constructionMobile:()=>m.natif,VERSION_MOBILE:'0.3-test'}));
import {HabitudesHorsConnexionMobile} from '@/components/HabitudesHorsConnexionMobile';
beforeEach(()=>{document.documentElement.lang='fr';vi.spyOn(navigator,'onLine','get').mockReturnValue(false);m.natif=true;m.etat.mockReset().mockResolvedValue({nombre:3,autorise:true,exact:true,jusqua:null});m.stop.mockReset().mockResolvedValue(undefined);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function ouvrir(){return render(<MemoryRouter><HabitudesHorsConnexionMobile/></MemoryRouter>);}
it('garde le point d’entrée HD et lit les rappels locaux après un démarrage sans réseau',async()=>{
 ouvrir();expect(screen.getByRole('link',{name:'Ouvrir Habitudes & Défis'})).toHaveAttribute('href','/habitudes/aujourdhui');await screen.findByText(/3 rappels locaux en attente/);expect(m.stop).not.toHaveBeenCalled();expect(screen.getByText(/Les activités et ton accès nécessitent une connexion/)).toBeVisible();
});
it('arrête les rappels sans réseau et relit le nombre confirmé',async()=>{
 ouvrir();await screen.findByText(/3 rappels locaux en attente/);m.etat.mockResolvedValue({nombre:0,autorise:true,exact:true,jusqua:null});
 fireEvent.click(screen.getByRole('button',{name:'Arrêter les rappels de ce téléphone'}));await screen.findByText(/0 rappels locaux en attente/);expect(m.stop).toHaveBeenCalledOnce();
});
it('signale une vérification impossible et propose une reprise',async()=>{
 m.etat.mockRejectedValueOnce(Error('plugin'));ouvrir();await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Vérifier les rappels'}));await screen.findByText(/3 rappels locaux en attente/);
});
it('conserve l’entrée après reconnexion et ne l’affiche pas sur le site web',async()=>{
 const v=ouvrir();await screen.findByText(/3 rappels locaux en attente/);act(()=>fireEvent(window,new Event('online')));expect(screen.getByRole('complementary')).toBeVisible();v.unmount();
 m.natif=false;ouvrir();expect(screen.queryByRole('link',{name:'Ouvrir Habitudes & Défis'})).toBeNull();
});
it('garde HD dès le démarrage même quand le navigateur annonce une connexion',async()=>{
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);ouvrir();expect(screen.getByRole('link',{name:'Ouvrir Habitudes & Défis'})).toBeVisible();await screen.findByText(/3 rappels locaux en attente/);expect(screen.getByText(/0.3-test/)).toBeVisible();
});

