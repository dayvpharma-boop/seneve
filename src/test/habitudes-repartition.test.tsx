import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {baseRepartition,repartir,repartirSurDettes,POURCENTAGES_DEFAUT} from '@/lib/habitudes-repartition';

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
 expect(repartir('500000',POURCENTAGES_DEFAUT,2)).toEqual({base:500000,dime:50000,reserve:50000,investir:100000,dettes:75000,vivre:225000});
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
 expect(base.textContent).toMatch(/500\s?000 CDF/);
 expect(within(base).getByText('Pour vivre').closest('li')!.textContent).toMatch(/225\s?000/);
 expect(screen.getByRole('button',{name:'Augmenter : Réserve de joie'})).toBeDisabled();
 for(let i=0;i<5;i++)fireEvent.click(screen.getByRole('button',{name:'Augmenter : Dettes'}));
 expect(screen.getByRole('button',{name:'Augmenter : Dettes'})).toBeDisabled();
 const lien=screen.getByRole('link',{name:/Réserve de joie/});
 expect(lien.getAttribute('href')).toBe('/habitudes/epargne?montant=50000&devise=CDF&type=reserve_joie');
 fireEvent.click(screen.getByRole('radio',{name:'Entrepreneur'}));
 expect(screen.getByLabelText('Argent encaissé')).toHaveValue('');
 expect(screen.queryByLabelText('Coût des marchandises vendues')).toBeNull();
});
