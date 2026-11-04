import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {InscriptionHabitudes,type ConfigurationInscriptionHabitudes} from '@/components/InscriptionHabitudes';
// Demande de Dr Justin (04/11/2026) : dès l'inscription, une heure différente selon le jour.
const config:ConfigurationInscriptionHabitudes={compteId:'compte-a',programmeId:'HD_TEST',version:1,langue:'fr',offreId:'OFFRE_TEST',fuseau:'Africa/Kinshasa',planning:[{habit_key:'exercice',libelle:'Exercice adapté',creneaux:[{creneau_id:'principal',heure_locale:'06:45',jours_iso:[1,3,5]}]}]};
const confirmation={cree:true,existant:false,enrollment_id:'11111111-1111-4111-8111-111111111111',entitlement_id:'22222222-2222-4222-8222-222222222222',debut:'2026-10-26T08:00:00+00:00',fin_exclue:'2026-11-25T08:00:00+00:00',etat:'actif',horaires_appliques:true};
beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:confirmation,error:null});});afterEach(cleanup);
function ouvrir(){
 const r=render(<InscriptionHabitudes configuration={config}/>);
 r.container.querySelectorAll('details').forEach(d=>{act(()=>{d.open=true;d.dispatchEvent(new Event('toggle'));});});
 fireEvent.click(screen.getByRole('checkbox',{name:/J’ai lu mes engagements/}));return r;
}
it('envoie une heure par jour quand on choisit « Une heure différente selon le jour »',async()=>{
 ouvrir();
 fireEvent.click(screen.getByRole('checkbox',{name:'Une heure différente selon le jour'}));
 fireEvent.change(screen.getByLabelText('Exercice adapté — Mercredi'),{target:{value:'16:00'}});
 fireEvent.change(screen.getByLabelText('Exercice adapté — Vendredi'),{target:{value:'08:00'}});
 fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme/}));fireEvent.click(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'}));
 await screen.findByText(/Inscription confirmée/);
 expect(mock.rpc).toHaveBeenCalledWith('hd_start_free',expect.objectContaining({p_horaires:[{habit_key:'exercice',creneaux:[
  {creneau_id:'jour_1',heure_locale:'06:45',jours_iso:[1]},{creneau_id:'jour_3',heure_locale:'16:00',jours_iso:[3]},{creneau_id:'jour_5',heure_locale:'08:00',jours_iso:[5]}]}]}));
});
it('revenir à une heure commune regroupe les jours sur la première heure',async()=>{
 ouvrir();
 const choix=screen.getByRole('checkbox',{name:'Une heure différente selon le jour'});
 fireEvent.click(choix);fireEvent.change(screen.getByLabelText('Exercice adapté — Mercredi'),{target:{value:'16:00'}});fireEvent.click(choix);
 const champ=within(screen.getByRole('group',{name:/créneau 1/})).getByDisplayValue('06:45');expect(champ).toBeInTheDocument();
 fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme/}));fireEvent.click(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'}));
 await screen.findByText(/Inscription confirmée/);
 expect(mock.rpc).toHaveBeenCalledWith('hd_start_free',expect.objectContaining({p_horaires:[{habit_key:'exercice',creneaux:[{creneau_id:'principal',heure_locale:'06:45',jours_iso:[1,3,5]}]}]}));
});
