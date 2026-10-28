import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
const m=vi.hoisted(()=>({native:true,charger:vi.fn(),etat:vi.fn(),programmer:vi.fn(),arreter:vi.fn(),reglage:vi.fn(),session:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:m.charger}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:m.session}}}));
vi.mock('@/lib/rappels-locaux',async orig=>({...await orig<typeof import('@/lib/rappels-locaux')>(),rappelsLocauxDisponibles:()=>m.native,etatRappelsLocaux:m.etat,programmerRappelsLocaux:m.programmer,arreterRappelsLocaux:m.arreter,ouvrirReglageAlarmes:m.reglage}));
import {RappelsLocauxHabitudes} from '@/components/RappelsLocauxHabitudes';
import {ReglageAlarmesRequis} from '@/lib/rappels-locaux';
const props={enrollmentId:'E',participantId:'P',dateLocale:'2026-10-28',finAcces:'2026-11-01T00:00:00Z',langue:'fr'};
const config={enrollment_id:'E',fuseau:'Africa/Kinshasa',date_locale:'2026-10-28',modifications_a_partir_du:'2026-10-29',horaires:[],revisions:[],modeles:[{module_id:'HD',version:1,langue:'fr',habit_key:'priere_matin',libelle:'Prière du matin',heure_proposee:'07:30',jours_iso:[1,2,3,4,5,6,7]}]};
beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-28T05:00:00Z'));
 m.native=true;m.charger.mockReset().mockResolvedValue(config);m.etat.mockReset().mockResolvedValue({nombre:0,jusqua:null,autorise:false,exact:false});
 m.session.mockReset().mockResolvedValue({data:{session:{user:{id:'U'}}},error:null});
 m.programmer.mockReset().mockResolvedValue({nombre:4,jusqua:Date.parse('2026-10-31T06:30:00Z')});m.arreter.mockReset().mockResolvedValue(undefined);m.reglage.mockReset().mockResolvedValue(undefined);
});
afterEach(()=>{cleanup();vi.useRealTimers();});
function ouvrir(){const d=screen.getByText('Mes rappels sans Internet').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));}
it('ne montre pas une fausse capacité hors connexion sur le site',()=>{
 m.native=false;render(<RappelsLocauxHabitudes {...props}/>);expect(screen.queryByText('Mes rappels sans Internet')).toBeNull();expect(m.charger).not.toHaveBeenCalled();
});
it('exige un choix explicite et ne programme rien à l’ouverture',async()=>{
 render(<RappelsLocauxHabitudes {...props}/>);ouvrir();await screen.findByLabelText('Prière du matin');
 const b=screen.getByRole('button',{name:'Autoriser et programmer sur ce téléphone'});expect(b).toBeDisabled();expect(m.programmer).not.toHaveBeenCalled();expect(m.session).not.toHaveBeenCalled();
 fireEvent.click(screen.getByLabelText(/Pour ces rendez-vous/));fireEvent.click(b);
 await screen.findByText(/4 rappels confirmés par le téléphone/);
 expect(m.programmer.mock.calls[0]![0].rappels).toHaveLength(4);expect(m.programmer.mock.calls[0]![1]).toBe('U');expect(m.programmer.mock.calls[0]![2]).toBe('E');
});
it('propose le réglage Android après refus des alarmes exactes, sans l’ouvrir automatiquement',async()=>{
 m.programmer.mockRejectedValue(new ReglageAlarmesRequis());
 render(<RappelsLocauxHabitudes {...props}/>);ouvrir();await screen.findByLabelText('Prière du matin');
 fireEvent.click(screen.getByLabelText(/Pour ces rendez-vous/));fireEvent.click(screen.getByRole('button',{name:'Autoriser et programmer sur ce téléphone'}));
 const b=await screen.findByRole('button',{name:'Ouvrir « Alarmes et rappels »'});expect(m.reglage).not.toHaveBeenCalled();expect(screen.queryByText(/rappels confirmés/)).toBeNull();
 await act(async()=>{fireEvent.click(b);});expect(m.reglage).toHaveBeenCalledOnce();
});
it('arrête les rappels sans demander de permission et n’annonce pas un arrêt non confirmé',async()=>{
 m.arreter.mockRejectedValue(Error('arrêt refusé'));render(<RappelsLocauxHabitudes {...props}/>);ouvrir();await screen.findByLabelText('Prière du matin');
 fireEvent.click(screen.getByRole('button',{name:'Arrêter les rappels locaux de ce téléphone'}));await screen.findByRole('alert');
 expect(screen.queryByText(/ont été arrêtés/)).toBeNull();expect(m.programmer).not.toHaveBeenCalled();
});

