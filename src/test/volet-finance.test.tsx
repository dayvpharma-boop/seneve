import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

/** Volet « SÉNEVÉ Finance » de la page Aujourd'hui (demande du 08/11/2026) : épargne, dettes et simulateur au même endroit,
 * avec les mêmes montants que les pages SÉNEVÉ Finance et SÉNEVÉ Suivi des dettes. */
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});
const E='a58c18be-22d3-4e33-8a73-554fdfd693af',G='5f1c2a4e-1111-4c3b-9a55-000000000001';
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
beforeEach(()=>rpc.mockImplementation(async(f:string)=>{
 if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,archived_goals:[],archived_debts:[],
  savings_goals:[{goal_id:G,goal_type:'epargne_investir',label:'Moto-taxi',target_amount:'1000.00',currency:'USD',entries:[{entry_id:id(1),amount:'200.00',date_locale:'2026-11-01'}]}],
  debts:[{debt_id:id(2),debt_number:1,opening_balance:'200.00',currency:'USD',creditor_name:'Papy',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[{payment_id:id(3),amount:'50.00',date_locale:'2026-11-02'}]},
   {debt_id:id(4),debt_number:2,opening_balance:'100.00',currency:'USD',creditor_name:'Soldée',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[{payment_id:id(5),amount:'100.00',date_locale:'2026-11-02'}]}]},error:null};
 if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[{withdrawal_id:id(6),goal_id:G,motif:'investi',amount:'50.00',date_locale:'2026-11-03',remise_a_zero:false}]},error:null};
 throw Error(f);}));

it('« SÉNEVÉ Finance » remplace « Épargne » et montre épargne, dettes et simulateur',async()=>{
 const {VoletFinanceHabitudes}=await import('@/components/VoletFinanceHabitudes');
 render(<MemoryRouter><VoletFinanceHabitudes langue="fr"/></MemoryRouter>);
 const volet=document.getElementById('hd-epargne') as HTMLDetailsElement;
 expect(volet.querySelector('summary')!.textContent).toBe('SÉNEVÉ Finance');
 expect(rpc).not.toHaveBeenCalled(); // rien n'est chargé tant que le volet est fermé
 volet.open=true;fireEvent(volet,new Event('toggle'));
 const onglets=screen.getByRole('tablist',{name:'SÉNEVÉ Finance'});
 expect(within(onglets).getAllByRole('tab').map(t=>t.textContent)).toEqual(['Épargne','Dettes','Simulateur']);
 // Épargne : 200 versés − 50 retirés = 150 sur 1 000 (comme dans SÉNEVÉ Finance).
 const epargne=await screen.findByRole('tabpanel',{name:'Épargne'});
 await waitFor(()=>expect(epargne.textContent).toMatch(/Moto-taxi.*150 USD sur 1\s?000 USD.*15 %/));
 expect(within(epargne).getByRole('link',{name:'Ouvrir SÉNEVÉ Finance'})).toHaveAttribute('href','/habitudes/epargne');
 // Dettes : seulement celles qui restent à rembourser.
 fireEvent.click(within(onglets).getByRole('tab',{name:'Dettes'}));
 const dettes=screen.getByRole('tabpanel',{name:'Dettes'});
 expect(dettes.textContent).toMatch(/Il reste à rembourser150 USD/);
 expect(dettes.textContent).toMatch(/Papy.*Reste 150 USD.*25 %/);
 expect(dettes.textContent).not.toMatch(/Soldée/);
 expect(within(dettes).getByRole('link',{name:'Ouvrir SÉNEVÉ Suivi des dettes'})).toHaveAttribute('href','/habitudes/dettes');
 fireEvent.click(within(onglets).getByRole('tab',{name:'Simulateur'}));
 expect(screen.getByRole('tabpanel',{name:'Simulateur'}).querySelector('.sim-ios')).not.toBeNull();
 expect(screen.getByRole('link',{name:/SÉNEVÉ Compte/})).toHaveAttribute('href','/habitudes/compteurs');
 expect(screen.getByRole('link',{name:/SÉNEVÉ Répartition/})).toHaveAttribute('href','/habitudes/repartition');
 expect(rpc.mock.calls.filter(([f])=>f==='hd_finance_tracker_get')).toHaveLength(1);
},20000);
