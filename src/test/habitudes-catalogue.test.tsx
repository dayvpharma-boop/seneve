import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),getSession:vi.fn(),actif:true,listener:null as null|((event:string,session:{user:{id:string}}|null)=>void)}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc,auth:{getSession:mock.getSession,onAuthStateChange:(f:typeof mock.listener)=>{mock.listener=f;return {data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>mock.actif}));
import {HabitudesInscription} from '@/routes/habitudes-inscription';
import {chargerCatalogueInscription} from '@/lib/habitudes-catalogue-api';
const catalogue={compte_id:'compte-a',fuseau:'Africa/Kinshasa',offres:[{programme_id:'HD_TEST',version:1,langue:'fr',nom:'Parcours fictif',offre_id:'OFFRE_TEST',duree_gratuite_jours:30,planning:[{habit_key:'priere_matin',libelle:'Prière du matin',creneaux:[{creneau_id:'principal',heure_locale:'06:00',jours_iso:[1,2,3,4,5,6,7]}]}]}]};
beforeEach(()=>{mock.actif=true;mock.listener=null;mock.rpc.mockReset();mock.getSession.mockReset();mock.getSession.mockResolvedValue({data:{session:{user:{id:'compte-a'}}},error:null});mock.rpc.mockResolvedValue({data:catalogue,error:null});});afterEach(cleanup);
function ouvrir(){return render(<MemoryRouter initialEntries={['/habitudes/inscription']}><HabitudesInscription/></MemoryRouter>);}
it('charge le catalogue autorisé et monte le formulaire sans créer une inscription',async()=>{
 ouvrir();await screen.findByText('Parcours fictif');expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeDisabled();expect(mock.rpc).toHaveBeenCalledTimes(1);expect(mock.rpc).toHaveBeenCalledWith('hd_free_catalogue',{p_langue:'fr'});
});
it('ne consulte ni compte ni catalogue lorsque le module est désactivé',()=>{
 mock.actif=false;ouvrir();expect(screen.getByText(/L’inscription à ce parcours est en préparation/)).toBeVisible();expect(mock.getSession).not.toHaveBeenCalled();expect(mock.rpc).not.toHaveBeenCalled();
});
it('demande la connexion sans consulter le catalogue anonyme',async()=>{
 mock.getSession.mockResolvedValue({data:{session:null},error:null});ouvrir();await screen.findByRole('link',{name:'Se connecter'});expect(mock.rpc).not.toHaveBeenCalled();
});
it('une réponse sans offre ne montre aucun bouton de départ',async()=>{
 mock.rpc.mockResolvedValue({data:{...catalogue,offres:[]},error:null});ouvrir();await screen.findByText(/Aucune offre de 30 jours gratuits/);expect(screen.queryByRole('checkbox')).toBeNull();
});
it('un accès gratuit déjà utilisé renvoie aux accès sans nouvelle confirmation',async()=>{
 mock.rpc.mockResolvedValue({data:{...catalogue,offres:[],motif:'gratuite_deja_utilisee'},error:null});ouvrir();await screen.findByText(/Ton accès gratuit a déjà été utilisé/);expect(screen.getByRole('link',{name:'Consulter mes accès'})).toHaveAttribute('href','/acces?lang=fr');expect(screen.queryByRole('checkbox')).toBeNull();
});
it('une erreur ne montre pas de formulaire et se réessaie',async()=>{
 mock.rpc.mockResolvedValueOnce({data:null,error:{message:'réseau'}});ouvrir();await screen.findByRole('alert');expect(screen.queryByRole('checkbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));await screen.findByText('Parcours fictif');expect(mock.rpc).toHaveBeenCalledTimes(2);
});
it('refuse le catalogue d’un autre compte et une offre de mauvaise durée',async()=>{
 mock.rpc.mockResolvedValueOnce({data:{...catalogue,compte_id:'compte-b'},error:null});await expect(chargerCatalogueInscription('fr','compte-a')).rejects.toThrow('Catalogue incohérent');
 mock.rpc.mockResolvedValueOnce({data:{...catalogue,offres:[{...catalogue.offres[0],duree_gratuite_jours:31}]},error:null});await expect(chargerCatalogueInscription('fr','compte-a')).rejects.toThrow('Offre incohérente');
});
it('refuse des jours, heures ou fuseau invalides',async()=>{
 for(const mauvais of [{...catalogue,fuseau:'Inconnu/Inconnu'},{...catalogue,offres:[{...catalogue.offres[0],planning:[{habit_key:'a',libelle:'A',creneaux:[{creneau_id:'principal',heure_locale:'25:00',jours_iso:[1]}]}]}]},{...catalogue,offres:[{...catalogue.offres[0],planning:[{habit_key:'a',libelle:'A',creneaux:[{creneau_id:'principal',heure_locale:'06:00',jours_iso:[1,1]}]}]}]}]){
  mock.rpc.mockResolvedValueOnce({data:mauvais,error:null});await expect(chargerCatalogueInscription('fr','compte-a')).rejects.toThrow();
 }
});
it('une déconnexion pendant le chargement écarte la réponse tardive',async()=>{
 let finir!:(v:unknown)=>void;mock.rpc.mockImplementationOnce(()=>new Promise(r=>{finir=r;}));ouvrir();await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(1));act(()=>mock.listener!('SIGNED_OUT',null));await screen.findByRole('link',{name:'Se connecter'});finir({data:catalogue,error:null});await waitFor(()=>expect(screen.queryByText('Parcours fictif')).toBeNull());
});
it('un renouvellement de session du même compte ne perd pas le chargement en cours',async()=>{
 let finir!:(v:unknown)=>void;mock.rpc.mockImplementationOnce(()=>new Promise(r=>{finir=r;}));ouvrir();await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(1));act(()=>mock.listener!('TOKEN_REFRESHED',{user:{id:'compte-a'}}));finir({data:catalogue,error:null});await screen.findByText('Parcours fictif');expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it('un changement de compte retire le formulaire avant de lire le nouveau catalogue',async()=>{
 ouvrir();await screen.findByText('Parcours fictif');mock.rpc.mockResolvedValueOnce({data:{...catalogue,compte_id:'compte-b',offres:[]},error:null});act(()=>mock.listener!('SIGNED_IN',{user:{id:'compte-b'}}));await screen.findByText(/Aucune offre de 30 jours gratuits/);expect(screen.queryByRole('checkbox')).toBeNull();
});
