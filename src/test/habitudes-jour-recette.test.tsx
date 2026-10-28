import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
const utilisateur='10000000-0000-4000-8000-000000000001',enrollment='20000000-0000-4000-8000-000000000001',activite='30000000-0000-4000-8000-000000000001';
const occurrence={occurrence_id:activite,enrollment_id:enrollment,version:1,date_locale:'2026-10-26',requise:true};
const jour={userId:utilisateur,date:'2026-10-26',jour:1,activites:[{occurrence,consigne:'Gratitude du matin',critere:'Déclaration volontaire',heure:'05:50'}]};
function ouvrir(){return render(<ActivitesJourRecette enrollmentId={enrollment} participantId="P1" dateLocale="2026-10-26" langue="fr"/>);}
beforeEach(()=>{sessionStorage.clear();mocks.charger.mockReset().mockResolvedValue(jour);mocks.rpc.mockReset();});afterEach(cleanup);
it('ne compte rien au chargement et ne propose aucune aide ou coach',async()=>{
 ouvrir();await screen.findByRole('heading',{name:'Gratitude du matin'});expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');expect(screen.getByRole('heading',{name:'Commencer avec ce qui est possible'})).toBeVisible();expect(mocks.rpc).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:/aide|coach/i})).toBeNull();
});
it('attend une confirmation serveur avant de compter une activité',async()=>{
 let finir!:(r:unknown)=>void;mocks.rpc.mockReturnValue(new Promise(r=>{finir=r;}));ouvrir();fireEvent.click(await screen.findByRole('button',{name:'J’ai réalisé cette activité'}));expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');
 await act(async()=>finir({data:{event_id:'40000000-0000-4000-8000-000000000001',etat:'realisee',aide_demandee:false,repetition:false},error:null}));expect(screen.getByRole('progressbar')).toHaveAttribute('value','1');expect(mocks.rpc.mock.calls[0]![1].p_activity_id).toBe(activite);
});
it('conserve le même événement après une erreur réseau sans annoncer une réussite',async()=>{
 mocks.rpc.mockRejectedValueOnce(Error('network')).mockResolvedValue({data:{event_id:'40000000-0000-4000-8000-000000000001',etat:'realisee',aide_demandee:false,repetition:true},error:null});ouvrir();fireEvent.click(await screen.findByRole('button',{name:'J’ai réalisé cette activité'}));await screen.findByRole('alert');expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');fireEvent.click(screen.getByRole('button',{name:'Réessayer cette déclaration'}));await screen.findByText('Réalisée · Synchronisée');expect(mocks.rpc.mock.calls[0]![1].p_client_event_id).toBe(mocks.rpc.mock.calls[1]![1].p_client_event_id);
});
it('retrouve les déclarations enregistrées lors de la réouverture',async()=>{
 mocks.charger.mockResolvedValue({...jour,activites:[{...jour.activites[0],etat:{...occurrence,etat:'partielle',aide_demandee:false,synchronisation:'synchronise'}}]});ouvrir();await screen.findByText('Réalisée en partie · Synchronisée');expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');expect(screen.getByText(/1 en partie/)).toBeVisible();
});
it('ferme les déclarations si la lecture échoue et permet de réessayer',async()=>{
 mocks.charger.mockRejectedValueOnce(Error('closed'));ouvrir();await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'J’ai réalisé cette activité'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Actualiser les activités'}));await screen.findByRole('heading',{name:'Gratitude du matin'});
});
it('mois 2 : le jour 31 affiche son propre texte validé le 27/10/2026 et annonce le mois',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:31});ouvrir();
 expect(await screen.findByRole('heading',{name:'Regarder qui est premier'})).toBeVisible();
 expect(screen.getByText(/Mois 2 sur 6/)).toBeInTheDocument();expect(screen.getByText(/Un temps pour réfléchir · Jour 31/)).toBeInTheDocument();
 expect(screen.queryByText(/reprise/)).toBeNull();expect(screen.queryByText(/30 jours gratuits/)).toBeNull();
});
it('mois 3 : le jour 61 affiche son propre texte validé le 27/10/2026',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:61});ouvrir();
 expect(await screen.findByRole('heading',{name:'Changer les causes'})).toBeVisible();
 expect(screen.getByText(/Mois 3 sur 6/)).toBeInTheDocument();expect(screen.getByText(/Un temps pour réfléchir · Jour 61/)).toBeInTheDocument();
 expect(screen.queryByText(/reprise/)).toBeNull();
});
it('mois 4 : le jour 91 affiche son propre texte validé le 27/10/2026',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:91});ouvrir();
 expect(await screen.findByRole('heading',{name:'Un Dieu qui travaille'})).toBeVisible();
 expect(screen.getByText(/Mois 4 sur 6/)).toBeInTheDocument();expect(screen.getByText(/Un temps pour réfléchir · Jour 91/)).toBeInTheDocument();
 expect(screen.queryByText(/reprise/)).toBeNull();
});
it('mois 5 : le jour 121 affiche son propre texte validé le 27/10/2026',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:121});ouvrir();
 expect(await screen.findByRole('heading',{name:'Relire la semaine : marcher vers la liberté'})).toBeVisible();
 expect(screen.getByText(/Mois 5 sur 6/)).toBeInTheDocument();expect(screen.getByText(/Un temps pour réfléchir · Jour 121/)).toBeInTheDocument();
 expect(screen.queryByText(/reprise/)).toBeNull();
});
it('mois 6 : le jour 151 affiche son propre texte validé le 28/10/2026, jusqu’au jour 180',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:151});ouvrir();
 expect(await screen.findByRole('heading',{name:"L'urgence fabriquée"})).toBeVisible();
 expect(screen.getByText(/Mois 6 sur 6/)).toBeInTheDocument();expect(screen.queryByText(/reprise/)).toBeNull();
 cleanup();mocks.charger.mockResolvedValue({...jour,jour:180});ouvrir();
 expect(await screen.findByRole('heading',{name:'Une lettre à Dieu'})).toBeVisible();
});
it('en anglais, sans traduction relue, le mois 6 reprend encore la lecture du jour 1',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:151});
 render(<ActivitesJourRecette enrollmentId={enrollment} participantId="P1" dateLocale="2026-10-26" langue="en"/>);
 expect(await screen.findByRole('heading',{name:'Start with what is possible'})).toBeVisible();
 expect(screen.getByText(/Reading 1 again/)).toBeInTheDocument();
});
it('affiche le défi approuvé de la semaine, et le même défi au mois 2 avec la reprise',async()=>{
 mocks.charger.mockResolvedValue({...jour,jour:9});ouvrir();
 expect(await screen.findByRole('heading',{name:'Prendre soin d’une responsabilité'})).toBeVisible();
 expect(screen.getByText(/Défi de la semaine · Jours 8 à 14 · facultatif/)).toBeInTheDocument();
 cleanup();mocks.charger.mockResolvedValue({...jour,jour:59});ouvrir();
 expect(await screen.findByRole('heading',{name:'Choisir la suite avec clarté'})).toBeVisible();
 expect(screen.getByText('De quelle aide as-tu encore besoin ?')).toBeInTheDocument();
});
