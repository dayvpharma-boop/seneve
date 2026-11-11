import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {moisPrecedent,moisSuivant,totauxDuMois,type Depense} from '@/lib/habitudes-finances-depenses';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af';
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const mois=new Intl.DateTimeFormat('en-CA').format(new Date()).slice(0,7);
const dep=(n:number,category:string,amount:string,date:string,liee=true,note:string|null=null)=>({expense_id:id(n),category,amount,currency:'USD',date_locale:date,note,liee,created_at:date+'T10:00:00Z'});

it('totaux du mois par catégorie, dans une seule monnaie, et navigation entre les mois',()=>{
 const d=[dep(1,'nourriture','12.50','2026-11-03'),dep(2,'nourriture','7.50','2026-11-09'),dep(3,'transport','5','2026-11-09'),dep(4,'logement','100','2026-10-05'),{...dep(5,'sante','9','2026-11-01'),currency:'CDF'}] as Depense[];
 const t=totauxDuMois(d,'2026-11','USD');
 expect(t.total).toBe(2500);
 expect(t.parCategorie.nourriture).toBe(2000);
 expect(t.parCategorie.sante).toBe(0);
 expect(moisPrecedent('2026-01')).toBe('2025-12');
 expect(moisSuivant('2026-12')).toBe('2027-01');
});

it('noter une dépense : catégorie obligatoire, envoi au serveur, caisse Pour vivre annoncée, puis annulation confirmée',async()=>{
 let depenses=[dep(1,'logement','250',`${mois}-01`),dep(2,'ecole','120',`${mois}-01`,false,'Frais')];
 rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:E,savings_goals:[],debts:[],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{enrollment_id:E,moves:[{move_id:id(50),envelope:'vivre',direction:'entree',motif:null,amount:'1000.00',currency:'USD',date_locale:`${mois}-01`,remise_a_zero:false,allocation_id:null}],withdrawals:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:depenses,error:null};
  if(f==='hd_finance_expense_add'){depenses=[dep(3,String(a.p_category),String(a.p_amount),String(a.p_date_locale)),...depenses];return {data:{expense_id:a.p_request_id,liee:true,balance:'975.00'},error:null};}
  if(f==='hd_finance_expense_void'){depenses=depenses.filter(d=>d.expense_id!==a.p_expense_id);return {data:{annulee:true},error:null};}
  throw Error(f);});
 const {HabitudesDepenses}=await import('@/routes/habitudes-depenses');
 render(<MemoryRouter initialEntries={['/habitudes/depenses']}><HabitudesDepenses userId="u"/></MemoryRouter>);
 expect((await screen.findByText(/Dépensé ce mois/)).parentElement!.textContent).toMatch(/370 USD/);
 expect(screen.getByText(/hors caisse Pour vivre/)).toBeInTheDocument();

 fireEvent.click(screen.getByRole('button',{name:/Noter une dépense/}));
 fireEvent.change(screen.getByLabelText('Montant'),{target:{value:'25'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer la dépense'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Choisis une catégorie.');
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_expense_add',expect.anything());

 fireEvent.click(within(screen.getByRole('radiogroup',{name:'Catégorie'})).getByRole('radio',{name:'Transport'}));
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer la dépense'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_expense_add',expect.objectContaining({p_enrollment_id:E,p_category:'transport',p_amount:'25',p_currency:'USD',p_note:null})));
 expect(await screen.findByRole('status')).toHaveTextContent(/25 USD notés en transport\. Ta caisse Pour vivre : 975 USD\./);
 expect(screen.getByText(/Dépensé ce mois/).parentElement!.textContent).toMatch(/395 USD/);

 const confirmer=vi.spyOn(window,'confirm').mockReturnValue(true);
 fireEvent.click(screen.getByRole('button',{name:'Annuler la dépense Transport'}));
 expect(confirmer).toHaveBeenCalledWith(expect.stringMatching(/revient dans ta caisse Pour vivre/));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_expense_void',{p_enrollment_id:E,p_expense_id:id(3)}));
 await waitFor(()=>expect(screen.getByText(/Dépensé ce mois/).parentElement!.textContent).toMatch(/370 USD/));
 confirmer.mockRestore();
});
