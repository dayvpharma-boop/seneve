import {cleanup,render,screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {SuiviEpargneDettes} from '@/components/SuiviEpargneDettes';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
afterEach(()=>{cleanup();rpc.mockReset();});

it('un petit remboursement affiche une décimale (0,4 %) au lieu de 0 %',async()=>{
  const dette={debt_id:'7c011210-b780-41a4-9ec4-8f6566b27755',debt_number:1,opening_balance:'9585.00',currency:'USD',creditor_name:'Papy',
    monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,
    payments:[{payment_id:'0b6f3c1e-0003-4c3b-9a55-000000000000',amount:'35.00',date_locale:'2026-11-18',created_at:'2026-11-18T10:00:00Z'}]};
  rpc.mockImplementation(async (fonction:string)=>{
    if(fonction==='hd_finance_tracker_get')return {data:{enrollment_id:'a58c18be-22d3-4e33-8a73-554fdfd693af',savings_goals:[],debts:[dette]},error:null};
    if(fonction==='hd_finance_counters_get')return {data:null,error:{code:'PGRST202',message:'Could not find the function'}};
    throw Error(fonction);
  });
  render(<MemoryRouter><SuiviEpargneDettes mode="dettes" userId="participant"/></MemoryRouter>);
  await screen.findByText(/Déjà remboursé/);
  const pcts=[...document.querySelectorAll('span')].map(s=>s.textContent).filter(t=>t&&t.includes('%'));
  expect(pcts).toEqual(['0,4 %','0,4 %']);
  expect(screen.queryByText('0 %')).toBeNull();
});
