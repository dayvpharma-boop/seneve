import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {SuiviEpargneDettes} from '@/components/SuiviEpargneDettes';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));

afterEach(()=>{
  cleanup();
  rpc.mockReset();
});

it('calcule et conserve le rythme hebdomadaire à côté des dettes mensuelles existantes',async()=>{
  const enrollmentId='a58c18be-22d3-4e33-8a73-554fdfd693af';
  const dettes=[{
    debt_id:'7c011210-b780-41a4-9ec4-8f6566b27755',
    debt_number:1,opening_balance:'120.00',currency:'USD',creditor_name:null as string|null,
    monthly_basis:'600.00' as string|null,repayment_percent:'10.00' as string|null,
    weekly_basis:null as string|null,weekly_repayment_percent:null as string|null,payments:[]
  }];
  rpc.mockImplementation(async (fonction:string,args:Record<string,string|null>)=>{
    if (fonction==='hd_finance_tracker_get') {
      return {data:{enrollment_id:enrollmentId,savings_goals:[],debts:[...dettes]},error:null};
    }
    if (fonction==='hd_finance_debt_add_named') {
      const dette={...dettes[0]!,debt_id:args.p_request_id!,debt_number:2,opening_balance:args.p_opening_balance!,
        monthly_basis:null,repayment_percent:null,weekly_basis:args.p_weekly_basis??null,weekly_repayment_percent:'10.00',creditor_name:args.p_creditor_name??null};
      dettes.push(dette);
      return {data:dette,error:null};
    }
    if(fonction==='hd_finance_counters_get')return {data:null,error:{code:'PGRST202',message:'Could not find the function'}}; throw Error(fonction);
  });

  render(<MemoryRouter><SuiviEpargneDettes mode="dettes" userId="participant"/></MemoryRouter>);
  expect(await screen.findByText(/60.*par mois/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'+ Ajouter'}));
  fireEvent.click(screen.getByText('Définir un repère de remboursement'));
  fireEvent.change(screen.getByLabelText('Salaire net du mois'),{target:{value:'600'}});
  fireEvent.change(screen.getByLabelText('Situation de revenu'),{target:{value:'hebdomadaire'}});
  const benefice=screen.getByLabelText('Bénéfice net de la semaine') as HTMLInputElement;
  expect(benefice.value).toBe('');
  fireEvent.change(benefice,{target:{value:'150'}});
  fireEvent.change(screen.getByLabelText('Pourcentage consacré à cette dette'),{target:{value:'10'}});
  expect(screen.getByText(/15.*par semaine/)).toBeVisible();

  fireEvent.change(screen.getByLabelText('Nom du créancier'),{target:{value:'Fournisseur A'}});
  fireEvent.change(screen.getByLabelText('Montant dû'),{target:{value:'300'}});
  // Le franc congolais est proposé d’abord : cette dette est en dollars.
  fireEvent.click(screen.getByLabelText('Monnaie'));
  fireEvent.click(within(screen.getByRole('dialog',{name:'Monnaie'})).getAllByRole('option',{name:/Dollar américain/})[0]!);
  fireEvent.click(screen.getByRole('button',{name:'Ajouter cette dette'}));
  await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_debt_add_named',expect.objectContaining({
    p_enrollment_id:enrollmentId,p_creditor_name:'Fournisseur A',p_monthly_basis:null,p_weekly_basis:'150.00',p_repayment_percent:'10'
  })));
  expect(await screen.findByRole('article',{name:'Fournisseur A'})).toBeVisible();
  expect(screen.getByText(/15.*par semaine/)).toBeVisible();
  expect(screen.getByText(/60.*par mois/)).toBeVisible();
},20000);

it('ajoute un nom à une dette existante et la présélectionne pour le remboursement',async()=>{
  const enrollmentId='a58c18be-22d3-4e33-8a73-554fdfd693af';
  const debtId='7c011210-b780-41a4-9ec4-8f6566b27755';
  const dettes=[
    {debt_id:'7c011210-b780-41a4-9ec4-8f6566b27756',debt_number:1,opening_balance:'30.00',creditor_name:'Banque locale'},
    {debt_id:debtId,debt_number:2,opening_balance:'120.00',creditor_name:null}
  ].map(d=>({...d,currency:'USD',monthly_basis:null,repayment_percent:null,payments:[]}));
  rpc.mockImplementation(async (fonction:string,args:Record<string,string|null>)=>{
    if (fonction==='hd_finance_tracker_get') {
      return {data:{enrollment_id:enrollmentId,savings_goals:[],debts:dettes},error:null};
    }
    if (fonction==='hd_finance_debt_rename') {
      return {data:{debt_id:args.p_debt_id,creditor_name:args.p_creditor_name},error:null};
    }
    if(fonction==='hd_finance_counters_get')return {data:null,error:{code:'PGRST202',message:'Could not find the function'}}; throw Error(fonction);
  });

  render(<MemoryRouter><SuiviEpargneDettes mode="dettes" userId="participant"/></MemoryRouter>);
  const fiche=await screen.findByRole('article',{name:'Dette 2'});
  fireEvent.click(within(fiche).getAllByRole('button')[0]!);
  fireEvent.click(within(fiche).getByRole('button',{name:'Ajouter un nom'}));
  fireEvent.change(within(fiche).getByLabelText('Nom du créancier'),{target:{value:' Fournisseur B '}});
  fireEvent.click(within(fiche).getByRole('button',{name:'Enregistrer le nom'}));
  const renommee=await screen.findByRole('article',{name:'Fournisseur B'});
  expect(rpc).toHaveBeenCalledWith('hd_finance_debt_rename',{
    p_enrollment_id:enrollmentId,p_debt_id:debtId,p_creditor_name:'Fournisseur B'
  });
  // La fiche reste ouverte : le remboursement se note directement sur la dette renommée.
  expect(within(renommee).getByLabelText('Montant payé')).toBeVisible();
  expect(within(renommee).getByRole('button',{name:'Enregistrer le paiement'})).toBeVisible();
});

it('un repère de paiement de 180 USD est plafonné au solde restant de 20 USD',async()=>{
 const enrollmentId='a58c18be-22d3-4e33-8a73-554fdfd693af';
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:enrollmentId,savings_goals:[],debts:[{
   debt_id:'7c011210-b780-41a4-9ec4-8f6566b27755',debt_number:1,
   opening_balance:'50.00',currency:'USD',creditor_name:'Fournisseur',
   monthly_basis:'600.00',repayment_percent:'30.00',weekly_basis:null,weekly_repayment_percent:null,
   payments:[{payment_id:'caaa5555-0000-4000-8000-000000000001',amount:'30.00',date_locale:'2026-11-01'}]
  }]},error:null};
  if(f==='hd_finance_counters_get')return {data:null,error:{code:'PGRST202',message:'Could not find the function'}}; throw Error(f);
 });
 render(<MemoryRouter><SuiviEpargneDettes mode="dettes" userId="participant"/></MemoryRouter>);
 const fiche=await screen.findByRole('article',{name:'Fournisseur'});
 expect(fiche.textContent).toMatch(/20.*par mois/);
 expect(fiche.textContent).not.toMatch(/180.*par mois/);
});
