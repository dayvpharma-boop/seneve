import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn(),listener:null as null|(()=>void)}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{onAuthStateChange:(f:()=>void)=>{mock.listener=f;return{data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
vi.mock('@/lib/offres-acces',async(importOriginal)=>({...await importOriginal<typeof import('@/lib/offres-acces')>(),chargerCatalogueAcces:mock.charger}));
vi.mock('@/components/PlanningJourHabitudes',()=>({PlanningJourHabitudes:({enrollmentId,participantId,dateLocale}:{enrollmentId:string;participantId:string;dateLocale:string})=><div data-testid="planning">{enrollmentId}/{participantId}/{dateLocale}</div>}));
import {AccesRecetteHabitudes} from '@/components/AccesRecetteHabitudes';
const debut=new Date(Date.now()-3600000).toISOString(),fin=new Date(Date.parse(debut)+720*3600000).toISOString();
const catalogue={connecte:true,offres:[],programmes:[],publies:[],droits:[{entitlement_id:'D1',offre_id:'O1',etat:'actif',debut,fin}],inscriptions:[{enrollment_id:'E1',entitlement_id:'D1',programme_id:'HD_RECETTE_INSCRIPTION_FR_20261026',date_debut:'2026-10-26',etat:'active'}],periodesGratuitesHabitudes:[{enrollment_id:'E1',entitlement_id:'D1',debut,fin_exclue:fin}],fuseauHabitudes:'Africa/Kinshasa',participantIdHabitudes:'P1'};
beforeEach(()=>{mock.listener=null;mock.charger.mockReset();mock.charger.mockResolvedValue(catalogue);});afterEach(cleanup);
function ouvrir(en=false){return render(<MemoryRouter initialEntries={[`/acces?lang=${en?'en':'fr'}`]}><AccesRecetteHabitudes/></MemoryRouter>);}
it('affiche les droits existants et leur fin sans proposer une nouvelle inscription ou un achat',async()=>{
 ouvrir();await screen.findByText('Tes 30 jours de test sont en cours.');expect(screen.getByText(/Africa\/Kinshasa/)).toBeVisible();expect(screen.getByText(/ne déclenche aucun paiement automatique/)).toBeVisible();expect(screen.queryByRole('button',{name:/Commencer|Acheter/})).toBeNull();expect(screen.queryByRole('link',{name:/Continuer mes habitudes/})).toBeNull();
});
it('une période incohérente ne permet pas d’annoncer un accès actif',async()=>{
 mock.charger.mockResolvedValue({...catalogue,periodesGratuitesHabitudes:[{...catalogue.periodesGratuitesHabitudes[0],entitlement_id:'AUTRE'}]});ouvrir();await screen.findByText('Ton accès doit être vérifié.');expect(screen.queryByText('Tes 30 jours de test sont en cours.')).toBeNull();
});
it('un droit révoqué est affiché fermé',async()=>{
 mock.charger.mockResolvedValue({...catalogue,droits:[{...catalogue.droits[0],etat:'revoque'}]});ouvrir();await screen.findByText('Cet accès de test est fermé.');
});
it('demande la connexion en anglais si la session manque',async()=>{
 mock.charger.mockResolvedValue({...catalogue,connecte:false});ouvrir(true);expect(await screen.findByRole('link',{name:'Sign in'})).toHaveAttribute('href','/connexion?mode=signin&suite=habitudes&lang=en');expect(screen.queryByText('Your 30 test days are in progress.')).toBeNull();
});
it('permet de réessayer une lecture échouée',async()=>{
 mock.charger.mockRejectedValueOnce(Error('network'));ouvrir();await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));await screen.findByText('Tes 30 jours de test sont en cours.');
});
it('retire immédiatement les anciens droits lorsque la session change',async()=>{
 ouvrir();await screen.findByText('Tes 30 jours de test sont en cours.');mock.charger.mockResolvedValue({...catalogue,connecte:false});act(()=>mock.listener!());await screen.findByRole('link',{name:'Se connecter'});expect(screen.queryByText('Tes 30 jours de test sont en cours.')).toBeNull();
});

it('affiche seulement le planning du participant et du droit actifs',async()=>{
 ouvrir();expect(await screen.findByRole('heading',{name:'Ma journée'})).toBeVisible();expect(screen.getByTestId('planning')).toHaveTextContent('E1/P1/');
});
it('ne monte pas le planning lorsque le droit est expiré',async()=>{
 mock.charger.mockResolvedValue({...catalogue,droits:[{...catalogue.droits[0],etat:'expire'}]});ouvrir();await screen.findByText('Tes 30 jours de test sont terminés.');expect(screen.queryByTestId('planning')).toBeNull();
});
it('ne suppose aucun participant lorsque son profil manque',async()=>{
 mock.charger.mockResolvedValue({...catalogue,participantIdHabitudes:undefined});ouvrir();await screen.findByText('Tes 30 jours de test sont en cours.');expect(screen.queryByTestId('planning')).toBeNull();
});
it('site réel : un mois payé en cours prime sur le mois gratuit terminé',async()=>{
 const maintenant=Date.now(),iso=(h:number)=>new Date(maintenant+h*3600000).toISOString();
 const gratuit={enrollment_id:'E1',entitlement_id:'D1',debut:iso(-730),fin_exclue:iso(-10),mois:1},paye={enrollment_id:'E1',entitlement_id:'D2',debut:iso(-10),fin_exclue:iso(710),mois:2};
 mock.charger.mockResolvedValue({...catalogue,droits:[{entitlement_id:'D1',offre_id:'O1',etat:'actif',debut:gratuit.debut,fin:gratuit.fin_exclue},{entitlement_id:'D2',offre_id:'CONTINUITE_MENSUEL_FR',etat:'actif',debut:paye.debut,fin:paye.fin_exclue}],
  inscriptions:[{...catalogue.inscriptions[0]!,programme_id:'HABITUDES_DEFIS_30J_FR_V1'}],periodesGratuitesHabitudes:[gratuit,paye]});
 render(<MemoryRouter><AccesRecetteHabitudes reel/></MemoryRouter>);
 expect(await screen.findByText('Ton mois 2 sur 6 est en cours.')).toBeInTheDocument();
 expect(screen.getByText('Ce mois est inclus dans ton abonnement Continuité.')).toBeInTheDocument();
 expect(screen.queryByText(/30 jours gratuits sont terminés/)).toBeNull();
});
