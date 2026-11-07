import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

/** Effacer le bilan (demande de Dr Justin du 08/11/2026) : une ligne avec confirmation, ou tout,
 * avec l'e-mail et le mot de passe du compte (ou EFFACER pour un compte Google). */
const {rpc,getUser,signInWithPassword}=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn(),signInWithPassword:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc,auth:{getUser,signInWithPassword}}}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
afterEach(()=>{cleanup();rpc.mockReset();getUser.mockReset();signInWithPassword.mockReset();});

const E='a58c18be-22d3-4e33-8a73-554fdfd693af',GI='5f1c2a4e-1111-4c3b-9a55-000000000001',D='7c011210-b780-41a4-9ec4-8f6566b27755';
const id=(n:number)=>`0b6f3c1e-${String(n).padStart(4,'0')}-4c3b-9a55-000000000000`;
const auj=new Intl.DateTimeFormat('en-CA').format(new Date());
const debutMois=auj.slice(0,8)+'01';
const t=new Date().toISOString();
let efface:Set<string>;
const suivi=()=>({enrollment_id:E,archived_goals:[],archived_debts:[],
 savings_goals:[{goal_id:GI,goal_type:'epargne_investir',label:'Moto-taxi',target_amount:'1000.00',currency:'USD',entries:efface.has('tout')?[]:[{entry_id:id(1),amount:'200.00',date_locale:auj,created_at:t}]}],
 debts:[{debt_id:D,debt_number:1,opening_balance:'200.00',currency:'USD',creditor_name:'Papy',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:efface.has('dettes')||efface.has('tout')?[]:[{payment_id:id(3),amount:'40.00',date_locale:auj,created_at:t}]}]});
const compteurs=()=>({enrollment_id:E,
 moves:efface.has('tout')?[]:[{move_id:id(4),envelope:'dime',direction:'entree',motif:null,amount:'20.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null,created_at:t}],
 withdrawals:efface.has('investi')||efface.has('tout')?[]:[{withdrawal_id:id(5),goal_id:GI,motif:'investi',amount:'150.00',date_locale:auj,remise_a_zero:false,created_at:t}]});
beforeEach(()=>{efface=new Set();rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
 if(f==='hd_finance_tracker_get')return {data:suivi(),error:null};
 if(f==='hd_finance_counters_get')return {data:compteurs(),error:null};
 if(f==='hd_finance_bilan_effacer'){efface.add(a.p_quoi as string);return {data:{sorties:0,retraits:1,remboursements:0,entrees:0,versements:0,repartitions:0},error:null};}
 throw Error(f);});});

async function ouvrir(){
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 await screen.findByRole('article',{name:'Pour investir'});
 const bilan=screen.getByRole('region',{name:/Mon bilan/});
 fireEvent.click(within(bilan).getByRole('button',{name:'Modifier'}));
 return bilan;
}
const ligne=(bilan:HTMLElement,txt:string)=>within(bilan).getByText(txt).closest('div')!.textContent;

it('Effacer une ligne : confirmation avec le nombre et le montant, puis la ligne revient à 0 et la caisse remonte',async()=>{
 const bilan=await ouvrir();
 expect(within(bilan).queryByRole('button',{name:'Effacer : Entré dans les caisses'})).toBeNull();
 fireEvent.click(within(bilan).getByRole('button',{name:'Effacer : Investi'}));
 const boite=screen.getByRole('alertdialog');
 expect(boite.textContent).toMatch(/1 ligne \(150 USD\), pour ce mois/);
 expect(boite.textContent).toMatch(/On ne peut pas revenir en arrière/);
 fireEvent.click(within(boite).getByRole('button',{name:'Effacer 150 USD'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',{p_enrollment_id:E,p_currency:'USD',p_depuis:debutMois,p_quoi:'investi',p_confirmation:null}));
 expect(await screen.findByText(/« Investi » est effacé pour ce mois/)).toBeInTheDocument();
 expect(ligne(bilan,'Investi')).toMatch(/[^0-9.,]0 USD$/);
 expect(screen.getByRole('article',{name:'Pour investir'}).textContent).toMatch(/200USD disponibles/);
 expect(ligne(bilan,'Remboursé sur les dettes')).toMatch(/40 USD/);
});

it('Annuler ne touche à rien',async()=>{
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('button',{name:'Effacer : Remboursé sur les dettes'}));
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Annuler'}));
 expect(screen.queryByRole('alertdialog')).toBeNull();
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_bilan_effacer',expect.anything());
});

it('Tout effacer : exige l’e-mail du compte et le bon mot de passe, puis tout revient à zéro',async()=>{
 getUser.mockResolvedValue({data:{user:{id:'u',email:'papa@exemple.org',identities:[{provider:'email'}]}}});
 signInWithPassword.mockResolvedValueOnce({data:{user:null},error:{message:'Invalid login credentials'}}).mockResolvedValueOnce({data:{user:{id:'u'}},error:null});
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('button',{name:'Tout effacer…'}));
 const feuille=await screen.findByRole('dialog',{name:'Tout effacer'});
 const email=await within(feuille).findByLabelText('E-mail');
 const envoyer=within(feuille).getByRole('button',{name:'Tout effacer'});
 fireEvent.change(email,{target:{value:'autre@exemple.org'}});
 fireEvent.change(within(feuille).getByLabelText('Mot de passe'),{target:{value:'x'}});
 fireEvent.click(envoyer);
 expect(await within(feuille).findByRole('alert')).toHaveTextContent(/e-mail de ton compte/);
 expect(signInWithPassword).not.toHaveBeenCalled();
 fireEvent.change(email,{target:{value:'Papa@exemple.org'}});
 fireEvent.click(envoyer);
 expect(await within(feuille).findByRole('alert')).toHaveTextContent(/incorrect/);
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_bilan_effacer',expect.anything());
 fireEvent.click(envoyer);
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',{p_enrollment_id:E,p_currency:'USD',p_depuis:debutMois,p_quoi:'tout',p_confirmation:'EFFACER'}));
 expect(signInWithPassword).toHaveBeenLastCalledWith({email:'papa@exemple.org',password:'x'});
 expect(await screen.findByText(/Tout est effacé pour ce mois, en USD/)).toBeInTheDocument();
 for(const n of ['Entré dans les caisses','Investi','Remboursé sur les dettes'])expect(ligne(bilan,n)).toMatch(/[^0-9.,]0 USD$/);
});

it('Tout effacer, compte Google sans mot de passe : il faut écrire EFFACER ; la période « Tout » efface tout l’historique',async()=>{
 getUser.mockResolvedValue({data:{user:{id:'u',email:'papa@gmail.com',identities:[{provider:'google'}]}}});
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('radio',{name:'Tout'}));
 fireEvent.click(within(bilan).getByRole('button',{name:'Tout effacer…'}));
 const feuille=await screen.findByRole('dialog',{name:'Tout effacer'});
 const champ=await within(feuille).findByLabelText('Confirmation');
 expect(within(feuille).queryByLabelText('Mot de passe')).toBeNull();
 fireEvent.change(champ,{target:{value:'oui'}});
 fireEvent.click(within(feuille).getByRole('button',{name:'Tout effacer'}));
 expect(await within(feuille).findByRole('alert')).toHaveTextContent(/EFFACER/);
 fireEvent.change(champ,{target:{value:'effacer'}});
 fireEvent.click(within(feuille).getByRole('button',{name:'Tout effacer'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',expect.objectContaining({p_depuis:null,p_quoi:'tout',p_confirmation:'EFFACER'})));
 expect(signInWithPassword).not.toHaveBeenCalled();
});

it('Mon épargne suit : après l’effacement des retraits, l’objectif n’affiche plus « utilisé »',async()=>{
 efface.add('investi');
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const resume=await screen.findByRole('region',{name:'Moto-taxi'});
 await waitFor(()=>expect(resume.textContent).not.toMatch(/utilisé 150/));
 expect(within(screen.getByRole('region',{name:'Historique'})).getAllByRole('listitem').some(li=>/− 150/.test(li.textContent!))).toBe(false);
});
