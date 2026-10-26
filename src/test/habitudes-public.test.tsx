import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import {Habitudes} from '@/routes/habitudes';
afterEach(cleanup);
it('publie un aperçu explicite et permet de parcourir les trois jours de culte',()=>{
 render(<MemoryRouter><Habitudes/></MemoryRouter>);expect(screen.getByText('Aperçu · module en préparation')).toBeVisible();expect(screen.getByRole('heading',{name:'Habitudes & Défis'})).toBeVisible();expect(screen.getByText('30 jours gratuits')).toBeVisible();
 const liste=screen.getByRole('list');expect(within(liste).getAllByRole('listitem')).toHaveLength(13);fireEvent.change(screen.getByRole('combobox',{name:'Voir un jour de la semaine'}),{target:{value:'3'}});expect(within(liste).getAllByRole('listitem')).toHaveLength(14);expect(within(liste).getByText('Culte en semaine')).toBeVisible();
 expect(screen.queryByRole('button',{name:/Commencer|réalisé|inscrire/i})).toBeNull();
});
it('l’aperçu anglais traduit le rythme et le simulateur sans créer de compte',()=>{
 render(<MemoryRouter initialEntries={['/habitudes?lang=en']}><Habitudes/></MemoryRouter>);expect(screen.getByRole('heading',{name:'Habits & Challenges'})).toBeVisible();expect(screen.getByText('Morning prayer')).toBeVisible();expect(screen.getByText('Optional tithe simulator')).toBeVisible();expect(screen.getByRole('link',{name:'Back to my space'})).toHaveAttribute('href','/espace?lang=en');expect(screen.queryByText('Prière du matin')).toBeNull();
});
