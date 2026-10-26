import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({refus:false,save:vi.fn(),appels:[] as Record<string,unknown>[]}));
const configuration={enrollment_id:'EF',fuseau:'Africa/Kinshasa',date_locale:'2026-10-26',modifications_a_partir_du:'2026-10-27',modeles:[{module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'culte_semaine',libelle:'Culte en semaine',heure_proposee:'18:30:00',jours_iso:[3,5]}],horaires:[],revisions:[]};
vi.mock('@/lib/supabase',()=>({supabase:{rpc:async(name:string,args:Record<string,unknown>)=>{if(name==='hd_schedule_settings')return {data:mock.refus?null:configuration,error:mock.refus?{code:'42501'}:null};mock.appels.push(args);return mock.save(args);}}}));
import {HorairesHabitudes} from '@/components/HorairesHabitudes';
beforeEach(()=>{mock.refus=false;mock.appels=[];mock.save.mockReset();mock.save.mockImplementation((a:Record<string,unknown>)=>Promise.resolve({data:{revision:a.p_client_event_id,effectif_du:a.p_effectif_du,repetition:false},error:null}));});afterEach(cleanup);
async function ouvrir(langue='fr'){const r=render(<HorairesHabitudes enrollmentId="EF" langue={langue}/>);await screen.findByText('Culte en semaine');r.container.querySelector('details')!.open=true;return r;}
it('enregistre l’heure choisie à la date annoncée sans annoncer de rappel',async()=>{
 await ouvrir();expect(screen.getByText(/Ces horaires n’activent aucun rappel/)).toBeVisible();fireEvent.change(screen.getByLabelText('Heure du créneau 1'),{target:{value:'17:45'}});fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));await screen.findByText('Horaires enregistrés pour le lendemain.');
 expect(mock.appels).toHaveLength(1);expect(mock.appels[0]).toMatchObject({p_enrollment_id:'EF',p_effectif_du:'2026-10-27',p_revision_attendue:null,p_creneaux:[{heure_locale:'17:45',jours_iso:[3,5]}]});
});
it('autorise deux heures différentes pour les cultes en semaine',async()=>{
 await ouvrir();fireEvent.click(screen.getByLabelText('Ven'));fireEvent.click(screen.getByRole('button',{name:'Ajouter un créneau'}));fireEvent.change(screen.getByLabelText('Heure du créneau 2'),{target:{value:'19:00'}});fireEvent.click(screen.getAllByLabelText('Ven')[1]!);fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));await screen.findByText('Horaires enregistrés pour le lendemain.');
 expect(mock.appels[0]!.p_creneaux).toMatchObject([{heure_locale:'18:30',jours_iso:[3]},{heure_locale:'19:00',jours_iso:[5]}]);
});
it('ne sauvegarde pas si un jour manque et conserve le planning édité',async()=>{
 await ouvrir();fireEvent.click(screen.getByLabelText('Ven'));fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));expect(await screen.findByRole('alert')).toHaveTextContent('conserve la fréquence');expect(mock.appels).toHaveLength(0);expect(screen.getByLabelText('Heure du créneau 1')).toHaveValue('18:30');
});
it('une réponse perdue se réessaie avec le même identifiant et bloque les changements entre-temps',async()=>{
 mock.save.mockResolvedValueOnce({data:null,error:{message:'réseau'}});await ouvrir();fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));await screen.findByRole('alert');expect(screen.getByLabelText('Heure du créneau 1')).toBeDisabled();expect(screen.queryByText('Horaires enregistrés pour le lendemain.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Réessayer l’enregistrement'}));await screen.findByText('Horaires enregistrés pour le lendemain.');expect(mock.appels).toHaveLength(2);expect(mock.appels[1]).toEqual(mock.appels[0]);
});
it('ne confond pas une réponse incohérente avec une confirmation',async()=>{
 mock.save.mockResolvedValueOnce({data:{revision:'autre',effectif_du:'2026-10-27',repetition:false},error:null});await ouvrir();fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));expect(await screen.findByRole('alert')).toHaveTextContent('non confirmé');expect(screen.queryByText('Horaires enregistrés pour le lendemain.')).toBeNull();
});
it('un conflit de révision invite à recharger et ne prétend pas avoir enregistré',async()=>{
 mock.save.mockResolvedValueOnce({data:null,error:{code:'40001'}});await ouvrir();fireEvent.click(screen.getByRole('button',{name:'Enregistrer pour demain'}));expect(await screen.findByRole('alert')).toHaveTextContent('Recharge les réglages');expect(screen.queryByText('Horaires enregistrés pour le lendemain.')).toBeNull();
});
it('ne propose aucun formulaire quand le serveur refuse le parcours',async()=>{
 mock.refus=true;render(<HorairesHabitudes enrollmentId="EF" langue="fr"/>);await screen.findByRole('alert');expect(screen.queryByRole('button',{name:'Enregistrer pour demain'})).toBeNull();expect(mock.appels).toHaveLength(0);
});
it('traduit les commandes et explique la date d’effet en anglais',async()=>{
 await ouvrir('en');expect(screen.getByRole('button',{name:'Save for tomorrow'})).toBeVisible();expect(screen.getByText(/These times do not enable reminders/)).toBeVisible();
});
it('une double soumission en cours ne lance qu’une demande',async()=>{
 let terminer!:(value:unknown)=>void;mock.save.mockImplementationOnce(()=>new Promise(resolve=>{terminer=resolve;}));const r=await ouvrir();const form=r.container.querySelector('form')!;
 fireEvent.submit(form);fireEvent.submit(form);expect(mock.appels).toHaveLength(1);const a=mock.appels[0]!;
 terminer({data:{revision:a.p_client_event_id,effectif_du:a.p_effectif_du,repetition:false},error:null});await screen.findByText('Horaires enregistrés pour le lendemain.');
});
