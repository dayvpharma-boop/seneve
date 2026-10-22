import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {EtatAdministration,type EtatAdmin} from '@/components/EtatAdministration';
afterEach(cleanup);
function page(etat:EtatAdmin,reessayer=vi.fn()){render(<MemoryRouter><EtatAdministration etat={etat} reessayer={reessayer}/></MemoryRouter>);return reessayer;}
describe('États de l’administration',()=>{
 it('reconnexion sans délai fictif',()=>{page('expired');expect(screen.getByRole('link',{name:/Se reconnecter/})).toHaveAttribute('href','/connexion');expect(screen.queryByText(/30 minutes/)).not.toBeInTheDocument();});
 it('première visite : connexion requise, sans parler d’expiration',()=>{page('signin');expect(screen.getByRole('heading',{name:'Connexion requise'})).toBeInTheDocument();expect(screen.getByRole('link',{name:/Se connecter/})).toHaveAttribute('href','/connexion');expect(screen.queryByText(/expiré/)).not.toBeInTheDocument();});
 it('chargement sans faux serveur',()=>{page('loading');expect(screen.getByRole('status')).toHaveTextContent('Chargement…');expect(screen.queryByText(/Paris|v4.2|38%/)).not.toBeInTheDocument();});
 it('relance réellement et vérifie le réseau local',()=>{const retry=page('failed');fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));expect(retry).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:/Vérifier l’état du réseau/}));expect(screen.getByRole('status')).toHaveTextContent(/Ton appareil indique/);expect(screen.queryByText(/503/)).not.toBeInTheDocument();});
 it('panneau accompagnateur ouvert et fermé',()=>{page('no-access');fireEvent.click(screen.getByRole('button',{name:'Connexion accompagnateur'}));expect(screen.getByRole('link',{name:'Aller à la connexion'})).toHaveAttribute('href','/connexion');fireEvent.click(screen.getByRole('button',{name:'Fermer'}));expect(screen.queryByText('Connexion de l’équipe SÉNEVÉ')).not.toBeInTheDocument();});
});
