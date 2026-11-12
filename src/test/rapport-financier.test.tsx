import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {construireRapport,decaler,periodeDe} from '@/lib/rapport-financier';
import {rapportEnHtml} from '@/lib/rapport-export';

const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();});

const U=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const mv=(n:number,env:'dime'|'offrande'|'vivre',dir:'entree'|'sortie',motif:'donne'|'depense'|null,a:string,d:string)=>({move_id:U(n),envelope:env,direction:dir,motif,amount:a,currency:'USD',date_locale:d,remise_a_zero:false,allocation_id:null});
const suivi={enrollment_id:U(99),savings_goals:[{goal_id:U(50),goal_type:'epargne_investir' as const,label:'Terrain',target_amount:'5000',currency:'USD',entries:[{entry_id:U(51),amount:'300',date_locale:'2026-11-03'}]}],debts:[{debt_id:U(60),debt_number:1,opening_balance:'2000',currency:'USD',creditor_name:'Papa Emma',repere:null,payments:[{payment_id:U(61),amount:'200',date_locale:'2026-11-03'},{payment_id:U(62),amount:'100',date_locale:'2026-10-03'}]}],archived_goals:[],archived_debts:[]};
const cpt={enrollment_id:U(99),moves:[mv(1,'vivre','entree',null,'1500','2026-10-20'),mv(2,'vivre','sortie','depense','42.5','2026-11-10'),mv(3,'dime','entree',null,'250','2026-11-03'),mv(4,'dime','sortie','donne','250','2026-11-08'),mv(5,'vivre','sortie','depense','10','2026-11-11')],withdrawals:[],masques:new Set([U(5)])};
const depenses=[{expense_id:U(20),category:'nourriture' as const,amount:'42.5',currency:'USD',date_locale:'2026-11-10',note:'Marché',liee:true,move_id:U(2),created_at:'2026-11-10T09:00:00Z'},{expense_id:U(21),category:'ecole' as const,amount:'120',currency:'USD',date_locale:'2026-11-12',note:null,liee:false,move_id:null,created_at:'2026-11-12T09:00:00Z'}];
const benefices={ventes:[{id:'v',currency:'USD',date_locale:'2026-11-03',gross:'2500',goods:'1100',other:'50',charges:'300'}],revenus:[],resteARepartir:{USD:'200'}};

it('rapport du mois : résumé, activité, caisses (solde à la fin, ligne masquée hors totaux), dépenses, dettes et détail',()=>{
 const r=construireRapport({suivi,cpt,depenses,benefices},'2026-11-01','2026-11-30','USD');
 expect(r.resume).toMatchObject({encaisse:250000,benefice:105000,reparti:55000,donne:25000,depense:4250,dettes:20000,depensesHorsCaisse:12000,pasReparti:20000});
 expect(r.activite).toMatchObject({ventes:250000,marchandises:110000,frais:5000,charges:30000,benefice:105000,marge:42});
 // La sortie masquée (10 USD) ne compte pas dans les totaux, mais reste dans le solde.
 expect(r.caisses.find(x=>x.nom==='Pour vivre')).toMatchObject({entrees:0,sorties:4250,soldeFin:144750});
 expect(r.depensesParCategorie.map(x=>[x.nom,x.centimes,x.pct])).toEqual([['École',12000,74],['Nourriture',4250,26]]);
 expect(r.dettes).toEqual([{nom:'Papa Emma',rembourse:20000,reste:170000}]);
 expect(r.operations.find(o=>o.centimes===-4250)).toMatchObject({libelle:'dépensé · Nourriture',note:'Marché',caisse:'Pour vivre'});
 const jour=construireRapport({suivi,cpt,depenses,benefices},'2026-11-08','2026-11-08','USD');
 expect(jour.operations.map(o=>o.libelle)).toEqual(['donné']);
 const html=rapportEnHtml(r,{titre:'SÉNEVÉ <Rapport>',periode:'Novembre 2026',genereLe:'12/11',nombre:c=>String(c/100),en:false});
 expect(html).toContain('SÉNEVÉ &lt;Rapport&gt;');
 expect(html).toContain('Encaissé (montant exact reçu)');
});

it('périodes : jour, mois, année et décalage',()=>{
 expect(periodeDe('mois','2026-02-14')).toEqual({du:'2026-02-01',au:'2026-02-28'});
 expect(periodeDe('annee','2026-02-14')).toEqual({du:'2026-01-01',au:'2026-12-31'});
 expect(decaler('mois','2026-01-31',-1)).toBe('2025-12-01');
 expect(decaler('jour','2026-03-01',-1)).toBe('2026-02-28');
});

it('écran : choix de période, aperçu du rapport, boutons Imprimer/PDF et Word',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:{enrollment_id:U(99),savings_goals:[{goal_id:U(50),goal_type:'epargne_investir',label:'Terrain',target_amount:'5000.00',currency:'USD',entries:[{entry_id:U(51),amount:'300.00',date_locale:'2026-11-03'}]}],debts:[{debt_id:U(60),debt_number:1,opening_balance:'2000.00',currency:'USD',creditor_name:'Papa Emma',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:[{payment_id:U(61),amount:'200.00',date_locale:'2026-11-03',created_at:'2026-11-03T09:00:00Z'}]}],archived_goals:[],archived_debts:[]},error:null};
  if(f==='hd_finance_counters_get')return {data:{...cpt,masques:[]},error:null};
  if(f==='hd_finance_expenses_get')return {data:depenses,error:null};
  if(f==='hd_finance_benefices_get')return {data:{ventes:benefices.ventes,revenus:[],reste_a_repartir:{USD:'200'}},error:null};
  throw Error(f);});
 const imprimer=vi.spyOn(window,'print').mockImplementation(()=>{});
 const {HabitudesRapport}=await import('@/routes/habitudes-rapport');
 render(<MemoryRouter><HabitudesRapport userId="u"/></MemoryRouter>);
 const apercu=await screen.findByRole('article',{name:'Aperçu du rapport'});
 expect(apercu.textContent).toMatch(/Rapport financier du mois/);
 fireEvent.click(within(screen.getByRole('radiogroup',{name:'Période du rapport'})).getByRole('radio',{name:'Année'}));
 expect(screen.getByRole('article',{name:'Aperçu du rapport'}).textContent).toMatch(/Rapport financier de l’année/);
 fireEvent.click(screen.getByRole('button',{name:/Imprimer ou PDF/}));
 expect(imprimer).toHaveBeenCalled();
 expect(screen.getByRole('button',{name:/Télécharger Word/})).toBeEnabled();
 imprimer.mockRestore();
});
