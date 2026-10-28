import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc,from:()=>({select:()=>({eq:()=>({eq:mocks.read})})})}}));
import {IgnorerRappelHabitude} from '@/components/IgnorerRappelHabitude';
beforeEach(()=>{vi.resetAllMocks();mocks.read.mockResolvedValue({data:[],error:null});mocks.rpc.mockResolvedValue({data:true,error:null});});
it('confirme le choix sans appeler record_progress',async()=>{render(<IgnorerRappelHabitude enrollmentId="e" activityId="a" langue="fr"/>);fireEvent.click(await screen.findByRole('button',{name:'Ignorer les rappels pour aujourd’hui'}));await screen.findByText(/L’activité n’est pas comptée comme réalisée/);expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('hd_ignore_reminder',{p_enrollment_id:'e',p_activity_id:'a'});});
it('un échec réseau ne montre aucun succès',async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:'offline'}});render(<IgnorerRappelHabitude enrollmentId="e" activityId="a" langue="fr"/>);fireEvent.click(await screen.findByRole('button',{name:'Ignorer les rappels pour aujourd’hui'}));await screen.findByRole('alert');expect(screen.queryByText(/L’activité n’est pas comptée comme réalisée/)).toBeNull();});
it('retrouve le choix confirmé après réouverture en anglais',async()=>{mocks.read.mockResolvedValue({data:[{activity_id:'a'}],error:null});render(<IgnorerRappelHabitude enrollmentId="e" activityId="a" langue="en"/>);await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Reminders skipped for today'));expect(mocks.rpc).not.toHaveBeenCalled();});
