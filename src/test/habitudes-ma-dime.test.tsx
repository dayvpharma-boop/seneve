import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn(),regler:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:mock.charger,reglerRythmeDime:mock.regler}));
import {MaDimeHabitudes,prochaineDime} from '@/components/MaDimeHabitudes';
import {rythmeProposeHabitudes} from '@/lib/habitudes-rythme-propose';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';

// Demande de Dr Justin (03/11/2026) : « Ma dîme » sous « Mes cultes de la semaine ».
const config=(dime?:ConfigurationHoraires['dime']):ConfigurationHoraires=>({enrollment_id:'E',fuseau:'Africa/Kinshasa',date_locale:'2026-11-03',modifications_a_partir_du:'2026-11-04',revisions:[],horaires:[],
 modeles:[...rythmeProposeHabitudes,{module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'dime',libelle:'Dîme',heure_proposee:'12:00',jours_iso:[7]}],...(dime?{dime}:{})});
beforeEach(()=>{mock.charger.mockReset().mockResolvedValue(config({rythme:'semaine'}));mock.regler.mockReset().mockResolvedValue({rythme:'mois',jour_mois:25});});
afterEach(cleanup);
const ouvrir=async()=>{render(<MemoryRouter><MaDimeHabitudes enrollmentId="E" participantId="P" dateLocale="2026-11-03" langue="fr" lienReglages="/reglages#horaires"/></MemoryRouter>);
 const d=screen.getByText('Ma dîme').closest('details')!;act(()=>{d.open=true;d.dispatchEvent(new Event('toggle'));});await screen.findByText(/Prochaine dîme/);return d;};

it('calcule la prochaine dîme : dimanche en hebdomadaire, le jour du mois en mensuel',()=>{
 expect(prochaineDime(config(),'P','2026-11-03')).toEqual({date:'2026-11-08',heure:'12:00'});
 expect(prochaineDime(config({rythme:'mois',jour_mois:3}),'P','2026-11-03')).toEqual({date:'2026-11-03',heure:'12:00'});
 expect(prochaineDime(config({rythme:'mois',jour_mois:31}),'P','2026-11-03')).toEqual({date:'2026-11-30',heure:'12:00'});
});
it('se replie, puis montre la prochaine dîme, les exemples et le simulateur',async()=>{
 const d=await ouvrir();
 expect(within(d).getByText(/dimanche 8 novembre · 12:00/)).toBeInTheDocument();
 expect(within(d).getByText('Comment donner ma dîme')).toBeInTheDocument();
 expect(within(d).getByText('Dîme : 10 % de 200 = 20')).toBeInTheDocument();
 expect(within(d).getByText('Dîme : 10 % de 430 = 43')).toBeInTheDocument();
 expect(within(d).getByText('Simulateur de dîme facultatif')).toBeInTheDocument();
 expect(within(d).getByRole('link',{name:/Changer le jour ou l’heure/})).toHaveAttribute('href','/reglages#horaires');
});
it('un salarié passe à « une fois par mois, le 25 » et l’enregistre',async()=>{
 const d=await ouvrir();
 const bouton=within(d).getByRole('button',{name:'Enregistrer mon rythme'});expect(bouton).toBeDisabled();
 fireEvent.click(within(d).getByRole('radio',{name:/Je reçois un salaire/}));
 fireEvent.change(within(d).getByRole('combobox',{name:/Jour du mois/}),{target:{value:'25'}});
 fireEvent.click(bouton);
 await screen.findByText('Rythme enregistré.');
 expect(mock.regler).toHaveBeenCalledWith({rythme:'mois',jour_mois:25});
 expect(mock.charger).toHaveBeenCalledTimes(2);
});
