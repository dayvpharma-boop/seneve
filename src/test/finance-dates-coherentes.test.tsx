import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {disponibleAuJour} from '@/lib/habitudes-finances-compteurs';

/** Ordre des dates (audit du 10/11/2026) : une sortie datée ne peut pas utiliser de l'argent entré plus tard,
 * ni rendre une caisse négative à une date ultérieure. Même règle que hd_finance_coherence.sql. */
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc,auth:{getUser:vi.fn()}}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

it('disponibleAuJour : solde de la date, borné par le plus petit solde ensuite',()=>{
 const l=[{date:'2026-11-01',centimes:10000},{date:'2026-11-05',centimes:-8000},{date:'2026-11-08',centimes:5000}];
 expect(disponibleAuJour(l,'2026-10-31')).toBe(0);      // rien n'était encore entré
 expect(disponibleAuJour(l,'2026-11-01')).toBe(2000);   // 100 le 1er, mais il ne reste que 20 le 5
 expect(disponibleAuJour(l,'2026-11-06')).toBe(2000);
 expect(disponibleAuJour(l,'2026-11-10')).toBe(7000);   // tout le solde actuel
 expect(disponibleAuJour([],'2026-11-10')).toBe(0);
});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
const auj=new Intl.DateTimeFormat('en-CA').format(new Date());
const hier=new Intl.DateTimeFormat('en-CA').format(new Date(Date.now()-86400000));
beforeEach(()=>{rpc.mockImplementation(async(f:string)=>{
 if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
 if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,withdrawals:[],masques:[],
  moves:[{move_id:'0b6f3c1e-0001-4c3b-9a55-000000000000',envelope:'dime',direction:'entree',motif:null,amount:'20.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null}]},error:null};
 throw Error(f);});});

it('une dépense datée d’hier ne peut pas utiliser la dîme entrée aujourd’hui',async()=>{
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter><HabitudesCompteurs userId="u"/></MemoryRouter>);
 const caisse=await screen.findByRole('article',{name:'Dîme'});
 fireEvent.click(within(caisse).getByRole('button',{expanded:false}));
 fireEvent.change(within(caisse).getByLabelText('Montant utilisé'),{target:{value:'10'}});
 fireEvent.change(within(caisse).getByLabelText('Date'),{target:{value:hier}});
 fireEvent.click(within(caisse).getByRole('button',{name:/Noter 10 USD/}));
 expect(await within(caisse).findByRole('alert')).toHaveTextContent(/n’avait que 0 USD/);
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_envelope_move_add',expect.anything());
});
