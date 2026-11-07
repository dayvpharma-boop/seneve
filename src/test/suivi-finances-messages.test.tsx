import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {SuiviEpargneDettes,dateLisible} from '@/components/SuiviEpargneDettes';

const {rpc,cadre}=vi.hoisted(()=>({rpc:vi.fn(),cadre:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:(p:{children:ReactNode})=>{cadre(p);return <>{p.children}</>;}}));
afterEach(()=>{cleanup();rpc.mockReset();cadre.mockReset();});

const inscription='a58c18be-22d3-4e33-8a73-554fdfd693af';
const objectif={goal_id:'5f1c2a4e-1111-4c3b-9a55-000000000001',goal_type:'reserve_joie',label:'Réserve',target_amount:'100.00',currency:'USD',entries:[{entry_id:'0b6f3c1e-2222-4c3b-9a55-000000000002',amount:'25.00',date_locale:'2026-11-07'}]};
const dette={debt_id:'7c011210-b780-41a4-9ec4-8f6566b27755',debt_number:1,opening_balance:'120.00',currency:'USD',creditor_name:'Banque',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[{payment_id:'0b6f3c1e-3333-4c3b-9a55-000000000003',amount:'20.00',date_locale:'2026-11-05'}]};
function charger(){rpc.mockImplementation(async(f:string)=>{if(f==='hd_finance_tracker_get')return {data:{enrollment_id:inscription,savings_goals:[objectif],debts:[dette]},error:null};throw Error(f);});}

it('écrit les dates en toutes lettres',()=>{
 expect(dateLisible('2026-11-07',false)).toBe('7 novembre 2026');
 expect(dateLisible('2026-11-07',true)).toBe('7 November 2026');
});
it('la flèche retour et l’onglet Aujourd’hui ramènent à la journée',async()=>{
 charger();render(<MemoryRouter><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 await screen.findByRole('button',{name:'Ajouter à mon épargne'});
 const props=cadre.mock.calls.at(-1)![0];
 expect(props.retour).toBe('/espace');expect(props.liens).toEqual({aujourdhui:'/espace'});expect(props.actif).toBe('aujourdhui');
 expect(screen.getByText('7 novembre 2026')).toBeInTheDocument();
});
it('un versement refusé s’explique sous son formulaire, sans appel au serveur',async()=>{
 charger();render(<MemoryRouter><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const bouton=await screen.findByRole('button',{name:'Ajouter à mon épargne'});
 fireEvent.submit(bouton.closest('form')!);
 const alerte=within(bouton.closest('form')!).getByRole('alert');
 expect(alerte.textContent).toContain('Écris un montant plus grand que 0');
 expect(rpc).toHaveBeenCalledTimes(1);
});
it('un remboursement trop grand s’explique sous son formulaire, avec des dates lisibles dans l’historique',async()=>{
 charger();render(<MemoryRouter><SuiviEpargneDettes mode="dettes" userId="u"/></MemoryRouter>);
 const fiche=await screen.findByRole('article',{name:'Banque'});
 fireEvent.click(within(fiche).getAllByRole('button')[0]!);
 const bouton=within(fiche).getByRole('button',{name:'Enregistrer le paiement'});
 fireEvent.change(screen.getByLabelText('Montant payé'),{target:{value:'500'}});
 fireEvent.submit(bouton.closest('form')!);
 expect(within(bouton.closest('form')!).getByRole('alert').textContent).toContain('dépasse le solde restant');
 expect(screen.getByText('5 novembre 2026')).toBeInTheDocument();
});
