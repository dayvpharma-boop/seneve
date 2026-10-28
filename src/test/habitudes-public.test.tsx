import {GarderLangue} from '@/components/GarderLangue';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Habitudes} from '@/routes/habitudes';
beforeEach(()=>{vi.stubEnv('VITE_HABITUDES_DEFIS','false');vi.stubEnv('VITE_HABITUDES_INSCRIPTION','fermee');});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('publie un aperçu explicite et permet de parcourir les trois jours de culte',()=>{
 render(<MemoryRouter><Habitudes/></MemoryRouter>);expect(screen.getByText('Aperçu · module en préparation')).toBeVisible();expect(screen.getByRole('heading',{name:'Habitudes & Défis'})).toBeVisible();expect(screen.getByText('30 jours gratuits')).toBeVisible();
 const liste=screen.getByRole('list');expect(within(liste).getAllByRole('listitem')).toHaveLength(13);fireEvent.change(screen.getByRole('combobox',{name:'Voir un jour de la semaine'}),{target:{value:'3'}});expect(within(liste).getAllByRole('listitem')).toHaveLength(14);expect(within(liste).getByText('Culte en semaine')).toBeVisible();
 expect(screen.queryByRole('button',{name:/Commencer|réalisé|inscrire/i})).toBeNull();
});
it('l’aperçu anglais traduit le rythme et le simulateur sans créer de compte',()=>{
 render(<MemoryRouter initialEntries={['/habitudes?lang=en']}><Habitudes/></MemoryRouter>);expect(screen.getByRole('heading',{name:'Habits & Challenges'})).toBeVisible();expect(within(screen.getByRole('list')).getByText('Morning prayer')).toBeVisible();expect(screen.getByText('Optional tithe simulator')).toBeVisible();expect(screen.getByRole('link',{name:'Back to my space'})).toHaveAttribute('href','/espace?lang=en');expect(screen.queryByText('Prière du matin')).toBeNull();
});

function ouvrirHoraires(){const r=render(<MemoryRouter><Habitudes/></MemoryRouter>);r.container.querySelector('details')!.open=true;return r;}
it('l’essai des horaires change la journée sans stockage ni appel réseau',()=>{
 const stockage=vi.spyOn(Storage.prototype,'setItem'),reseau=vi.spyOn(globalThis,'fetch');ouvrirHoraires();
 fireEvent.change(screen.getByLabelText('Prière du matin'),{target:{value:'07:15'}});expect(within(screen.getByRole('list')).getByText('07:15')).toBeVisible();expect(screen.getByText(/ne sont pas enregistrés dans ton compte/)).toBeVisible();expect(stockage).not.toHaveBeenCalled();expect(reseau).not.toHaveBeenCalled();
 fireEvent.change(screen.getByRole('combobox',{name:'Voir un jour de la semaine'}),{target:{value:'3'}});expect(screen.getByLabelText('Prière du matin')).toHaveValue('06:00');fireEvent.change(screen.getByRole('combobox',{name:'Voir un jour de la semaine'}),{target:{value:'1'}});expect(screen.getByLabelText('Prière du matin')).toHaveValue('07:15');
});
it('les trois cultes peuvent avoir des heures distinctes dans l’aperçu',()=>{
 ouvrirHoraires();const jour=screen.getByRole('combobox',{name:'Voir un jour de la semaine'});
 fireEvent.change(jour,{target:{value:'3'}});fireEvent.change(screen.getByLabelText('Culte en semaine'),{target:{value:'17:45'}});
 fireEvent.change(jour,{target:{value:'5'}});expect(screen.getByLabelText('Culte en semaine')).toHaveValue('18:30');fireEvent.change(screen.getByLabelText('Culte en semaine'),{target:{value:'19:00'}});
 fireEvent.change(jour,{target:{value:'7'}});fireEvent.change(screen.getByLabelText('Culte du dimanche'),{target:{value:'10:30'}});fireEvent.change(jour,{target:{value:'3'}});expect(screen.getByLabelText('Culte en semaine')).toHaveValue('17:45');
});
it('signale les heures identiques et peut rétablir toutes les propositions',()=>{
 ouvrirHoraires();fireEvent.change(screen.getByLabelText('Prière du matin'),{target:{value:'06:20'}});expect(screen.getByRole('status')).toHaveTextContent('Plusieurs rendez-vous');fireEvent.click(screen.getByRole('button',{name:'Rétablir tous les horaires proposés'}));expect(screen.getByLabelText('Prière du matin')).toHaveValue('06:00');expect(screen.queryByRole('status')).toBeNull();
});
it('les essais sont effacés lorsqu’on quitte la page puis revient',()=>{
 const r=ouvrirHoraires();fireEvent.change(screen.getByLabelText('Prière du matin'),{target:{value:'07:15'}});r.unmount();ouvrirHoraires();expect(screen.getByLabelText('Prière du matin')).toHaveValue('06:00');
});
it('permet de lire les trente textes sans réponse enregistrée ni appel réseau',()=>{
 const reseau=vi.spyOn(globalThis,'fetch'),stockage=vi.spyOn(Storage.prototype,'setItem');
 render(<MemoryRouter><Habitudes/></MemoryRouter>);
 const choix=screen.getByRole('combobox',{name:'Choisir une lecture'});
 expect(within(choix).getAllByRole('option')).toHaveLength(30);
 expect(screen.getByRole('article')).toHaveTextContent('Commencer avec ce qui est possible');
 fireEvent.change(choix,{target:{value:'30'}});
 expect(screen.getByRole('article')).toHaveTextContent('Jour 30 / 30');
 expect(screen.getByRole('article')).not.toHaveTextContent('Commencer avec ce qui est possible');
 expect(screen.getByText(/30 jours gratuits n’incluent pas le coach IA/)).toBeVisible();
 expect(reseau).not.toHaveBeenCalled();expect(stockage).not.toHaveBeenCalled();
});
it('propose trente lectures en anglais et conserve le jour choisi lors du changement de langue',()=>{
 render(<MemoryRouter initialEntries={['/habitudes']}><Habitudes/></MemoryRouter>);
 fireEvent.change(screen.getByRole('combobox',{name:'Choisir une lecture'}),{target:{value:'17'}});
 fireEvent.click(screen.getByRole('link',{name:'English'}));
 const choix=screen.getByRole('combobox',{name:'Choose a reading'});
 expect(choix).toHaveValue('17');expect(within(choix).getAllByRole('option')).toHaveLength(30);
 const article=screen.getByRole('article');
 expect(article).toHaveAttribute('lang','en');
 expect(article).toHaveTextContent('Reflect on your generosity');
 expect(article).toHaveTextContent('does not make your progress depend on a donation');
 expect(article).toHaveTextContent('No answer is requested or recorded.');
 fireEvent.change(choix,{target:{value:'30'}});
 expect(article).toHaveTextContent('Day 30 / 30');
 expect(article).toHaveTextContent('does not erase your history or trigger an automatic payment');
 fireEvent.click(screen.getByRole('link',{name:'Français'}));
 expect(article).toHaveAttribute('lang','fr');expect(article).toHaveTextContent('Faire un bilan honnête et paisible');
});

it.each([['fr','Voir les conditions et m’inscrire','Retrouver ma journée'],['en','Review terms and enroll','Return to my day']])('présentation publiée %s : liens localisés sans activation ni appel réseau', (langue,inscrire,journee)=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.stubEnv('VITE_HABITUDES_INSCRIPTION','ouverte');const reseau=vi.spyOn(globalThis,'fetch'),stockage=vi.spyOn(Storage.prototype,'setItem');
 render(<MemoryRouter initialEntries={[`/habitudes?lang=${langue}`]}><Habitudes/></MemoryRouter>);
 expect(screen.getByRole('link',{name:inscrire})).toHaveAttribute('href',`/habitudes/inscription${langue==='en'?'?lang=en':''}`);expect(screen.getByRole('link',{name:journee})).toHaveAttribute('href',`/habitudes/aujourdhui${langue==='en'?'?lang=en':''}`);expect(screen.queryByText('Aperçu · module en préparation')).toBeNull();expect(screen.queryByText(/Enrollment and personal tracking are still in preparation/)).toBeNull();expect(reseau).not.toHaveBeenCalled();expect(stockage).not.toHaveBeenCalled();
});
it('une inscription fermée ne bloque pas le lien vers la journée des participants existants',()=>{
 vi.stubEnv('VITE_HABITUDES_DEFIS','true');vi.stubEnv('VITE_HABITUDES_INSCRIPTION','fermee');render(<MemoryRouter><Habitudes/></MemoryRouter>);expect(screen.queryByRole('link',{name:'Voir les conditions et m’inscrire'})).toBeNull();expect(screen.getByRole('link',{name:'Retrouver ma journée'})).toBeVisible();expect(screen.getByText(/Les nouvelles inscriptions sont momentanément fermées/)).toBeVisible();
});
it('le choix Français prime sur la conservation globale de l’anglais',async()=>{
 render(<MemoryRouter initialEntries={['/habitudes?lang=en']}><GarderLangue/><Habitudes/></MemoryRouter>);expect(screen.getByRole('article')).toHaveAttribute('lang','en');fireEvent.change(screen.getByRole('combobox',{name:'Choose a reading'}),{target:{value:'17'}});expect(screen.getByRole('link',{name:'Français'})).toHaveAttribute('href','/habitudes?lang=fr');fireEvent.click(screen.getByRole('link',{name:'Français'}));await waitFor(()=>expect(screen.getByRole('article')).toHaveAttribute('lang','fr'));expect(screen.getByRole('combobox',{name:'Choisir une lecture'})).toHaveValue('17');
});
