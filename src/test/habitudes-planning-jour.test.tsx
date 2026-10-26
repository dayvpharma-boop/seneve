import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {PlanningJourHabitudes} from '@/components/PlanningJourHabitudes';
const modele={module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'priere_matin',libelle:'Prière du matin',heure_proposee:'06:00',jours_iso:[1,2,3,4,5,6,7]};
const base={enrollment_id:'EA',fuseau:'Africa/Kinshasa',date_locale:'2026-10-26',modifications_a_partir_du:'2026-10-27',modeles:[modele],horaires:[],revisions:[]};
const horaire={...modele,participant_id:'PA',creneau_id:'matin',heure_locale:'07:15:00',fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null};
const vue=(dateLocale='2026-10-26',langue='fr',enrollmentId='EA')=><PlanningJourHabitudes enrollmentId={enrollmentId} participantId="PA" dateLocale={dateLocale} langue={langue}/>;
beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:base,error:null});});afterEach(cleanup);
it('affiche le repère proposé sans appel d’écriture',async()=>{
 render(vue());expect(await screen.findByText('06:00')).toBeVisible();expect(screen.getByText('Horaire proposé')).toBeVisible();expect(mock.rpc).toHaveBeenCalledTimes(1);expect(mock.rpc).toHaveBeenCalledWith('hd_schedule_settings',{p_enrollment_id:'EA'});
});
it('affiche l’heure personnelle et conserve les journées passées lors d’un choix de date',async()=>{
 mock.rpc.mockResolvedValue({data:{...base,horaires:[{...horaire,valide_au:'2026-10-26'},{...horaire,heure_locale:'08:30:00',valide_du:'2026-10-27'}]},error:null});
 const r=render(vue());expect(await screen.findByText('07:15')).toBeVisible();expect(screen.getByText('Horaire personnel')).toBeVisible();r.rerender(vue('2026-10-27'));expect(await screen.findByText('08:30')).toBeVisible();expect(screen.queryByText('07:15')).toBeNull();expect(mock.rpc).toHaveBeenCalledTimes(1);
});
it('signale une collision sans déplacer les horaires ni déclarer les activités',async()=>{
 mock.rpc.mockResolvedValue({data:{...base,modeles:[modele,{...modele,habit_key:'bible_matin',libelle:'Bible du matin'}]},error:null});render(vue());await screen.findByText('Bible du matin');expect(screen.getByText(/Plusieurs rendez-vous ont la même heure/)).toBeVisible();expect(screen.getAllByText('06:00')).toHaveLength(2);expect(mock.rpc.mock.calls.every(c=>c[0]==='hd_schedule_settings')).toBe(true);
});
it('une panne ne remplace pas les heures personnelles par des heures supposées',async()=>{
 mock.rpc.mockResolvedValue({data:null,error:{code:'42501'}});render(vue());expect(await screen.findByText('Le planning ne peut pas être vérifié pour cette journée. Aucun horaire n’est supposé.')).toBeVisible();expect(screen.queryByText('06:00')).toBeNull();expect(screen.queryByRole('list')).toBeNull();
});
it('le bouton d’actualisation relit le planning modifié sur un autre écran',async()=>{
 render(vue());await screen.findByText('06:00');mock.rpc.mockResolvedValue({data:{...base,horaires:[horaire]},error:null});fireEvent.click(screen.getByRole('button',{name:'Actualiser mon planning'}));expect(await screen.findByText('07:15')).toBeVisible();expect(screen.queryByText('06:00')).toBeNull();
});
it('ne restitue pas la réponse tardive d’une autre inscription',async()=>{
 let terminer!:(v:unknown)=>void;mock.rpc.mockImplementationOnce(()=>new Promise(resolve=>{terminer=resolve;}));const r=render(vue());mock.rpc.mockResolvedValue({data:{...base,enrollment_id:'EB',modeles:[{...modele,heure_proposee:'09:00'}]},error:null});r.rerender(vue('2026-10-26','fr','EB'));expect(await screen.findByText('09:00')).toBeVisible();await act(async()=>{terminer({data:{...base,horaires:[horaire]},error:null});});expect(screen.queryByText('07:15')).toBeNull();expect(screen.getByText('09:00')).toBeVisible();
});
it('un fuseau contradictoire ne produit pas d’horaire affiché',async()=>{
 mock.rpc.mockResolvedValue({data:{...base,horaires:[{...horaire,fuseau:'Pacific/Kiritimati'}]},error:null});render(vue());expect(await screen.findByText('Le planning ne peut pas être vérifié pour cette journée. Aucun horaire n’est supposé.')).toBeVisible();expect(screen.queryByText('07:15')).toBeNull();
});
it('traduit les commandes et les indications de lecture en anglais',async()=>{
 render(vue('2026-10-26','en'));await screen.findByText('06:00');expect(screen.getByText('Suggested time')).toBeVisible();expect(screen.getByRole('button',{name:'Refresh my schedule'})).toBeVisible();
});
