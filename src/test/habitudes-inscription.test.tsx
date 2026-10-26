import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {InscriptionHabitudes,type ConfigurationInscriptionHabitudes} from '@/components/InscriptionHabitudes';
const config:ConfigurationInscriptionHabitudes={compteId:'compte-a',programmeId:'HD_TEST',version:1,langue:'fr',offreId:'OFFRE_TEST',fuseau:'Africa/Kinshasa',planning:[{habit_key:'culte_semaine',libelle:'Culte en semaine',creneaux:[{creneau_id:'mercredi',heure_locale:'18:30',jours_iso:[3]},{creneau_id:'vendredi',heure_locale:'19:00',jours_iso:[5]}]}]};
const confirmation={cree:true,existant:false,enrollment_id:'11111111-1111-4111-8111-111111111111',entitlement_id:'22222222-2222-4222-8222-222222222222',debut:'2026-10-26T08:00:00+00:00',fin_exclue:'2026-11-25T08:00:00+00:00',etat:'actif',horaires_appliques:true};
beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:confirmation,error:null});});afterEach(cleanup);
function ouvrir(c=config){const r=render(<InscriptionHabitudes configuration={c}/>);r.container.querySelector('details')!.open=true;return r;}
function confirmer(){fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'}));}
it('exige la confirmation puis transmet les horaires personnalisés sans le libellé ni un identifiant de participant',async()=>{
 ouvrir();expect(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'})).toBeDisabled();expect(mock.rpc).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Culte en semaine — Mer'),{target:{value:'17:45'}});confirmer();await screen.findByText('Inscription confirmée. Tes horaires ont été enregistrés.');
 expect(mock.rpc).toHaveBeenCalledTimes(1);expect(mock.rpc).toHaveBeenCalledWith('hd_start_free',{p_programme_id:'HD_TEST',p_version:1,p_langue:'fr',p_offre_id:'OFFRE_TEST',p_confirmation:true,p_horaires:[{habit_key:'culte_semaine',creneaux:[{creneau_id:'mercredi',heure_locale:'17:45',jours_iso:[3]},{creneau_id:'vendredi',heure_locale:'19:00',jours_iso:[5]}]}]});
 expect(screen.getByText(/25 novembre 2026/)).toHaveTextContent('09:00');
});
it('bloque la double soumission pendant la réponse serveur',async()=>{
 let terminer!:(v:unknown)=>void;mock.rpc.mockImplementation(()=>new Promise(r=>{terminer=r;}));const r=ouvrir();fireEvent.click(screen.getByRole('checkbox'));fireEvent.submit(r.container.querySelector('form')!);fireEvent.submit(r.container.querySelector('form')!);expect(mock.rpc).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();terminer({data:confirmation,error:null});await screen.findByText(/Inscription confirmée/);
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
 mock.rpc.mockResolvedValue({data:null,error:{code:'42501'}});ouvrir();confirmer();expect(await screen.findByRole('alert')).toHaveTextContent('Recharge la page');expect(screen.getByRole('button')).toBeDisabled();
});
it('un autre compte ne récupère ni la confirmation ni la demande du premier compte',async()=>{
 const r=ouvrir();confirmer();await screen.findByText(/Inscription confirmée/);r.rerender(<InscriptionHabitudes configuration={{...config,compteId:'compte-b'}}/>);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();expect(screen.getByRole('checkbox')).not.toBeChecked();expect(screen.getByRole('button')).toBeDisabled();
});
it('un droit révoqué retrouvé invite à consulter les accès sans annoncer sa réactivation',async()=>{
 mock.rpc.mockResolvedValue({data:{...confirmation,cree:false,existant:true,horaires_appliques:false,etat:'revoque'},error:null});ouvrir();confirmer();await screen.findByText(/Ses dates et ses horaires ont été conservés/);expect(screen.queryByText(/Inscription confirmée/)).toBeNull();expect(screen.getByRole('link',{name:'Consulter mes accès'})).toHaveAttribute('href','/offres?lang=fr');
});
it('traduit la confirmation et les explications en anglais',()=>{
 ouvrir({...config,langue:'en'});expect(screen.getByRole('button',{name:'Start my 30 free days'})).toBeDisabled();expect(screen.getByText(/No automatic payment follows/)).toBeVisible();
});
