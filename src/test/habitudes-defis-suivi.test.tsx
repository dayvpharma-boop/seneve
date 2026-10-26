import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-defis-api',()=>({chargerDefisHabitudes:mock.charger}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {SuiviDefisHabitudes} from '@/components/SuiviDefisHabitudes';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001';
const defis=[1,8,15,22,29].map((du,i)=>({du,au:i===4?30:du+6,titre:`Défi ${i+1}`,critere:'Déclaration volontaire',ouvert:i===0,occurrence:{occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:false}}));
const props={enrollmentId:eid,participantId:'P1',dateLocale:'2026-10-27',jour:1,langue:'fr'};
beforeEach(()=>{sessionStorage.clear();mock.charger.mockReset().mockResolvedValue({userId:uid,jour:1,defis});mock.rpc.mockReset();});afterEach(cleanup);
it('ne lit ni ne déclare rien avant ouverture et ne permet pas de cocher les défis futurs',async()=>{
 render(<SuiviDefisHabitudes {...props}/>);expect(mock.charger).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Suivre mes défis facultatifs'}));await screen.findByRole('heading',{name:'Défi 1'});expect(screen.getAllByRole('button',{name:'J’ai réalisé cette activité'})).toHaveLength(1);expect(screen.getByText('Disponible à partir du jour 8.')).toBeVisible();expect(mock.rpc).not.toHaveBeenCalled();
});
it('compte le défi seulement après confirmation du serveur',async()=>{
 mock.rpc.mockResolvedValue({data:{event_id:'40000000-0000-4000-8000-000000000001',etat:'realisee',aide_demandee:false,repetition:false},error:null});render(<SuiviDefisHabitudes {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Suivre mes défis facultatifs'}));fireEvent.click(await screen.findByRole('button',{name:'J’ai réalisé cette activité'}));await screen.findByText('1 défi(s) réalisé(s) sur 1 ouvert(s)');expect(mock.rpc.mock.calls[0]![1].p_activity_id).toBe(defis[0]!.occurrence.occurrence_id);
});
it('propose une reprise après échec sans annoncer de progression',async()=>{
 mock.charger.mockRejectedValueOnce(Error('network'));render(<SuiviDefisHabitudes {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Suivre mes défis facultatifs'}));await screen.findByRole('alert');expect(screen.queryByText(/défi\(s\) réalisé/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Réessayer les défis'}));await screen.findByRole('heading',{name:'Défi 1'});
});
it('reste limité au premier mois français validé',()=>{
 const vue=render(<SuiviDefisHabitudes {...props} jour={31}/>);expect(screen.queryByRole('button')).toBeNull();vue.rerender(<SuiviDefisHabitudes {...props} langue="en"/>);expect(screen.queryByRole('button')).toBeNull();expect(mock.charger).not.toHaveBeenCalled();
});
