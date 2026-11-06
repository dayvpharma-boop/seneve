import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
// Demande de Dr Justin (06/11/2026) : choisir ses rappels dès l'inscription à Habitudes & Défis.
const mock=vi.hoisted(()=>({rpc:vi.fn(),activer:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
vi.mock('@/lib/habitudes-rappels',()=>({rappelsHabitudesActifs:()=>true,activerRappelsDepuisInscription:(...a:unknown[])=>mock.activer(...a)}));
import {InscriptionHabitudes,type ConfigurationInscriptionHabitudes} from '@/components/InscriptionHabitudes';
const config:ConfigurationInscriptionHabitudes={compteId:'compte-a',programmeId:'HD_TEST',version:1,langue:'fr',offreId:'OFFRE_TEST',fuseau:'Africa/Kinshasa',planning:[{habit_key:'culte_semaine',libelle:'Culte en semaine',creneaux:[{creneau_id:'mercredi',heure_locale:'18:30',jours_iso:[3]}]},{habit_key:'culte_dimanche',libelle:'Culte du dimanche',creneaux:[{creneau_id:'dimanche',heure_locale:'09:00',jours_iso:[7]}]}]};
const confirmation={cree:true,existant:false,enrollment_id:'11111111-1111-4111-8111-111111111111',entitlement_id:'22222222-2222-4222-8222-222222222222',debut:'2026-10-26T08:00:00+00:00',fin_exclue:'2026-11-25T08:00:00+00:00',etat:'actif',horaires_appliques:true};
beforeEach(()=>{mock.rpc.mockReset().mockResolvedValue({data:confirmation,error:null});mock.activer.mockReset().mockResolvedValue('actifs');});afterEach(cleanup);
function engagerEtConfirmer(){
 const d=screen.getByText('Lire mes engagements').closest('details')!;act(()=>{d.open=true;d.dispatchEvent(new Event('toggle'));});
 fireEvent.click(screen.getByRole('checkbox',{name:/J’ai lu mes engagements/}));fireEvent.click(screen.getByRole('checkbox',{name:/Je confirme/}));
 fireEvent.click(screen.getByRole('button',{name:'Commencer mes 30 jours gratuits'}));
}
it('montre les rappels allumés au départ, toutes les habitudes cochées, avant les engagements',()=>{
 render(<InscriptionHabitudes configuration={config}/>);
 const interrupteur=screen.getByRole('switch',{name:'Recevoir les rappels de mes habitudes'});expect(interrupteur).toBeChecked();
 expect(screen.getByRole('checkbox',{name:'Culte en semaine'})).toBeChecked();expect(screen.getByRole('checkbox',{name:'Culte du dimanche'})).toBeChecked();
 expect(screen.getByText('Mes rappels').compareDocumentPosition(screen.getByText('Lire mes engagements'))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('active les rappels après l’inscription confirmée, sans les habitudes décochées',async()=>{
 render(<InscriptionHabitudes configuration={config}/>);fireEvent.click(screen.getByRole('checkbox',{name:'Culte du dimanche'}));engagerEtConfirmer();
 await screen.findByText('Tes rappels sont activés. Tu peux les régler à tout moment dans Mes réglages.');
 expect(mock.activer).toHaveBeenCalledWith(['culte_dimanche']);
});
it('n’active rien si la personne coupe les rappels',async()=>{
 render(<InscriptionHabitudes configuration={config}/>);fireEvent.click(screen.getByRole('switch',{name:'Recevoir les rappels de mes habitudes'}));
 expect(screen.queryByRole('checkbox',{name:'Culte en semaine'})).toBeNull();engagerEtConfirmer();
 await screen.findByText(/Inscription confirmée/);expect(mock.activer).not.toHaveBeenCalled();
});
it('explique quoi faire si les notifications sont bloquées',async()=>{
 mock.activer.mockResolvedValue('refus');render(<InscriptionHabitudes configuration={config}/>);engagerEtConfirmer();
 await screen.findByText(/Les notifications sont bloquées sur ce téléphone/);
});
