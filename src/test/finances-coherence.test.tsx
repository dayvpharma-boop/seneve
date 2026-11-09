import {cleanup,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

/** Test d'ensemble (demande de Dr Justin du 07/11/2026) : les mêmes données donnent les mêmes montants
 * dans Mon épargne, Mes compteurs et le bilan — un retrait fait dans Mes compteurs se voit partout. */
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af',GI='5f1c2a4e-1111-4c3b-9a55-000000000001',D='7c011210-b780-41a4-9ec4-8f6566b27755';
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const auj=new Intl.DateTimeFormat('en-CA').format(new Date());
const suivi={enrollment_id:E,
 savings_goals:[{goal_id:GI,goal_type:'epargne_investir',label:'Moto-taxi',target_amount:'1000.00',currency:'USD',entries:[{entry_id:id(1),amount:'100.00',date_locale:auj,created_at:new Date().toISOString()},{entry_id:id(2),amount:'100.00',date_locale:auj,created_at:new Date().toISOString()}]}],
 debts:[{debt_id:D,debt_number:1,opening_balance:'200.00',currency:'USD',creditor_name:'Papy',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[{payment_id:id(3),amount:'40.00',date_locale:auj,created_at:new Date().toISOString()}]}]};
const compteurs={enrollment_id:E,moves:[{move_id:id(4),envelope:'dime',direction:'entree',motif:null,amount:'20.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null,created_at:new Date().toISOString()}],
 withdrawals:[{withdrawal_id:id(5),goal_id:GI,motif:'investi',amount:'150.00',date_locale:auj,remise_a_zero:false,created_at:new Date().toISOString()}]};
beforeEach(()=>rpc.mockImplementation(async(f:string)=>{
 if(f==='hd_finance_tracker_get')return {data:suivi,error:null};
 if(f==='hd_finance_counters_get')return {data:compteurs,error:null};
 throw Error(f);}));

it('Mon épargne : le retrait de 150 est soustrait (200 − 150 = 50) et figure dans l’historique',async()=>{
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const resume=await screen.findByRole('region',{name:'Moto-taxi'});
 await within(resume).findByText(/Mis de côté 200 · utilisé 150/);
 expect(resume.textContent).toMatch(/50\s?\$US|50\s?USD|\$50/);
 expect(within(resume).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('5');
 const historique=screen.getByRole('region',{name:'Historique'});
 const lignes=within(historique).getAllByRole('listitem').map(li=>li.textContent);
 expect(lignes.some(t=>/investi/.test(t!)&&/− 150/.test(t!))).toBe(true);
 expect(lignes.filter(t=>/\+ 100/.test(t!))).toHaveLength(2);
});

it('Mes compteurs : la même caisse affiche 50, et le bilan compte l’entrée, le retrait et le remboursement',async()=>{
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const caisse=await screen.findByRole('article',{name:'Pour investir'});
 expect(caisse.textContent).toMatch(/50USD disponibles/);
 const bilan=screen.getByRole('region',{name:/Mon bilan/});
 const ligne=(t:string)=>within(bilan).getByText(t).closest('div')!.textContent;
 expect(ligne('Entré dans les caisses')).toMatch(/220 USD/);
 expect(ligne('Investi')).toMatch(/150 USD/);
 expect(ligne('Remboursé sur les dettes')).toMatch(/40 USD/);
});

it('Supprimer un objectif : confirmation, disparition, « Annuler » le fait revenir ; le bilan garde son historique',async()=>{
 const {fireEvent,waitFor}=await import('@testing-library/react');
 let archive=false;
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:archive?{...suivi,savings_goals:[],archived_goals:suivi.savings_goals}:{...suivi,archived_goals:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:compteurs,error:null};
  if(f==='hd_finance_goal_archive'){archive=a.p_archive as boolean;return {data:{goal_id:a.p_goal_id,archived_at:archive?new Date().toISOString():null},error:null};}
  throw Error(f);});
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Supprimer cet objectif'}));
 const boite=screen.getByRole('alertdialog');
 expect(boite.textContent).toMatch(/Supprimer « Moto-taxi » \?/);expect(boite.textContent).toMatch(/2 versements/);
 fireEvent.click(within(boite).getByRole('button',{name:'Supprimer'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_goal_archive',expect.objectContaining({p_goal_id:GI,p_archive:true})));
 expect(await screen.findByText(/« Moto-taxi » est supprimé/)).toBeInTheDocument();
 expect(screen.queryByRole('region',{name:'Moto-taxi'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Annuler'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_goal_archive',expect.objectContaining({p_goal_id:GI,p_archive:false})));
 expect(await screen.findByRole('region',{name:'Moto-taxi'})).toBeInTheDocument();
});

it('Mes compteurs : un objectif supprimé ne s’affiche plus, mais son historique reste dans le bilan',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[],archived_goals:suivi.savings_goals,debts:[],archived_debts:suivi.debts},error:null};
  if(f==='hd_finance_counters_get')return {data:compteurs,error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 await screen.findByRole('article',{name:'Dîme'});
 expect(screen.queryByRole('article',{name:'Pour investir'})).toBeNull();
 const bilan=screen.getByRole('region',{name:/Mon bilan/});
 const ligne=(t:string)=>within(bilan).getByText(t).closest('div')!.textContent;
 expect(ligne('Entré dans les caisses')).toMatch(/220 USD/);
 expect(ligne('Investi')).toMatch(/150 USD/);
 expect(ligne('Remboursé sur les dettes')).toMatch(/40 USD/);
});

it('Supprimer une dette : confirmation avec ses remboursements, puis elle disparaît de la liste et du total',async()=>{
 const {fireEvent,waitFor}=await import('@testing-library/react');
 let archive=false;
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:archive?{...suivi,debts:[],archived_debts:suivi.debts}:suivi,error:null};
  if(f==='hd_finance_counters_get')return {data:compteurs,error:null};
  if(f==='hd_finance_debt_archive'){archive=a.p_archive as boolean;return {data:{debt_id:a.p_debt_id,archived_at:null},error:null};}
  throw Error(f);});
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/dettes']}><SuiviEpargneDettes mode="dettes" userId="u"/></MemoryRouter>);
 const fiche=await screen.findByRole('article',{name:'Papy'});
 fireEvent.click(within(fiche).getAllByRole('button')[0]!);
 fireEvent.click(within(fiche).getByRole('button',{name:'Supprimer cette dette'}));
 const boite=screen.getByRole('alertdialog');
 expect(boite.textContent).toMatch(/1 remboursement \(40 USD\) restent comptés/);
 fireEvent.click(within(boite).getByRole('button',{name:'Supprimer'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_debt_archive',expect.objectContaining({p_debt_id:D,p_archive:true})));
 await waitFor(()=>expect(screen.queryByRole('article',{name:'Papy'})).toBeNull());
 expect(screen.queryByText(/Il reste à rembourser/)).toBeNull();
});

it('un objectif déjà dépassé affiche son excédent et bloque les nouveaux versements',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[{
   ...suivi.savings_goals[0],target_amount:'100.00',
   entries:[{entry_id:id(1),amount:'120.00',date_locale:auj}]
  }]},error:null};
  if(f==='hd_finance_counters_get')return {data:{...compteurs,withdrawals:[]},error:null};
  throw Error(f);
 });
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const resume=await screen.findByRole('region',{name:'Moto-taxi'});
 expect(within(resume).getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
 expect(within(resume).getByRole('status').textContent).toMatch(/Excédent de 20 USD/);
 expect(within(resume).getByRole('status').textContent).toMatch(/versements déjà enregistrés/);
 expect(screen.queryByRole('button',{name:'Ajouter à mon épargne'})).not.toBeInTheDocument();
});

it('préremplissage 25 USD : exige un choix entre Voiture et Achat maison avant de créer le versement',async()=>{
 const voiture={...suivi.savings_goals[0],goal_id:'5f1c2a4e-1111-4c3b-9a55-000000000011',label:'Voiture',target_amount:'1000.00',entries:[]};
 const maison={...suivi.savings_goals[0],goal_id:'5f1c2a4e-1111-4c3b-9a55-000000000012',label:'Achat maison',target_amount:'2000.00',entries:[]};
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[voiture,maison]},error:null};
  if(f==='hd_finance_counters_get')return {data:{...compteurs,withdrawals:[]},error:null};
  if(f==='hd_finance_savings_entry_add')return {data:{entry_id:a.p_request_id,goal_id:a.p_goal_id,amount:a.p_amount,date_locale:a.p_date_locale},error:null};
  throw Error(f);
 });
 const {fireEvent,waitFor}=await import('@testing-library/react');
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne?montant=25&devise=USD&type=epargne_investir']}>
  <SuiviEpargneDettes mode="epargne" userId="u"/>
 </MemoryRouter>);
 expect(await screen.findByText(/Sélectionne Voiture, Maison ou l’objectif approprié/)).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Ajouter à mon épargne'})).toBeNull();
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_savings_entry_add',expect.anything());
 fireEvent.click(screen.getByRole('button',{name:'Achat maison'}));
 expect(screen.getByLabelText('Montant mis de côté')).toHaveValue(25);
 fireEvent.click(screen.getByRole('button',{name:'Ajouter à mon épargne'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_savings_entry_add',expect.objectContaining({
  p_goal_id:maison.goal_id,p_amount:'25.00'
 })));
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_savings_entry_add',expect.objectContaining({p_goal_id:voiture.goal_id}));
});
