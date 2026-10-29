import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
import {copiesJourHdValides,enregistrerCopieJourHd} from '@/lib/habitudes-copie-jour';
import {entreesFile,envoyerFile} from '@/lib/file-actions';
import {effacerEspaces} from '@/lib/hors-ligne';
import {calendrierHabitudes} from '@/lib/habitudes-calendrier';

const U='10000000-0000-4000-8000-000000000001',E='20000000-0000-4000-8000-000000000001',A='30000000-0000-4000-8000-000000000001',B='30000000-0000-4000-8000-000000000002';
const F='Africa/Kinshasa',aujourdhui=calendrierHabitudes('2000-01-01',1,F).date_locale;
const occ=(id:string)=>({occurrence_id:id,enrollment_id:E,version:1,date_locale:aujourdhui,requise:true});
const jour={userId:U,date:aujourdhui,jour:1,activites:[{habit_key:'gratitude_matin',occurrence:occ(A),consigne:'Gratitude du matin',critere:null,heure:'05:50'},{habit_key:'bible_matin',occurrence:occ(B),consigne:'Lecture de la Bible du matin',critere:null,heure:'06:00'}]};
const copie=(o:Partial<Parameters<typeof enregistrerCopieJourHd>[1]>={})=>({enrollmentId:E,participantId:'P1',dateLocale:aujourdhui,fuseau:F,finExclue:null,data:jour,...o});

beforeEach(()=>{localStorage.clear();sessionStorage.clear();mocks.charger.mockReset().mockResolvedValue(jour);mocks.rpc.mockReset();});
afterEach(()=>{cleanup();Object.defineProperty(navigator,'onLine',{configurable:true,value:true});});

describe('Habitudes & Défis hors connexion (décision du 29/10/2026 : lire et noter)',()=>{
 it('en ligne, la journée est gardée sur l’appareil pour ce compte seulement',async()=>{
  render(<ActivitesJourRecette enrollmentId={E} participantId="P1" dateLocale={aujourdhui} langue="fr" fuseau={F}/>);
  await screen.findByRole('heading',{name:'Gratitude du matin'});
  expect(copiesJourHdValides(U)).toHaveLength(1);
  expect(copiesJourHdValides('autre-compte')).toHaveLength(0);
 });
 it('une copie d’un autre jour, ou d’un accès terminé, n’est pas proposée ; la déconnexion l’efface',()=>{
  enregistrerCopieJourHd(U,copie({dateLocale:'2020-01-01'}));
  expect(copiesJourHdValides(U)).toHaveLength(0);
  enregistrerCopieJourHd(U,copie({finExclue:'2020-01-01T00:00:00Z'}));
  expect(copiesJourHdValides(U)).toHaveLength(0);
  enregistrerCopieJourHd(U,copie());
  expect(copiesJourHdValides(U)).toHaveLength(1);
  effacerEspaces();
  expect(copiesJourHdValides(U)).toHaveLength(0);
 });
 it('sans réseau : la journée se relit, une habitude se note sur l’appareil, puis part au retour du réseau sans doublon',async()=>{
  enregistrerCopieJourHd(U,copie());const c=copiesJourHdValides(U)[0]!;
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
  render(<ActivitesJourRecette enrollmentId={E} participantId="P1" dateLocale={aujourdhui} langue="fr" fuseau={F} copie={c}/>);
  expect(await screen.findByText(/Tu es hors connexion : tu peux noter tes habitudes/)).toBeInTheDocument();
  expect(mocks.charger).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button',{name:'J’ai réalisé cette activité'})[0]!);
  expect(await screen.findByText('Enregistré sur cet appareil')).toBeInTheDocument();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(entreesFile(U)).toEqual([expect.objectContaining({enrollmentId:E,activityId:A,choix:'realisee'})]);
  expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');

  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  mocks.rpc.mockResolvedValue({data:{event_id:'40000000-0000-4000-8000-000000000001',etat:'realisee',aide_demandee:false,repetition:false},error:null});
  await act(async()=>{await envoyerFile(U,{rpc:(n,a)=>mocks.rpc(n,a)});await envoyerFile(U,{rpc:(n,a)=>mocks.rpc(n,a)});});
  expect(await screen.findByText('Reçu par SÉNEVÉ.')).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc.mock.calls[0]![1]).toMatchObject({p_activity_id:A,p_etat:'realisee',p_canal:'web'});
  expect(screen.getByRole('progressbar')).toHaveAttribute('value','1');
 });
 it('sans réseau, une lecture avec durée et les parties en ligne restent fermées',async()=>{
  enregistrerCopieJourHd(U,copie());const c=copiesJourHdValides(U)[0]!;
  render(<ActivitesJourRecette enrollmentId={E} participantId="P1" dateLocale={aujourdhui} langue="fr" fuseau={F} copie={c}/>);
  expect(await screen.findByText('La durée de lecture demande une connexion : tu pourras noter cette lecture au retour du réseau.')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:'J’ai réalisé cette activité'})).toHaveLength(1);
  expect(screen.queryByRole('button',{name:'Durée de lecture'})).toBeNull();
  expect(screen.queryByRole('region',{name:'Prière Amidah'})).toBeNull();
 });
});
