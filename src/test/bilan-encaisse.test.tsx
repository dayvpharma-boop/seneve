import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
const auj=new Intl.DateTimeFormat('en-CA').format(new Date());
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;

it('Mon bilan : « Encaissé » montre le montant exact reçu (sans enlever les charges) et « Pas encore réparti »',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[{move_id:id(1),envelope:'vivre',direction:'entree',motif:null,amount:'135000.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null}],withdrawals:[]},error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[{id:'v1',currency:'USD',date_locale:auj,gross:'211000.00',goods:'0.00',other:'0.00',charges:'1000.00'}],revenus:[],reste_a_repartir:{USD:'60200.00'}},error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const bilan=await screen.findByRole('region',{name:/Mon bilan/});
 expect((await within(bilan).findByText('Encaissé')).closest('.sim-ios-ligne')!.textContent).toMatch(/211\s?000 USD/);
 expect(within(bilan).getByText('Pas encore réparti').closest('.sim-ios-ligne')!.textContent).toMatch(/60\s?200 USD/);
 expect(within(bilan).getByText('Entré dans les caisses').closest('.sim-ios-ligne')!.textContent).toMatch(/135\s?000 USD/);
});

it('le détail des dépenses (catégorie, note) apparaît dans l’historique de Pour vivre, pas dans le bilan',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[
   {move_id:id(1),envelope:'vivre',direction:'entree',motif:null,amount:'100.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null},
   {move_id:id(2),envelope:'vivre',direction:'sortie',motif:'depense',amount:'10.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null},
   {move_id:id(3),envelope:'vivre',direction:'sortie',motif:'depense',amount:'7.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null}],withdrawals:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:[
   {expense_id:id(10),category:'nourriture',amount:'10.00',currency:'USD',date_locale:auj,note:'Marché',liee:true,move_id:id(2),created_at:auj+'T08:00:00Z'},
   {expense_id:id(11),category:'transport',amount:'7.00',currency:'USD',date_locale:auj,note:null,liee:true,move_id:id(3),created_at:auj+'T09:00:00Z'}],error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[],revenus:[]},error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const bilan=await screen.findByRole('region',{name:/Mon bilan/});
 expect(await within(bilan).findByText('Dépensé')).toBeInTheDocument();
 expect(within(bilan).queryByText('Nourriture')).toBeNull();
 expect(within(bilan).queryByText('Transport')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Pour vivre/}));
 expect(await screen.findByText(/Nourriture · Marché/)).toBeInTheDocument();
});

it('Mes caisses : les dernières dépenses s’affichent directement sous « Pour vivre », avec un lien vers toutes les dépenses',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[{move_id:id(1),envelope:'vivre',direction:'entree',motif:null,amount:'100.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null}],withdrawals:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:[{expense_id:id(10),category:'nourriture',amount:'10.00',currency:'USD',date_locale:auj,note:'Marché',liee:false,move_id:null,created_at:auj+'T08:00:00Z'}],error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[],revenus:[]},error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const liste=await screen.findByRole('list',{name:'Dernières dépenses'});
 expect(liste.textContent).toMatch(/Nourriture · Marché.*− 10/);
 expect(screen.getByRole('link',{name:/Voir toutes mes dépenses/})).toHaveAttribute('href','/habitudes/depenses');
});

it('Pour vivre : pas de choix « Dépensé » dans la caisse ; un lien envoie vers SÉNEVÉ Dépenses',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[{move_id:id(1),envelope:'vivre',direction:'entree',motif:null,amount:'100.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null},{move_id:id(2),envelope:'dime',direction:'entree',motif:null,amount:'10.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null}],withdrawals:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:[],error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[],revenus:[]},error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter><HabitudesCompteurs userId="u"/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:/Pour vivre/}));
 const motifs=screen.getByRole('radiogroup',{name:'Motif'});
 expect(within(motifs).queryByRole('radio',{name:'Dépensé'})).toBeNull();
 expect(within(motifs).getByRole('radio',{name:'Donné'})).toHaveAttribute('aria-checked','true');
 expect(screen.getByRole('link',{name:/Une dépense de la maison \? Note-la dans SÉNEVÉ Dépenses/})).toHaveAttribute('href','/habitudes/depenses');
 fireEvent.click(screen.getByRole('button',{name:/Dîme/}));
 expect(within(screen.getByRole('radiogroup',{name:'Motif'})).getByRole('radio',{name:'Dépensé'})).toBeInTheDocument();
});
