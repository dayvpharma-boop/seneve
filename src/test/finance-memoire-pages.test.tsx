import {cleanup,render,screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {effacerMemoire,memoriserCompte} from '@/lib/memoire-pages';

/** Retour sur une page Finance (demande du 12/11/2026) : la dernière version chargée s'affiche tout de suite,
 * sans « Chargement… », puis les chiffres sont relus en arrière-plan. */
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc,auth:{getUser:vi.fn()}}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
const suivi={enrollment_id:E,archived_goals:[],archived_debts:[],debts:[],
 savings_goals:[{goal_id:'5f1c2a4e-1111-4c3b-9a55-000000000001',goal_type:'epargne_investir',label:'Moto-taxi',target_amount:'1000.00',currency:'USD',entries:[{entry_id:'0b6f3c1e-0001-4c3b-9a55-000000000000',amount:'200.00',date_locale:'2026-11-01'}]}]};
beforeEach(()=>{effacerMemoire();memoriserCompte('compte-1');});
afterEach(()=>{cleanup();rpc.mockReset();effacerMemoire();});

it('SÉNEVÉ Finance : au retour, les chiffres déjà chargés s’affichent tout de suite, sans « Chargement… »',async()=>{
 rpc.mockImplementation(async(f:string)=>f==='hd_finance_tracker_get'?{data:suivi,error:null}:{data:{enrollment_id:E,moves:[],withdrawals:[],masques:[]},error:null});
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 const page=()=>render(<MemoryRouter><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 page();
 expect(await screen.findByRole('region',{name:'Moto-taxi'})).toBeInTheDocument();
 cleanup();
 // Deuxième passage : le réseau ne répond pas encore, la page s'affiche quand même.
 rpc.mockImplementation(()=>new Promise(()=>{}));
 page();
 expect(screen.queryByText(/Chargement/)).toBeNull();
 expect(screen.getByRole('region',{name:'Moto-taxi'}).textContent).toMatch(/200/);
});

it('la mémoire appartient au compte : un autre compte recharge normalement',async()=>{
 rpc.mockImplementation(async(f:string)=>f==='hd_finance_tracker_get'?{data:suivi,error:null}:{data:{enrollment_id:E,moves:[],withdrawals:[],masques:[]},error:null});
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 await screen.findByRole('region',{name:'Moto-taxi'});
 cleanup();
 memoriserCompte('compte-2');
 rpc.mockImplementation(()=>new Promise(()=>{}));
 render(<MemoryRouter><SuiviEpargneDettes mode="epargne" userId="u2"/></MemoryRouter>);
 expect(screen.getByText(/Chargement/)).toBeInTheDocument();
 expect(screen.queryByRole('region',{name:'Moto-taxi'})).toBeNull();
});

// Dépenses, Bénéfices et Rapport gardent aussi leur dernière version (12/11/2026).
const moisCourant=new Intl.DateTimeFormat('en-CA').format(new Date()).slice(0,7);
it('SÉNEVÉ Dépenses : au retour, le total du mois s’affiche tout de suite',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:[{expense_id:'0b6f3c1e-0009-4c3b-9a55-000000000000',category:'nourriture',amount:'42.00',currency:'USD',date_locale:`${moisCourant}-01`,note:null,liee:false,created_at:`${moisCourant}-01T10:00:00Z`}],error:null};
  throw Error(f);});
 const {HabitudesDepenses}=await import('@/routes/habitudes-depenses');
 const page=()=>render(<MemoryRouter><HabitudesDepenses userId="u"/></MemoryRouter>);
 page();
 expect((await screen.findByText(/Dépensé ce mois/)).parentElement!.textContent).toMatch(/42 USD/);
 cleanup();
 rpc.mockImplementation(()=>new Promise(()=>{}));
 page();
 expect(screen.queryByText(/Chargement/)).toBeNull();
 expect(screen.getByText(/Dépensé ce mois/).parentElement!.textContent).toMatch(/42 USD/);
});

it('SÉNEVÉ Bénéfices : au retour, le bénéfice du mois s’affiche tout de suite',async()=>{
 const vente={id:'r1',currency:'USD',date_locale:`${moisCourant}-02`,gross:'500',goods:'200',other:'0',charges:'0'};
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[]},error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[vente],revenus:[]},error:null};
  throw Error(f);});
 const {HabitudesBenefices}=await import('@/routes/habitudes-benefices');
 const page=()=>render(<MemoryRouter><HabitudesBenefices userId="u"/></MemoryRouter>);
 page();
 const avant=(await screen.findByText(/Bénéfice du mois|Revenus reçus/)).parentElement!.textContent;
 cleanup();
 rpc.mockImplementation(()=>new Promise(()=>{}));
 page();
 expect(screen.queryByText(/Chargement/)).toBeNull();
 expect(screen.getByText(/Bénéfice du mois|Revenus reçus/).parentElement!.textContent).toBe(avant);
});
