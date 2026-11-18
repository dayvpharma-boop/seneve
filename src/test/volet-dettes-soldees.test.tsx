import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const dette=(n:number,nom:string,ouv:string,paye:string|null)=>({debt_id:id(n),debt_number:n,opening_balance:ouv,currency:'USD',creditor_name:nom,monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,
 payments:paye?[{payment_id:id(n+50),amount:paye,date_locale:'2026-11-18',created_at:'2026-11-18T10:00:00Z'}]:[]});
it('le volet compte la dette soldée dans le total (0,4 % remboursé), mais ne la liste plus',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:'a58c18be-22d3-4e33-8a73-554fdfd693af',savings_goals:[],debts:[dette(1,'Soldée','35.00','35.00'),dette(2,'Papa Emma','9550.00',null)]},error:null};
  if(f==='hd_finance_counters_get')return {data:null,error:{code:'PGRST202',message:'Could not find the function'}};
  throw Error(f);});
 const {VoletFinanceHabitudes}=await import('@/components/VoletFinanceHabitudes');
 render(<MemoryRouter><VoletFinanceHabitudes langue="fr"/></MemoryRouter>);
 const volet=document.getElementById('hd-epargne') as HTMLDetailsElement;volet.open=true;fireEvent(volet,new Event('toggle'));
 fireEvent.click(await screen.findByRole('tab',{name:'Dettes'}));
 expect(await screen.findByText(/0,4 % remboursé/)).toBeTruthy();
 expect(document.body.textContent).toMatch(/sur 9\s585 USD/);
 expect(screen.queryByText('Soldée')).toBeNull();
});
