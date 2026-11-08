import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

/** Choix du type en trois cartes et de la monnaie dans une feuille (maquette validée le 08/11/2026). */
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});
const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
beforeEach(()=>rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
 if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
 if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[],withdrawals:[]},error:null};
 if(f==='hd_finance_savings_goal_add')return {data:{goal_id:'5f1c2a4e-1111-4c3b-9a55-000000000009',goal_type:a.p_goal_type,label:a.p_label,target_amount:a.p_target_amount,currency:a.p_currency,entries:[]},error:null};
 throw Error(f);}));

it('Nouvel objectif : on choisit le type en touchant une carte et la monnaie dans la feuille',async()=>{
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const types=await screen.findByRole('radiogroup',{name:'Type d’objectif'});
 expect(within(types).getAllByRole('radio').map(r=>r.querySelector('b')!.textContent)).toEqual(['Réserve de joie','Pour investir','Autre objectif']);
 expect(within(types).getByRole('radio',{name:/Réserve de joie/})).toHaveAttribute('aria-checked','true');
 fireEvent.click(within(types).getByRole('radio',{name:/Pour investir/}));
 expect(within(types).getByRole('radio',{name:/Pour investir/})).toHaveAttribute('aria-checked','true');
 expect(within(types).getByRole('radio',{name:/Réserve de joie/})).toHaveAttribute('aria-checked','false');

 fireEvent.change(screen.getByLabelText('Nom'),{target:{value:'Moto-taxi'}});
 fireEvent.change(screen.getByLabelText('Montant cible'),{target:{value:'1000'}});
 const monnaie=screen.getByLabelText('Monnaie');
 expect(monnaie.textContent).toMatch(/Dollar américain/);
 fireEvent.click(monnaie);
 const feuille=screen.getByRole('dialog',{name:'Monnaie'});
 expect(within(feuille).getAllByRole('option',{name:/Dollar américain/})[0]!).toHaveAttribute('aria-selected','true');
 fireEvent.change(within(feuille).getByRole('searchbox'),{target:{value:'franc'}});
 expect(within(feuille).getByText(/résultats/)).toBeInTheDocument();
 fireEvent.click(within(feuille).getByRole('option',{name:/Franc congolais/}));
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(monnaie.textContent).toMatch(/Franc congolais/);

 fireEvent.click(screen.getByRole('button',{name:'Créer mon objectif'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_savings_goal_add',expect.objectContaining({p_goal_type:'epargne_investir',p_label:'Moto-taxi',p_currency:'CDF'})));
},20000);

it('Annuler ou Échap ferme la feuille sans changer la monnaie',async()=>{
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const monnaie=await screen.findByLabelText('Monnaie');
 fireEvent.click(monnaie);
 fireEvent.click(within(screen.getByRole('dialog',{name:'Monnaie'})).getByRole('button',{name:'Annuler'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.click(monnaie);
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('dialog')).toBeNull();
 expect(monnaie.textContent).toMatch(/Dollar américain/);
},20000);
