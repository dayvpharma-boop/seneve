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
 // Un remboursement n'est JAMAIS déclaré sans un choix explicite du participant.
 expect(within(feuille).getByRole('checkbox',{name:/Dettes/})).not.toBeChecked();
 fireEvent.click(within(feuille).getByRole('checkbox',{name:/Dettes/}));
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
 fireEvent.click(within(bilan).getByRole('radio',{name:'Année'}));
 expect(within(bilan).getByText('Donné').closest('div')!.textContent).toMatch(/50 USD/);
});

it('si la base n’a pas encore les compteurs, la page l’explique sans erreur',async()=>{
 rpc.mockImplementation(async(f:string)=>{if(f==='hd_finance_tracker_get')return {data:suivi,error:null};return {data:null,error:{code:'PGRST202',message:'Could not find the function'}};});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 expect(await screen.findByText(/Les compteurs arrivent bientôt/)).toBeInTheDocument();
});

it('« Mes compteurs » montre aussi les objectifs « Autre objectif »',async()=>{
 const autre={goal_id:'5f1c2a4e-2222-4c3b-9a55-000000000002',goal_type:'autre',label:'Toiture',target_amount:'500.00',currency:'USD',entries:[{entry_id:id(5),amount:'80.00',date_locale:'2026-11-07'}]};
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[...suivi.savings_goals,autre]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
  throw Error(f);});
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const carte=await screen.findByRole('article',{name:'Autre objectif'});
 expect(carte.textContent).toMatch(/Toiture/);expect(carte.textContent).toMatch(/80USD disponibles/);
});

it('la répartition s’enregistre à la date choisie, jamais dans le futur',async()=>{
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:suivi,error:null};
  if(f==='hd_finance_allocation_save')return {data:{allocation_id:a.p_request_id,deja:false},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
  throw Error(f);});
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'100'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma répartition'}));
 const feuille=await screen.findByRole('dialog');
 await within(feuille).findByText(/Kanza/);
 fireEvent.change(within(feuille).getByLabelText('Date de la répartition'),{target:{value:'2999-01-01'}});
 fireEvent.click(within(feuille).getByRole('button',{name:/^Enregistrer \d+ part/}));
 expect(await within(feuille).findByText(/pas dans le futur/)).toBeInTheDocument();
 fireEvent.change(within(feuille).getByLabelText('Date de la répartition'),{target:{value:'2026-11-02'}});
 fireEvent.click(within(feuille).getByRole('button',{name:/^Enregistrer \d+ part/}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_allocation_save',expect.objectContaining({p_date_locale:'2026-11-02'})));
});

it('Ma répartition propose « Autre objectif » et l’envoie vers l’objectif choisi',async()=>{
 const t1={goal_id:'5f1c2a4e-3333-4c3b-9a55-000000000003',goal_type:'autre',label:'Toiture',target_amount:'500.00',currency:'USD',entries:[]};
 const t2={goal_id:'5f1c2a4e-4444-4c3b-9a55-000000000004',goal_type:'autre',label:'École',target_amount:'300.00',currency:'USD',entries:[]};
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[...suivi.savings_goals,t1,t2]},error:null};
  if(f==='hd_finance_allocation_save')return {data:{allocation_id:a.p_request_id,deja:false},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
  throw Error(f);});
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000'}});
 for(let i=0;i<2;i++)fireEvent.click(screen.getByRole('button',{name:'Augmenter : Autre objectif'}));
 expect(screen.getByRole('region',{name:'Base retenue'}).textContent).toMatch(/Autre objectif.*100.*10 %/);
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma répartition'}));
 const feuille=await screen.findByRole('dialog');
 await within(feuille).findByText(/objectif « Toiture »/);
 fireEvent.change(within(feuille).getByLabelText('Quel autre objectif ?'),{target:{value:t2.goal_id}});
 expect(within(feuille).getByText(/objectif « École »/)).toBeInTheDocument();
 fireEvent.click(within(feuille).getByRole('button',{name:/^Enregistrer \d+ part/}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_allocation_save',expect.objectContaining({p_parts:expect.arrayContaining([{part:'autre',goal_id:t2.goal_id,amount:'100.00'}])})));
});

it('un excédent de la part Dettes reste au participant et passe à « Pour vivre » seulement sur choix explicite',async()=>{
 const detteCourte={...suivi,debts:[{...suivi.debts[0]!,opening_balance:'20.00'}]};
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:detteCourte,error:null};
  if(f==='hd_finance_allocation_save')return {data:{allocation_id:a.p_request_id,deja:false},error:null};
  throw Error(f);
 });
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition?lang=fr']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'500'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma répartition'}));
 const feuille=await screen.findByRole('dialog');
 const dette=await within(feuille).findByRole('checkbox',{name:/^Dettes/});
 const surplus=within(feuille).getByRole('checkbox',{name:/Excédent de la part Dettes/});
 expect(dette).not.toBeChecked();
 expect(surplus).not.toBeChecked();
 expect(within(feuille).getByText(/Disponible pour vivre/)).toBeInTheDocument();
 // Base 500, part dettes 75, dette existante 20, surplus 55.
 expect(surplus.closest('li')!.textContent).toMatch(/55\s?USD/);
 fireEvent.click(dette);
 fireEvent.click(surplus);
 fireEvent.click(within(feuille).getByRole('button',{name:/Enregistrer 5 parts · 400 USD/}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_allocation_save',expect.objectContaining({p_parts:[
  {part:'dime',amount:'50.00'},{part:'reserve_joie',goal_id:G,amount:'50.00'},
  {part:'dettes',debt_id:D1,amount:'20.00'},
  {part:'vivre',amount:'55.00'},{part:'vivre',amount:'225.00'}
 ]})));
});

it('avec Voiture et Achat maison, la répartition ne choisit jamais Voiture par défaut et permet de verser sur Maison',async()=>{
 const voiture='5f1c2a4e-1111-4c3b-9a55-000000000011',maison='5f1c2a4e-1111-4c3b-9a55-000000000012';
 const objectifs=[...suivi.savings_goals,
  {goal_id:voiture,goal_type:'epargne_investir',label:'Voiture',target_amount:'1000.00',currency:'USD',entries:[]},
  {goal_id:maison,goal_type:'epargne_investir',label:'Achat maison',target_amount:'3000.00',currency:'USD',entries:[]}];
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:objectifs},error:null};
  if(f==='hd_finance_allocation_save')return {data:{allocation_id:a.p_request_id,deja:false},error:null};
  throw Error(f);
 });
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000'}});
 fireEvent.change(screen.getByLabelText('Coût des marchandises vendues'),{target:{value:'400'}});
 fireEvent.change(screen.getByLabelText('Charges du commerce'),{target:{value:'100'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer ma répartition'}));
 const feuille=await screen.findByRole('dialog');
 const destination=await within(feuille).findByLabelText('Choisir l’objectif : Pour investir') as HTMLSelectElement;
 expect(destination.value).toBe('');
 const part=within(feuille).getByRole('checkbox',{name:/^Pour investir/});
 expect(part).toBeDisabled();
 expect(within(feuille).getByRole('option',{name:'Voiture'})).toBeInTheDocument();
 expect(within(feuille).getByRole('option',{name:'Achat maison'})).toBeInTheDocument();
 fireEvent.change(destination,{target:{value:maison}});
 expect(destination.value).toBe(maison);
 expect(within(feuille).getByRole('checkbox',{name:/^Pour investir/})).toBeChecked();
 fireEvent.click(within(feuille).getByRole('button',{name:/Enregistrer 4 parts · 425 USD/}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_allocation_save',expect.objectContaining({
  p_parts:[{part:'dime',amount:'50.00'},{part:'reserve_joie',goal_id:G,amount:'50.00'},
   {part:'epargne_investir',goal_id:maison,amount:'100.00'},{part:'vivre',amount:'225.00'}]
 })));
 const payload=rpc.mock.calls.find(c=>c[0]==='hd_finance_allocation_save')?.[1];
 expect(JSON.stringify(payload)).not.toContain(voiture);
});

it('la version anglaise distingue aussi deux objectifs d’investissement',async()=>{
 const voiture='5f1c2a4e-1111-4c3b-9a55-000000000011',maison='5f1c2a4e-1111-4c3b-9a55-000000000012';
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{...suivi,savings_goals:[
   ...suivi.savings_goals,
   {goal_id:voiture,goal_type:'epargne_investir',label:'Car',target_amount:'1000.00',currency:'USD',entries:[]},
   {goal_id:maison,goal_type:'epargne_investir',label:'House',target_amount:'3000.00',currency:'USD',entries:[]}
  ]},error:null};
  throw Error(f);
 });
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition?lang=en']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Sales received'),{target:{value:'500'}});
 fireEvent.click(screen.getByRole('button',{name:'Save my allocation'}));
 const feuille=await screen.findByRole('dialog');
 const choix=await within(feuille).findByLabelText('Choose goal: For investing') as HTMLSelectElement;
 expect(choix.value).toBe('');
 fireEvent.change(choix,{target:{value:maison}});
 expect(choix.value).toBe(maison);
 expect(within(feuille).getByRole('checkbox',{name:/^For investing/})).toBeChecked();
});
