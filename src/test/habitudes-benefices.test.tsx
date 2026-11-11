import {cleanup,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {bilanDuMois,derniersMois} from '@/lib/habitudes-finances-benefices';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
const mois=new Intl.DateTimeFormat('en-CA').format(new Date()).slice(0,7);
const vente=(id:string,date:string,gross:string,goods:string,other:string,charges:string,currency='USD')=>({id,currency,date_locale:date,gross,goods,other,charges});

it('bénéfice = ventes − marchandises − autres frais − charges payées, par monnaie et par mois (perte possible)',()=>{
 const b={ventes:[vente('1','2026-11-02','500','200','20','100'),vente('2','2026-11-09','300','100','0','0'),vente('3','2026-10-05','50','80','0','0'),vente('4','2026-11-03','9','1','0','0','CDF')],revenus:[]};
 expect(bilanDuMois(b,'2026-11','USD')).toMatchObject({ventes:80000,marchandises:30000,frais:2000,charges:10000,benefice:38000,nbVentes:2});
 expect(bilanDuMois(b,'2026-10','USD').benefice).toBe(-3000);
 expect(derniersMois('2026-02',3)).toEqual(['2025-12','2026-01','2026-02']);
});

it('écran : bénéfice du mois, marge, calcul détaillé et lien vers Répartition ; sans commerce, revenus reçus',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[vente('1',`${mois}-02`,'500','200','20','100'),vente('2',`${mois}-03`,'300','100','0','0')],revenus:[]},error:null};
  throw Error(f);});
 const {HabitudesBenefices}=await import('@/routes/habitudes-benefices');
 render(<MemoryRouter><HabitudesBenefices userId="u"/></MemoryRouter>);
 const heros=(await screen.findByText('Bénéfice du mois')).parentElement!;
 expect(heros.textContent).toMatch(/380 USD/);
 expect(heros.textContent).toMatch(/Marge : 48 % des ventes · 2 encaissements/);
 const calcul=screen.getByText('Le calcul du mois').nextElementSibling as HTMLElement;
 expect(within(calcul).getByText('Ventes encaissées').closest('li')!.textContent).toMatch(/800USD/);
 expect(within(calcul).getByText('Charges du mois payées').closest('li')!.textContent).toMatch(/− 100USD/);
 expect(screen.getByRole('link',{name:/Noter une vente dans Répartition/})).toHaveAttribute('href','/habitudes/repartition');
 cleanup();

 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:[],revenus:[{id:'r',currency:'USD',date_locale:`${mois}-01`,amount:'1200.00'}]},error:null};
  throw Error(f);});
 render(<MemoryRouter><HabitudesBenefices userId="u"/></MemoryRouter>);
 expect((await screen.findByText('Revenus reçus ce mois')).parentElement!.textContent).toMatch(/1\s?200 USD/);
 expect(screen.queryByText('Le calcul du mois')).toBeNull();
});
