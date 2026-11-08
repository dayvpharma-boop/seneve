import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {baseRepartition,maximumPart,repartir,repartirSurDettes,POURCENTAGES_DEFAUT} from '@/lib/habitudes-repartition';

vi.mock('@/lib/habitudes-configuration',()=>({habitudesActivees:()=>true,suiviFinancierActive:()=>true}));
vi.mock('@/components/CadreHabitudes',()=>({CadreHabitudes:({children}:{children:ReactNode})=><>{children}</>}));
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
 const {HabitudesRepartition}=await import('@/routes/habitudes-repartition');
 render(<MemoryRouter initialEntries={['/habitudes/repartition?pour=epargne']}><HabitudesRepartition/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Ventes encaissées'),{target:{value:'1000000'}});
 fireEvent.change(screen.getByLabelText('Coût des marchandises vendues'),{target:{value:'400000'}});
 fireEvent.change(screen.getByLabelText('Charges du commerce'),{target:{value:'100000'}});
 const base=screen.getByRole('region',{name:'Base retenue'});
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
});
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
 expect(screen.getByRole('region',{name:'Base retenue'}).textContent).toMatch(/1\s?000 USD/);
},20000);

it('Réserve de joie : de 0 à 10 % (demande du 08/11/2026), 10 % proposés au départ',async()=>{
 const {LIMITES_REPARTITION,POURCENTAGES_DEFAUT,repartir}=await import('@/lib/habitudes-repartition');
 expect(LIMITES_REPARTITION.reserve).toMatchObject({min:0,max:10});
 expect(POURCENTAGES_DEFAUT.reserve).toBe(10);
 expect(repartir('1000',{...POURCENTAGES_DEFAUT,reserve:0},2).reserve).toBe(0);
});
