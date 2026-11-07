import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af',G='5f1c2a4e-1111-4c3b-9a55-000000000001',D1='7c011210-b780-41a4-9ec4-8f6566b27755',D2='7c011210-b780-41a4-9ec4-8f6566b27756';
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const suivi={enrollment_id:E,savings_goals:[{goal_id:G,goal_type:'reserve_joie',label:'Réserve',target_amount:'1000.00',currency:'USD',entries:[{entry_id:id(1),amount:'50.00',date_locale:'2026-11-07'}]}],
 debts:[{debt_id:D1,debt_number:1,opening_balance:'60.00',currency:'USD',creditor_name:'Kanza',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[]},
  {debt_id:D2,debt_number:2,opening_balance:'200.00',currency:'USD',creditor_name:'Papy',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[]}]};
let compteurs:{enrollment_id:string;moves:unknown[];withdrawals:unknown[]};

it('« Enregistrer ma répartition » envoie toutes les parts cochées en une fois, dettes d’abord sur la plus petite',async()=>{
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:suivi,error:null};
  if(f==='hd_finance_allocation_save')return {data:{allocation_id:a.p_request_id,deja:false},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
  throw Error(f);});
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000'}});
 fireEvent.change(screen.getByLabelText('Coût des marchandises vendues'),{target:{value:'400'}});
 fireEvent.change(screen.getByLabelText('Charges du commerce'),{target:{value:'100'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma répartition'}));
 const feuille=await screen.findByRole('dialog');
 // Pas d'objectif « Pour investir » en USD : la part est grisée et non envoyée.
 await waitFor(()=>expect(within(feuille).getByLabelText(/Pour investir/)).toBeDisabled());
 expect(within(feuille).getByText(/Kanza 60 \(soldée\) · Papy 15/)).toBeInTheDocument();
 fireEvent.click(within(feuille).getByRole('button',{name:/Enregistrer 4 parts · 400 USD/}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_allocation_save',expect.objectContaining({p_currency:'USD',p_parts:[
  {part:'dime',amount:'50.00'},{part:'reserve_joie',goal_id:G,amount:'50.00'},{part:'dettes',debt_id:D1,amount:'60.00'},{part:'dettes',debt_id:D2,amount:'15.00'},{part:'vivre',amount:'225.00'}]})));
});

it('« Mes compteurs » : disponible, sortie notée, remise à zéro, historique et bilan gardés',async()=>{
 compteurs={enrollment_id:E,moves:[{move_id:id(21),envelope:'dime',direction:'entree',motif:null,amount:'50.00',currency:'USD',date_locale:'2026-11-07',remise_a_zero:false,allocation_id:id(9)}],withdrawals:[]};
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:suivi,error:null};
  if(f==='hd_finance_counters_get')return {data:compteurs,error:null};
  if(f==='hd_finance_envelope_move_add'){const m=a.p_remise_a_zero?'20.00':String(a.p_amount);compteurs={...compteurs,moves:[...compteurs.moves,{move_id:a.p_request_id,envelope:'dime',direction:'sortie',motif:a.p_motif,amount:m,currency:'USD',date_locale:a.p_date_locale,remise_a_zero:!!a.p_remise_a_zero,allocation_id:null}]};return {data:{move_id:a.p_request_id,amount:m,balance:a.p_remise_a_zero?'0.00':'20.00'},error:null};}
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const dime=await screen.findByRole('article',{name:'Dîme'});
 expect(dime.textContent).toMatch(/50USD disponibles/);
 fireEvent.click(within(dime).getAllByRole('button')[0]!);
 fireEvent.change(within(dime).getByLabelText('Montant utilisé'),{target:{value:'100'}});
 fireEvent.click(within(dime).getByRole('button',{name:/Noter 100 USD/}));
 expect(within(dime).getByRole('alert').textContent).toMatch(/dépasse le disponible/);
 fireEvent.change(within(dime).getByLabelText('Montant utilisé'),{target:{value:'30'}});
 fireEvent.click(within(dime).getByRole('button',{name:/Noter 30 USD donnés/}));
 await waitFor(()=>expect(dime.textContent).toMatch(/20USD disponibles/));
 fireEvent.click(within(dime).getByRole('button',{name:/Tout utilisé/}));
 await waitFor(()=>expect(dime.textContent).toMatch(/0USD disponibles/));
 expect(rpc).toHaveBeenCalledWith('hd_finance_envelope_move_add',expect.objectContaining({p_remise_a_zero:true,p_amount:null,p_motif:'donne'}));
 // L'historique garde les trois lignes et la remise à zéro ; « Donné depuis le début » = 50.
 expect(within(dime).getByText(/Caisse remise à zéro le/)).toBeInTheDocument();
 expect(within(dime).getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
 expect(within(dime).getByText('Donné depuis le début').closest('div')!.textContent).toMatch(/50 USD/);
 const bilan=screen.getByRole('region',{name:/Mon bilan/});
 fireEvent.click(within(bilan).getByRole('radio',{name:'Cette année'}));
 expect(within(bilan).getByText('Donné').closest('div')!.textContent).toMatch(/50 USD/);
});

it('si la base n’a pas encore les compteurs, la page l’explique sans erreur',async()=>{
 rpc.mockImplementation(async(f:string)=>{if(f==='hd_finance_tracker_get')return {data:suivi,error:null};return {data:null,error:{code:'PGRST202',message:'Could not find the function'}};});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 expect(await screen.findByText(/Les compteurs arrivent bientôt/)).toBeInTheDocument();
});
