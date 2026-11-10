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
// Comme le serveur (hd_finance_coherence.sql) : un effacement partiel MASQUE les lignes (les soldes ne bougent pas) ;
// « Tout remettre à zéro » supprime vraiment, toujours depuis le début (10/11/2026).
let remiseAZero:boolean,masques:Set<string>;
const suivi=()=>({enrollment_id:E,archived_goals:[],archived_debts:[],
 savings_goals:[{goal_id:GI,goal_type:'epargne_investir',label:'Moto-taxi',target_amount:'1000.00',currency:'USD',entries:remiseAZero?[]:[{entry_id:id(1),amount:'200.00',date_locale:auj,created_at:t}]}],
 debts:[{debt_id:D,debt_number:1,opening_balance:'200.00',currency:'USD',creditor_name:'Papy',monthly_basis:null,repayment_percent:null,weekly_basis:null,weekly_repayment_percent:null,payments:remiseAZero?[]:[{payment_id:id(3),amount:'40.00',date_locale:auj,created_at:t}]}]});
const compteurs=()=>({enrollment_id:E,masques:[...masques],
 moves:remiseAZero?[]:[{move_id:id(4),envelope:'dime',direction:'entree',motif:null,amount:'20.00',currency:'USD',date_locale:auj,remise_a_zero:false,allocation_id:null,created_at:t}],
 withdrawals:remiseAZero?[]:[{withdrawal_id:id(5),goal_id:GI,motif:'investi',amount:'150.00',date_locale:auj,remise_a_zero:false,created_at:t}]});
beforeEach(()=>{remiseAZero=false;masques=new Set();rpc.mockImplementation(async(f:string,a:Record<string,unknown>)=>{
 if(f==='hd_finance_tracker_get')return {data:suivi(),error:null};
 if(f==='hd_finance_counters_get')return {data:compteurs(),error:null};
 if(f==='hd_finance_bilan_effacer'){
  const q=a.p_quoi as string;
  if(q==='tout'&&a.p_depuis===null)remiseAZero=true;
  else{if(q==='investi'||q==='tout')masques.add(id(5));if(q==='dettes'||q==='tout')masques.add(id(3));if(q==='tout'){masques.add(id(1));masques.add(id(4));}}
  return {data:{sorties:0,retraits:1,remboursements:0,entrees:0,versements:0,repartitions:0,masque:!remiseAZero},error:null};}
 throw Error(f);});});

async function ouvrir(){
 const {HabitudesCompteurs}=await import('@/routes/habitudes-compteurs');
 render(<MemoryRouter initialEntries={['/habitudes/compteurs']}><HabitudesCompteurs userId="u"/></MemoryRouter>);
 await screen.findByRole('article',{name:'Pour investir'});
 const bilan=screen.getByRole('region',{name:/Mon bilan/});
 fireEvent.click(within(bilan).getByRole('button',{name:'Modifier'}));
 return bilan;
}
const feuilleFermee=()=>document.body;
const ligne=(bilan:HTMLElement,txt:string)=>within(bilan).getByText(txt).closest('div')!.textContent;

it('Effacer une ligne : confirmation avec le nombre et le montant, la ligne revient à 0 mais la caisse NE remonte PAS',async()=>{
 const bilan=await ouvrir();
 expect(within(bilan).queryByRole('button',{name:'Effacer : Entré dans les caisses'})).toBeNull();
 fireEvent.click(within(bilan).getByRole('button',{name:'Effacer : Investi'}));
 const boite=screen.getByRole('alertdialog');
 expect(boite.textContent).toMatch(/1 ligne \(150 USD\), pour ce mois/);
 expect(boite.textContent).toMatch(/On ne peut pas revenir en arrière/);
 expect(boite.textContent).toMatch(/Tes caisses ne changent pas/);
 expect(boite.textContent).not.toMatch(/remonte/);
 fireEvent.click(within(boite).getByRole('button',{name:'Effacer 150 USD'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',{p_enrollment_id:E,p_currency:'USD',p_depuis:debutMois,p_quoi:'investi',p_confirmation:null}));
 expect(await screen.findByText(/« Investi » est effacé pour ce mois/)).toBeInTheDocument();
 expect(ligne(bilan,'Investi')).toMatch(/[^0-9.,]0 USD$/);
 // 200 versés − 150 investis : l'argent investi ne revient pas dans la caisse.
 expect(screen.getByRole('article',{name:'Pour investir'}).textContent).toMatch(/50USD disponibles/);
 expect(screen.getByRole('article',{name:'Pour investir'}).textContent).not.toMatch(/200USD disponibles/);
 expect(ligne(bilan,'Remboursé sur les dettes')).toMatch(/40 USD/);
});

it('Annuler ne touche à rien',async()=>{
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('button',{name:'Effacer : Remboursé sur les dettes'}));
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Annuler'}));
 expect(screen.queryByRole('alertdialog')).toBeNull();
 expect(rpc).not.toHaveBeenCalledWith('hd_finance_bilan_effacer',expect.anything());
});

it('Tout remettre à zéro : exige l’e-mail du compte et le bon mot de passe, puis tout revient vraiment à zéro, même avec la période « Ce mois »',async()=>{
 getUser.mockResolvedValue({data:{user:{id:'u',email:'papa@exemple.org',identities:[{provider:'email'}]}}});
 signInWithPassword.mockResolvedValueOnce({data:{user:null},error:{message:'Invalid login credentials'}}).mockResolvedValueOnce({data:{user:{id:'u'}},error:null});
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('button',{name:'Tout remettre à zéro…'}));
 const feuille=await screen.findByRole('dialog',{name:'Tout remettre à zéro'});
 const email=await within(feuille).findByLabelText('E-mail');
 const envoyer=within(feuille).getByRole('button',{name:'Tout remettre à zéro'});
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
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',{p_enrollment_id:E,p_currency:'USD',p_depuis:null,p_quoi:'tout',p_confirmation:'EFFACER'}));
 expect(signInWithPassword).toHaveBeenLastCalledWith({email:'papa@exemple.org',password:'x'});
 expect(await screen.findByText(/Tout est remis à zéro, en USD/)).toBeInTheDocument();
 for(const n of ['Entré dans les caisses','Investi','Remboursé sur les dettes'])expect(ligne(bilan,n)).toMatch(/[^0-9.,]0 USD$/);
 // Remise à zéro complète : les caisses et les objectifs repartent de 0.
 expect(screen.getByRole('article',{name:'Dîme'}).textContent).toMatch(/0USD disponibles/);
 expect(screen.getByRole('article',{name:'Dîme'}).textContent).not.toMatch(/20USD disponibles/);
 expect(within(feuilleFermee()).queryByRole('dialog')).toBeNull();
});

it('Tout remettre à zéro, compte Google sans mot de passe : il faut écrire EFFACER ; la période « Tout » efface tout l’historique',async()=>{
 getUser.mockResolvedValue({data:{user:{id:'u',email:'papa@gmail.com',identities:[{provider:'google'}]}}});
 const bilan=await ouvrir();
 fireEvent.click(within(bilan).getByRole('radio',{name:'Tout'}));
 fireEvent.click(within(bilan).getByRole('button',{name:'Tout remettre à zéro…'}));
 const feuille=await screen.findByRole('dialog',{name:'Tout remettre à zéro'});
 const champ=await within(feuille).findByLabelText('Confirmation');
 expect(within(feuille).queryByLabelText('Mot de passe')).toBeNull();
 fireEvent.change(champ,{target:{value:'oui'}});
 fireEvent.click(within(feuille).getByRole('button',{name:'Tout remettre à zéro'}));
 expect(await within(feuille).findByRole('alert')).toHaveTextContent(/EFFACER/);
 fireEvent.change(champ,{target:{value:'effacer'}});
 fireEvent.click(within(feuille).getByRole('button',{name:'Tout remettre à zéro'}));
 await waitFor(()=>expect(rpc).toHaveBeenCalledWith('hd_finance_bilan_effacer',expect.objectContaining({p_depuis:null,p_quoi:'tout',p_confirmation:'EFFACER'})));
 expect(signInWithPassword).not.toHaveBeenCalled();
});

it('Mon épargne suit : le retrait effacé quitte l’historique, mais le disponible reste 50 (il ne revient pas à 200)',async()=>{
 masques.add(id(5));
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 const resume=await screen.findByRole('region',{name:'Moto-taxi'});
 await waitFor(()=>expect(resume.textContent).toMatch(/utilisé 150/));
 expect(resume.textContent).toMatch(/50[^0-9]/);
 expect(within(screen.getByRole('region',{name:'Historique'})).getAllByRole('listitem').some(li=>/− 150/.test(li.textContent!))).toBe(false);
});

it('Compteurs injoignables : le suivi affiche une erreur au lieu d’un disponible qui oublierait les retraits',async()=>{
 rpc.mockImplementation(async(f:string)=>{
  if(f==='hd_finance_tracker_get')return {data:suivi(),error:null};
  if(f==='hd_finance_counters_get')return {data:null,error:{code:'08006',message:'réseau coupé'}};
  throw Error(f);});
 const {SuiviEpargneDettes}=await import('@/components/SuiviEpargneDettes');
 render(<MemoryRouter initialEntries={['/habitudes/epargne']}><SuiviEpargneDettes mode="epargne" userId="u"/></MemoryRouter>);
 expect(await screen.findByRole('alert')).toHaveTextContent(/pas disponible/);
 expect(screen.queryByText(/200,00|200 \$/)).toBeNull();
});
