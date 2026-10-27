import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
const utilisateur='10000000-0000-4000-8000-000000000001',enrollment='20000000-0000-4000-8000-000000000001';
const occurrence={occurrence_id:'30000000-0000-4000-8000-000000000001',enrollment_id:enrollment,version:1,date_locale:'2026-10-26',requise:true};
const jour={userId:utilisateur,date:'2026-10-26',jour:1,activites:[]};
function ouvrir(){render(<ActivitesJourRecette enrollmentId={enrollment} participantId="P1" dateLocale="2026-10-26" langue="fr"/>);}
beforeEach(()=>{sessionStorage.clear();mocks.charger.mockReset();mocks.rpc.mockReset();});afterEach(cleanup);

it('le lecteur de midi ne déclare ni le matin ni le soir et met à jour la journée',async()=>{
 const actions=['matin','midi','soir'].map((m,i)=>({occurrence:{...occurrence,occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`},habit_key:`priere_${m}`,consigne:m==='midi'?'Prière de midi':m==='soir'?'Prière du soir':'Prière du matin',critere:null,heure:['06:00','13:10','21:10'][i]!}));
 mocks.charger.mockResolvedValue({...jour,activites:actions});mocks.rpc.mockImplementation((_nom,p)=>Promise.resolve({data:{event_id:p.p_client_event_id,etat:'realisee',aide_demandee:false,repetition:false},error:null}));
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Lire et prier — midi'}));const lecteur=screen.getByRole('dialog',{name:'Prière de midi'});expect(mocks.rpc).not.toHaveBeenCalled();
 fireEvent.click(within(lecteur).getByRole('button',{name:'J’ai prié'}));await within(lecteur).findByText('Prière déclarée · Synchronisée');expect(mocks.rpc.mock.calls[0]![1].p_activity_id).toBe(actions[1]!.occurrence.occurrence_id);
 fireEvent.click(within(lecteur).getByRole('button',{name:'Revenir à ma journée'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('progressbar')).toHaveAttribute('value','1');
 expect(within(screen.getByRole('article',{name:'Prière du matin'})).getByRole('status')).toHaveTextContent('Pas encore enregistrée');
 expect(within(screen.getByRole('article',{name:'Prière du soir'})).getByRole('status')).toHaveTextContent('Pas encore enregistrée');
});
