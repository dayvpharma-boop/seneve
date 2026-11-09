import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import type {DonneesChargesEntreprise} from '@/lib/habitudes-finance-charges';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {baseRepartition,maximumPart,repartir,repartirSurDettes,POURCENTAGES_DEFAUT} from '@/lib/habitudes-repartition';

vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
const {chargerCharges,noterVente,retirerCharge} = vi.hoisted(() => ({chargerCharges:vi.fn(),noterVente:vi.fn(),retirerCharge:vi.fn()}));
vi.mock('@/lib/habitudes-finance-charges', async importOriginal => ({
 ...await importOriginal<typeof import('@/lib/habitudes-finance-charges')>(),
 chargerChargesEntreprise:chargerCharges,
 enregistrerEncaissementEntreprise:noterVente,
 retirerChargeEntreprise:retirerCharge,
}));
const chargesReglees:DonneesChargesEntreprise = {
 enrollment_id:'inscription',available_amount:'1000.00',tithe_due:'100.00',
 active_block:{block_id:'bloc',month_start:'2026-11-01'},
 charges:[{charge_id:'loyer',label:'Loyer',currency:'EUR',expected_amount:'300.00',
  period_start:'2026-11-01',period_end:'2026-11-30',
  payments:[{payment_id:'paiement',amount:'300.00',date_locale:'2026-11-01'}]}],
 archives:[],
};
beforeEach(() => {
 chargerCharges.mockReset().mockResolvedValue(chargesReglees);
 noterVente.mockReset();
 retirerCharge.mockReset();
});
afterEach(()=>cleanup());

it('calcule la base selon le profil, avec les règles de la dîme',()=>{
 expect(baseRepartition('commerce','1000000','400000','100000')).toBe('500000');
 expect(baseRepartition('salarie','500000','','70000')).toBe('430000');
 expect(baseRepartition('entreprise','800000','','300000')).toBe('500000');
 expect(baseRepartition('autre','200000','999','999')).toBe('200000');
 expect(baseRepartition('commerce','100','400','0')).toBe('0');
 expect(()=>baseRepartition('salarie','abc','','')).toThrow();
});
it('répartit 500 000 : dîme 10 %, réserve 10 %, investir 20 %, dettes 15 %, le reste pour vivre',()=>{
 expect(repartir('500000',POURCENTAGES_DEFAUT,2)).toEqual({base:500000,dime:50000,offrande:0,reserve:50000,investir:100000,autre:0,dettes:75000,vivre:225000});
});
it('l’offrande est libre (0 % au départ) mais le total ne dépasse jamais 100 %',()=>{
 expect(POURCENTAGES_DEFAUT.offrande).toBe(0);
 const p={...POURCENTAGES_DEFAUT,offrande:20};
 expect(repartir('500000',p,2)).toMatchObject({offrande:100000,vivre:125000});
 expect(maximumPart('offrande',POURCENTAGES_DEFAUT)).toBe(45);
 expect(repartir('500000',{...POURCENTAGES_DEFAUT,offrande:45},2).vivre).toBe(0);
});
it('propose la part « Dettes » d’abord sur la plus petite dette',()=>{
 expect(repartirSurDettes(7500000,[{id:'papy',resteCentimes:12000000},{id:'kanza',resteCentimes:6000000}])).toEqual({propositions:[{id:'kanza',centimes:6000000,solde:true},{id:'papy',centimes:1500000,solde:false}],surplus:0});
});
it('la page affiche la répartition et garde les pourcentages dans leurs limites',async()=>{
 chargerCharges.mockResolvedValue({...chargesReglees,available_amount:'500000.00',tithe_due:'50000.00'});
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition?pour=epargne']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000000'}});
 fireEvent.change(screen.getByLabelText('Coût des marchandises vendues'),{target:{value:'400000'}});
 fireEvent.change(screen.getByLabelText('Autres frais de la vente'),{target:{value:'100000'}});
 const base=await screen.findByRole('region',{name:'Solde à répartir'});
 expect(base.textContent).toMatch(/500\s?000 USD/);
 expect(within(base).getByText('Pour vivre').closest('li')!.textContent).toMatch(/225\s?000/);
 expect(screen.getByRole('button',{name:'Augmenter : Réserve de joie'})).toBeDisabled();
 for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:'Augmenter : Offrande'}));
 expect(within(base).getByText('Offrande').closest('li')!.textContent).toMatch(/100\s?000/);
 expect(within(base).getByText('Pour vivre').closest('li')!.textContent).toMatch(/125\s?000/);
 for(let i=0;i<5;i++)fireEvent.click(screen.getByRole('button',{name:'Augmenter : Dettes'}));
 expect(screen.getByRole('button',{name:'Augmenter : Dettes'})).toBeDisabled();
 // Un seul bouton : il ouvre la feuille de vérification des parts (07/11/2026).
 expect(screen.getByRole('button',{name:'Enregistrer ma répartition'})).toBeVisible();
 expect(screen.queryByRole('link',{name:/Réserve de joie/})).toBeNull();
 fireEvent.click(screen.getByRole('radio',{name:'Entrepreneur'}));
 expect(screen.getByLabelText('Argent encaissé')).toHaveValue('');
 expect(screen.queryByLabelText('Coût des marchandises vendues')).toBeNull();
},20000);
it('le dollar américain est en premier et le franc congolais juste après le kwanza',async()=>{
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition']}><HabitudesRepartition/></MemoryRouter>);
 // Feuille « Monnaie » style iPhone (08/11/2026) : « Les plus utilisées » dans l'ordre demandé.
 expect(screen.getByLabelText('Monnaie').textContent).toMatch(/Dollar américain/);
 fireEvent.click(screen.getByLabelText('Monnaie'));
 const feuille=screen.getByRole('dialog',{name:'Monnaie'});
 const options=within(feuille).getAllByRole('option').slice(0,6).map(o=>o.querySelector('b')!.textContent);
 expect(options).toEqual(['Dollar américain','Euro','Franc CFA d’Afrique centrale','Franc CFA d’Afrique de l’Ouest','Kwanza angolais','Franc congolais']);
 // La recherche trouve par nom ou par code, sans tenir compte des accents.
 fireEvent.change(within(feuille).getByRole('searchbox'),{target:{value:'congo'}});
 expect(within(feuille).getAllByRole('option').map(o=>o.querySelector('small')!.textContent)).toEqual(['CDF']);
 fireEvent.change(within(feuille).getByRole('searchbox'),{target:{value:'usd'}});
 fireEvent.click(within(feuille).getByRole('option',{name:/Dollar américain/}));
 expect(screen.queryByRole('dialog',{name:'Monnaie'})).toBeNull();
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000'}});
 expect((await screen.findByRole('region',{name:'Solde à répartir'})).textContent).toMatch(/1\s?000 USD/);
},20000);

it('Réserve de joie : de 0 à 10 % (demande du 08/11/2026), 10 % proposés au départ',async()=>{
 const {LIMITES_REPARTITION,POURCENTAGES_DEFAUT,repartir}=await import('@/lib/habitudes-repartition');
 expect(LIMITES_REPARTITION.reserve).toMatchObject({min:0,max:10});
 expect(POURCENTAGES_DEFAUT.reserve).toBe(10);
 expect(repartir('1000',{...POURCENTAGES_DEFAUT,reserve:0},2).reserve).toBe(0);
});

it('exercices de calcul : les centimes et monnaies sans décimales ne créent jamais un excédent fictif',()=>{
 const cas=[
  {base:'0.03',dec:2},
  {base:'0.01',dec:2},
  {base:'1',dec:0},
  {base:'7',dec:0},
  {base:'499.99',dec:2},
  {base:'1000',dec:2},
 ];
 for(const {base,dec} of cas){
  const a=repartir(base,POURCENTAGES_DEFAUT,dec);
  const somme=a.dime+a.offrande+a.reserve+a.investir+a.autre+a.dettes+a.vivre;
  expect(Math.round(somme*10**dec)).toBe(Math.round(Number(base)*10**dec));
  expect(Object.values(a).every(v=>v>=0)).toBe(true);
 }
 // Ancien arrondi : 0,05 USD avec parts 10+35+10+25+20 = 100 %
 // donnait 0,06 USD distribués sur une base de seulement 0,05 USD.
 const autre={...POURCENTAGES_DEFAUT,offrande:35,investir:25,dettes:20};
 const excessif=repartir('0.05',autre,2);
 expect(Math.round((excessif.dime+excessif.offrande+excessif.reserve+excessif.investir+excessif.autre+excessif.dettes+excessif.vivre)*100)).toBe(5);
 expect(excessif.vivre).toBe(0);
 const p={...POURCENTAGES_DEFAUT,offrande:45};
 const tout=repartir('0.03',p,2);
 expect(tout.vivre).toBe(0);
 expect(Math.round((tout.dime+tout.offrande+tout.reserve+tout.investir+tout.autre+tout.dettes)*100)).toBe(3);
});
it('refuse les taux incohérents, la dîme modifiée et les bases impossibles',()=>{
 expect(()=>repartir('1000',{...POURCENTAGES_DEFAUT,offrande:70},2)).toThrow(/100/);
 expect(()=>repartir('1000',{...POURCENTAGES_DEFAUT,dime:25},2)).toThrow(/Pourcentages/);
 expect(()=>repartir('999999999999',POURCENTAGES_DEFAUT,2)).toThrow();
 expect(()=>repartir('NaN',POURCENTAGES_DEFAUT,2)).toThrow();
});
it('exercice dette : 75 réservés, seulement 20 dus, 55 restent sans faux remboursement',()=>{
 expect(repartirSurDettes(7500,[{id:'d1',resteCentimes:2000}])).toEqual({
  propositions:[{id:'d1',centimes:2000,solde:true}],surplus:5500
 });
 expect(repartirSurDettes(7500,[])).toEqual({propositions:[],surplus:7500});
});

it('distingue une erreur de chargement d’un bloc absent et déverrouille après une nouvelle lecture réussie',async()=>{
 chargerCharges.mockRejectedValueOnce(Error('Réseau indisponible'));
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000'}});
 const enregistrer=screen.getByRole('button',{name:'Enregistrer ma répartition'});
 expect(enregistrer).toBeDisabled();
 const reessayer=await screen.findByRole('button',{name:'Réessayer'});
 expect(screen.queryByRole('button',{name:'Créer le bloc du mois'})).toBeNull();
 expect(screen.queryByRole('region',{name:'Solde à répartir'})).toBeNull();
 fireEvent.click(reessayer);
 await waitFor(()=>expect(enregistrer).toBeEnabled());
 expect(screen.getByText('Loyer')).toBeVisible();
 expect(screen.getByRole('region',{name:'Solde à répartir'}).textContent).toMatch(/1\s?000 USD/);
},20000);

it('enregistre la vente nette dans le bloc et calcule la répartition sur le seul solde confirmé',async()=>{
 const charge={...chargesReglees.charges[0]!,currency:'USD',payments:[]};
 const avant={...chargesReglees,available_amount:'0',tithe_due:'0',charges:[charge]};
 chargerCharges.mockResolvedValue(avant);
 noterVente.mockImplementation(async()=>{
  chargerCharges.mockResolvedValue({...chargesReglees,available_amount:'50.00',tithe_due:'5.00',
   charges:[{...charge,payments:chargesReglees.charges[0]!.payments}]});
  return {couvert:'300.00',reste:'50.00'};
 });
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'500'}});
 fireEvent.change(screen.getByLabelText('Coût des marchandises vendues'),{target:{value:'100'}});
 fireEvent.change(screen.getByLabelText('Autres frais de la vente'),{target:{value:'50'}});
 await screen.findByText('Loyer');
 expect(screen.getByRole('button',{name:'Enregistrer ma répartition'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer l’encaissement'}));
 const base=await screen.findByRole('region',{name:'Solde à répartir'});
 expect(base.textContent).toContain('50 USD');
 expect(noterVente).toHaveBeenCalledWith('inscription','USD',expect.stringMatching(/-01$/),
  {recu:'500',marchandises:'100',frais:'50'},expect.any(String));
 expect(screen.getByLabelText('Ventes encaissées')).toHaveValue('');
},20000);

it('retire une charge après confirmation et recharge le bloc',async()=>{
 retirerCharge.mockImplementation(async()=>{
  chargerCharges.mockResolvedValue({...chargesReglees,charges:[]});
 });
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter><HabitudesRepartition/></MemoryRouter>);
 const options=await screen.findByRole('button',{name:'Options pour Loyer'});
 expect(screen.queryByRole('button',{name:'Supprimer Loyer'})).toBeNull();
 fireEvent.click(options);
 fireEvent.click(screen.getByRole('button',{name:'Supprimer Loyer'}));
 expect(retirerCharge).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Confirmer la suppression'}));
 await waitFor(()=>expect(screen.queryByText('Loyer')).toBeNull());
 expect(retirerCharge).toHaveBeenCalledWith('inscription','loyer');
},20000);

it('ne propose aucune nouvelle dîme sur les 325 USD restants après une dîme déjà enregistrée',async()=>{
 chargerCharges.mockResolvedValue({...chargesReglees,available_amount:'325.00',tithe_due:'0.00'});
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter><HabitudesRepartition/></MemoryRouter>);
 const base=await screen.findByRole('region',{name:'Solde à répartir'});
 expect(base.textContent).toContain('325 USD');
 const dime=within(base).getByText('Dîme').closest('li')!;
 expect(within(dime).getByText('0')).toBeVisible();
 expect(within(dime).getByText('Aucune dîme à enregistrer sur ce solde')).toBeVisible();
 expect(screen.getByRole('button',{name:'Enregistrer ma répartition'})).toBeEnabled();
},20000);

it('préserve le solde quand la dîme vient seulement du nouveau net ou d’une dîme laissée à enregistrer',()=>{
 const nouveau=repartir('525',POURCENTAGES_DEFAUT,2,'20');
 expect(nouveau.dime).toBe(20);
 expect(nouveau.offrande+nouveau.reserve+nouveau.investir+nouveau.autre+nouveau.dettes+nouveau.vivre+nouveau.dime).toBe(525);
 const enAttente=repartir('100',POURCENTAGES_DEFAUT,2,'90');
 expect(enAttente.dime).toBe(90);
 expect(enAttente.vivre).toBe(0);
 expect(enAttente.reserve+enAttente.investir+enAttente.dettes).toBeCloseTo(10);
});

it('ouvre l’historique depuis le solde et permet seulement de supprimer une entrée disponible',async()=>{
 const historique=await import('@/lib/habitudes-finance-historique');
 const entree={id:'nouvelle',kind:0 as const,created_at:'2026-11-09T17:00:00Z',date_locale:'2026-11-09',
  amount:'46.35',balance:'371.35',net:'46.35',removal_block:null};
 const report={id:'repartition',kind:1 as const,created_at:'2026-11-09T16:00:00Z',date_locale:'2026-11-09',
  amount:'975.00',balance:'325.00'};
 const utilisee={...entree,id:'ancienne',amount:'1300.00',balance:'1300.00',removal_block:'allocation' as const};
 const lecture=vi.spyOn(historique,'chargerHistoriqueSolde')
  .mockResolvedValueOnce({mouvements:[entree,report,utilisee],suite:false})
  .mockResolvedValue({mouvements:[report,utilisee],suite:false});
 const supprimer=vi.spyOn(historique,'supprimerEncaissementDuSolde').mockResolvedValue({disponible:'325.00',dimeRestante:'0.00'});
 try{
  chargerCharges.mockResolvedValue({...chargesReglees,available_amount:'371.35',tithe_due:'4.64'});
  const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
  render(<MemoryRouter><HabitudesRepartition/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:/Solde à répartir 371,35 USD/}));
  const volet=screen.getByRole('dialog',{name:'Historique du solde'});
  expect(await within(volet).findByText('Solde reporté')).toBeVisible();
  expect(within(volet).getAllByText(/lundi 9 novembre 2026 à 18:00/)).toHaveLength(2);
  expect(within(volet).getByText(/lundi 9 novembre 2026 à 17:00/)).toBeVisible();
  const actions=within(volet).getAllByRole('button',{name:/Supprimer l’encaissement/});
  expect(actions).toHaveLength(1);
  fireEvent.click(actions[0]!);
  expect(supprimer).not.toHaveBeenCalled();
  fireEvent.click(within(volet).getByRole('button',{name:'Confirmer la suppression'}));
  await waitFor(()=>expect(supprimer).toHaveBeenCalledWith('USD','nouvelle'));
  await within(volet).findByText('Encaissement supprimé. Le solde a été actualisé.');
  fireEvent.click(within(volet).getByRole('button',{name:'Fermer'}));
  expect(screen.getByRole('button',{name:/Solde à répartir 325 USD/})).toBeVisible();
 }finally{lecture.mockRestore();supprimer.mockRestore();}
},20000);
