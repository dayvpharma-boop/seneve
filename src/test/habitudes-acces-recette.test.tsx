import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn(),listener:null as null|(()=>void)}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'10000000-0000-4000-8000-000000000001'}}}}),onAuthStateChange:(f:()=>void)=>{mock.listener=f;return{data:{subscription:{unsubscribe:vi.fn()}}};}},rpc:vi.fn()}}));
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

it.each(['debut','fin'] as const)('site réel : refuse un mois HD dont %s diffère de Continuité',async(borne)=>{
 const maintenant=Date.now(),iso=(h:number)=>new Date(maintenant+h*3600000).toISOString();
 const paye={enrollment_id:'E1',entitlement_id:'D2',debut:iso(-10),fin_exclue:iso(710),mois:2};
 const droit={entitlement_id:'D2',offre_id:'CONTINUITE_MENSUEL_FR',etat:'actif',debut:paye.debut,fin:paye.fin_exclue};
 droit[borne]=iso(borne==='debut'?-11:709);
 mock.charger.mockResolvedValue({...catalogue,droits:[droit],
  inscriptions:[{...catalogue.inscriptions[0]!,programme_id:'HABITUDES_DEFIS_30J_FR_V1'}],periodesGratuitesHabitudes:[paye]});
 render(<MemoryRouter><AccesRecetteHabitudes reel/></MemoryRouter>);
 await screen.findByText('Ton accès doit être vérifié.');
 expect(screen.queryByText('Ton mois 2 sur 6 est en cours.')).toBeNull();
 expect(screen.queryByTestId('planning')).toBeNull();
});

it.each(['revoque','expire'] as const)('site réel : un mois payé aligné mais %s ne monte pas la journée',async(etat)=>{
 const maintenant=Date.now(),iso=(h:number)=>new Date(maintenant+h*3600000).toISOString();
 const paye={enrollment_id:'E1',entitlement_id:'D2',debut:iso(-10),fin_exclue:iso(710),mois:2};
 mock.charger.mockResolvedValue({...catalogue,droits:[{entitlement_id:'D2',offre_id:'CONTINUITE_MENSUEL_FR',etat,debut:paye.debut,fin:paye.fin_exclue}],
  inscriptions:[{...catalogue.inscriptions[0]!,programme_id:'HABITUDES_DEFIS_30J_FR_V1'}],periodesGratuitesHabitudes:[paye]});
 render(<MemoryRouter><AccesRecetteHabitudes reel/></MemoryRouter>);
 await screen.findByText(etat==='revoque'?'Ton mois 2 est fermé.':'Ton mois 2 est terminé. Le mois suivant s’ouvre seulement avec un abonnement Continuité actif.');
 expect(screen.queryByRole('heading',{name:'Ma journée'})).toBeNull();
 expect(screen.queryByTestId('planning')).toBeNull();
});

it.each(['fr','en'])('site réel : annonce la fin des six mois sans promettre un septième mois (%s)',async(langue)=>{
 const maintenant=Date.now(),iso=(h:number)=>new Date(maintenant+h*3600000).toISOString();
 const periode={enrollment_id:'E1',entitlement_id:'D6',debut:iso(-730),fin_exclue:iso(-10),mois:6};
 mock.charger.mockResolvedValue({...catalogue,droits:[{entitlement_id:'D6',offre_id:'CONTINUITE_MENSUEL_FR',etat:'actif',debut:periode.debut,fin:periode.fin_exclue}],
  inscriptions:[{...catalogue.inscriptions[0]!,programme_id:'HABITUDES_DEFIS_30J_FR_V1'}],periodesGratuitesHabitudes:[periode]});
 render(<MemoryRouter initialEntries={[`/habitudes/aujourdhui?lang=${langue}`]}><AccesRecetteHabitudes reel/></MemoryRouter>);
 await screen.findByText(langue==='en'?'Your six-month journey is complete.':'Ton parcours de six mois est terminé.');
 expect(screen.queryByText(/Le mois suivant|The next month/)).toBeNull();
 expect(screen.queryByRole('heading',{name:langue==='en'?'My day':'Ma journée'})).toBeNull();
});
it.each([['fr','expire','Retrouver mon parcours dans mon espace'],['en','revoque','View my journey in my space']])('un accès réel fermé %s explique la limite et renvoie vers son propre parcours',async(langue,etat,lien)=>{
 mock.charger.mockResolvedValue({...catalogue,droits:[{...catalogue.droits[0],etat}],inscriptions:[{...catalogue.inscriptions[0]!,programme_id:'HABITUDES_DEFIS_30J_FR_V1'}]});
 render(<MemoryRouter initialEntries={[`/habitudes/aujourdhui?lang=${langue}`]}><AccesRecetteHabitudes reel/></MemoryRouter>);
 const retour=await screen.findByRole('link',{name:lien});expect(retour).toHaveAttribute('href',`/espace?parcours=E1${langue==='en'?'&lang=en':''}`);expect(screen.queryByTestId('planning')).toBeNull();expect(screen.queryByText('Tu peux déclarer tes habitudes quotidiennes et les cultes prévus dans ton planning personnel.')).toBeNull();expect(screen.queryByText('You can record your daily habits and the worship appointments in your personal schedule.')).toBeNull();expect(screen.getByText(langue==='en'?/New records require confirmed active access/:/Les nouvelles déclarations nécessitent un accès actif confirmé/)).toBeVisible();
});
it('sans réseau, l’écran réel explique que les habitudes demandent une connexion (maquette Stitch du 28/10/2026)',async()=>{
 Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
 try{
  mock.charger.mockRejectedValue(new TypeError('Failed to fetch'));
  render(<MemoryRouter initialEntries={['/habitudes/aujourdhui?lang=fr']}><AccesRecetteHabitudes reel/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Tes habitudes du jour demandent une connexion'})).toBeInTheDocument();
  expect(screen.getByText('Pour protéger tes données, les habitudes ne sont pas gardées sur cet appareil. Tu pourras noter ce que tu as fait dès que le réseau reviendra.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Lire la Bible'})).toHaveAttribute('href','/bible');
  expect(screen.getByRole('link',{name:'Relire ma journée'})).toHaveAttribute('href','/espace');
  expect(screen.queryByText('Tes accès ne peuvent pas être vérifiés pour le moment.')).not.toBeInTheDocument();
 }finally{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});}
});
it('avec réseau, une erreur garde le message habituel sur l’écran réel',async()=>{
 mock.charger.mockRejectedValue(Error('serveur'));
 render(<MemoryRouter initialEntries={['/habitudes/aujourdhui?lang=fr']}><AccesRecetteHabitudes reel/></MemoryRouter>);
 expect(await screen.findByText('Tes accès ne peuvent pas être vérifiés pour le moment.')).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'Tes habitudes du jour demandent une connexion'})).not.toBeInTheDocument();
});

it('sans réseau, l’écran réel affiche la journée gardée sur l’appareil au lieu du message de connexion',async()=>{
 const {enregistrerCopieJourHd}=await import('@/lib/habitudes-copie-jour');
 const {calendrierHabitudes}=await import('@/lib/habitudes-calendrier');
 const jourLocal=calendrierHabitudes('2000-01-01',1,'Africa/Kinshasa').date_locale;
 const o={occurrence_id:'30000000-0000-4000-8000-000000000001',enrollment_id:'20000000-0000-4000-8000-000000000001',version:1,date_locale:jourLocal,requise:true};
 localStorage.clear();
 enregistrerCopieJourHd('10000000-0000-4000-8000-000000000001',{enrollmentId:o.enrollment_id,participantId:'P1',dateLocale:jourLocal,fuseau:'Africa/Kinshasa',finExclue:null,data:{userId:'10000000-0000-4000-8000-000000000001',date:jourLocal,jour:1,activites:[{habit_key:'gratitude_matin',occurrence:o,consigne:'Gratitude du matin',critere:null,heure:'05:50'}]}});
 Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
 try{
  mock.charger.mockRejectedValue(new TypeError('Failed to fetch'));
  render(<MemoryRouter initialEntries={['/habitudes/aujourdhui?lang=fr']}><AccesRecetteHabitudes reel/></MemoryRouter>);
  expect(await screen.findByRole('heading',{name:'Gratitude du matin'})).toBeInTheDocument();
  expect(screen.getByText(/Tu es hors connexion : tu peux noter tes habitudes/)).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'Tes habitudes du jour demandent une connexion'})).not.toBeInTheDocument();
 }finally{Object.defineProperty(navigator,'onLine',{configurable:true,value:true});localStorage.clear();}
});
