import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {InscriptionHabitudes,type ConfigurationInscriptionHabitudes} from '@/components/InscriptionHabitudes';
const config:ConfigurationInscriptionHabitudes={compteId:'compte-a',programmeId:'HD_TEST',version:1,langue:'fr',offreId:'OFFRE_TEST',fuseau:'Africa/Kinshasa',planning:[{habit_key:'culte_semaine',libelle:'Culte en semaine',creneaux:[{creneau_id:'mercredi',heure_locale:'18:30',jours_iso:[3]},{creneau_id:'vendredi',heure_locale:'19:00',jours_iso:[5]}]}]};
const confirmation={cree:true,existant:false,enrollment_id:'11111111-1111-4111-8111-111111111111',entitlement_id:'22222222-2222-4222-8222-222222222222',debut:'2026-10-26T08:00:00+00:00',fin_exclue:'2026-11-25T08:00:00+00:00',etat:'actif',horaires_appliques:true};
beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:confirmation,error:null});});afterEach(cleanup);
function ouvrir(c=config){const r=render(<InscriptionHabitudes configuration={c}/>);r.container.querySelector('details')!.open=true;return r;}
function confirmer(){fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme|I confirm/}));fireEvent.click(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'}));}
it('exige la confirmation puis transmet les horaires personnalisés sans le libellé ni un identifiant de participant',async()=>{
 ouvrir();expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeDisabled();expect(mock.rpc).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Culte en semaine — Mer'),{target:{value:'17:45'}});confirmer();await screen.findByText('Inscription confirmée. Tes horaires ont été enregistrés.');
 expect(mock.rpc).toHaveBeenCalledTimes(1);expect(mock.rpc).toHaveBeenCalledWith('hd_start_free',{p_programme_id:'HD_TEST',p_version:1,p_langue:'fr',p_offre_id:'OFFRE_TEST',p_confirmation:true,p_horaires:[{habit_key:'culte_semaine',creneaux:[{creneau_id:'mercredi',heure_locale:'17:45',jours_iso:[3]},{creneau_id:'vendredi',heure_locale:'19:00',jours_iso:[5]}]}]});
 expect(screen.getByText(/25 novembre 2026/)).toHaveTextContent('09:00');
});
it('bloque la double soumission pendant la réponse serveur',async()=>{
 let terminer!:(v:unknown)=>void;mock.rpc.mockImplementation(()=>new Promise(r=>{terminer=r;}));const r=ouvrir();fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme|I confirm/}));fireEvent.submit(r.container.querySelector('form')!);fireEvent.submit(r.container.querySelector('form')!);expect(mock.rpc).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();terminer({data:confirmation,error:null});await screen.findByText(/Inscription confirmée/);
});
it('conserve exactement la demande après une réponse perdue, sans annoncer un nouvel accès au retour',async()=>{
 mock.rpc.mockResolvedValueOnce({data:null,error:{message:'réseau'}}).mockResolvedValueOnce({data:{...confirmation,cree:false,existant:true,horaires_appliques:false},error:null});ouvrir();confirmer();await screen.findByRole('alert');expect(screen.getByLabelText('Culte en semaine — Mer')).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Vérifier mon inscription'}));await screen.findByText(/Ses dates et ses horaires ont été conservés/);expect(mock.rpc.mock.calls[1]).toEqual(mock.rpc.mock.calls[0]);expect(screen.queryByText(/Tes horaires ont été enregistrés/)).toBeNull();
});
it('n’annonce pas de succès si la durée reçue diffère de 30 jours',async()=>{
 mock.rpc.mockResolvedValue({data:{...confirmation,fin_exclue:'2026-11-26T08:00:00Z'},error:null});ouvrir();confirmer();await screen.findByRole('alert');expect(screen.queryByText(/Inscription confirmée/)).toBeNull();expect(screen.getByRole('button',{name:'Vérifier mon inscription'})).toBeEnabled();
});
it('présente un droit déjà utilisé sans proposer un nouveau départ',async()=>{
 mock.rpc.mockResolvedValue({data:{cree:false,motif:'gratuite_deja_utilisee'},error:null});ouvrir();confirmer();await screen.findByText(/Ton accès gratuit a déjà été utilisé/);expect(screen.queryByRole('button')).toBeNull();
});
it('un refus du serveur exige de recharger la configuration',async()=>{
 mock.rpc.mockResolvedValue({data:null,error:{code:'42501'}});ouvrir();confirmer();expect(await screen.findByRole('alert')).toHaveTextContent('Recharge la page');expect(screen.getByRole('button',{name:/Vérifier mon inscription|Commencer mes 30 jours gratuits/})).toBeDisabled();
});
it('un autre compte ne récupère ni la confirmation ni la demande du premier compte',async()=>{
 const r=ouvrir();confirmer();await screen.findByText(/Inscription confirmée/);r.rerender(<InscriptionHabitudes configuration={{...config,compteId:'compte-b'}}/>);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();expect(screen.getByRole('checkbox',{name:/Je confirme|I confirm/})).not.toBeChecked();expect(screen.getByRole('button',{name:/Vérifier mon inscription|Commencer mes 30 jours gratuits/})).toBeDisabled();
});
it('un droit révoqué retrouvé invite à consulter les accès sans annoncer sa réactivation',async()=>{
 mock.rpc.mockResolvedValue({data:{...confirmation,cree:false,existant:true,horaires_appliques:false,etat:'revoque'},error:null});ouvrir();confirmer();await screen.findByText(/Ses dates et ses horaires ont été conservés/);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();expect(screen.getByRole('link',{name:'Consulter mes accès'})).toHaveAttribute('href',`${import.meta.env.BASE_URL}acces?lang=fr`);
});
it('traduit la confirmation et les explications en anglais',()=>{
 ouvrir({...config,langue:'en'});expect(screen.getByRole('button',{name:'Start my 30 free days'})).toBeDisabled();expect(screen.getByText(/No automatic payment follows/)).toBeVisible();
});
it('personnalise deux jours et deux heures de culte avant de commencer',async()=>{
 ouvrir();const a=within(screen.getByRole('group',{name:'Culte en semaine — créneau 1'})),b=within(screen.getByRole('group',{name:'Culte en semaine — créneau 2'}));
 fireEvent.click(a.getByLabelText('Mer'));fireEvent.click(a.getByLabelText('Mar'));fireEvent.change(a.getByLabelText('Culte en semaine — Mar'),{target:{value:'17:45'}});
 fireEvent.click(b.getByLabelText('Ven'));fireEvent.click(b.getByLabelText('Sam'));fireEvent.change(b.getByLabelText('Culte en semaine — Sam'),{target:{value:'18:15'}});confirmer();await screen.findByText(/Inscription confirmée/);
 expect(mock.rpc.mock.calls[0]![1].p_horaires[0].creneaux).toMatchObject([{heure_locale:'17:45',jours_iso:[2]},{heure_locale:'18:15',jours_iso:[6]}]);
});
it('signale un rendez-vous manquant sans envoyer la demande et garde les choix',async()=>{
 ouvrir();const a=within(screen.getByRole('group',{name:'Culte en semaine — créneau 1'}));fireEvent.click(a.getByLabelText('Mer'));confirmer();expect(await screen.findByRole('alert')).toHaveTextContent('conserve la fréquence');expect(mock.rpc).not.toHaveBeenCalled();expect(a.getByLabelText('Mer')).not.toBeChecked();
});
it('refuse deux rendez-vous de culte identiques même si leur nombre total est correct',async()=>{
 ouvrir();const b=within(screen.getByRole('group',{name:'Culte en semaine — créneau 2'}));fireEvent.click(b.getByLabelText('Ven'));fireEvent.click(b.getByLabelText('Mer'));fireEvent.change(b.getByLabelText('Culte en semaine — Mer'),{target:{value:'18:30'}});confirmer();await screen.findByRole('alert');expect(mock.rpc).not.toHaveBeenCalled();
});
it('ajoute un créneau pour séparer les jours d’un même horaire proposé',async()=>{
 ouvrir({...config,planning:[{...config.planning[0]!,creneaux:[{creneau_id:'principal',heure_locale:'18:30',jours_iso:[3,5]}]}]});
 const a=within(screen.getByRole('group',{name:'Culte en semaine — créneau 1'}));fireEvent.click(a.getByLabelText('Ven'));fireEvent.click(screen.getByRole('button',{name:'Ajouter un créneau'}));const b=within(screen.getByRole('group',{name:'Culte en semaine — créneau 2'}));fireEvent.click(b.getByLabelText('Ven'));fireEvent.change(b.getByLabelText('Culte en semaine — Ven'),{target:{value:'19:15'}});confirmer();await screen.findByText(/Inscription confirmée/);expect(mock.rpc.mock.calls[0]![1].p_horaires[0].creneaux).toMatchObject([{heure_locale:'18:30',jours_iso:[3]},{heure_locale:'19:15',jours_iso:[5]}]);
});
it('une modification après confirmation demande de confirmer à nouveau',()=>{
 ouvrir();fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme/}));expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeEnabled();fireEvent.change(screen.getByLabelText('Culte en semaine — Mer'),{target:{value:'17:45'}});expect(screen.getByRole('checkbox',{name:/Je confirme/})).not.toBeChecked();expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeDisabled();expect(mock.rpc).not.toHaveBeenCalled();
});
it('une habitude quotidienne ne peut pas remplacer un jour manquant par deux passages le même jour',async()=>{
 ouvrir({...config,planning:[{habit_key:'priere_matin',libelle:'Prière du matin',creneaux:[{creneau_id:'principal',heure_locale:'06:00',jours_iso:[1,2,3,4,5,6,7]}]}]});
 fireEvent.click(screen.getByLabelText('Dim'));fireEvent.click(screen.getByRole('button',{name:'Ajouter un créneau'}));const b=within(screen.getByRole('group',{name:'Prière du matin — créneau 2'}));fireEvent.click(b.getByLabelText('Lun'));fireEvent.change(b.getByLabelText('Prière du matin — Lun'),{target:{value:'07:00'}});confirmer();await screen.findByRole('alert');expect(mock.rpc).not.toHaveBeenCalled();
});
