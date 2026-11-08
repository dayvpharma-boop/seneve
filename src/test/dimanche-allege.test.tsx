import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';

/** Dimanche allégé (maquette validée par Dr Justin le 08/11/2026) : en haut seulement ce qui compte,
 * les habitudes facultatives rangées dans « Au repos aujourd'hui ». Les autres jours ne changent pas. */
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';

const U='10000000-0000-4000-8000-000000000001',E='20000000-0000-4000-8000-000000000001';
const F='Africa/Kinshasa',DIMANCHE='2026-11-08',LUNDI='2026-11-09';
const id=(n:number)=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const jour=(date:string,dimanche:boolean)=>({userId:U,date,jour:8,activites:[
 ['gratitude_matin','Gratitude du matin','05:50',true],
 ['exercice','Exercice','06:30',!dimanche],
 ['priere_midi','Prière de midi','12:00',!dimanche],
 ['priere_soir','Prière du soir','21:00',true],
].map(([k,c,h,r],i)=>({habit_key:k,occurrence:{occurrence_id:id(i+1),enrollment_id:E,version:1,date_locale:date,requise:r},consigne:c,critere:null,heure:h}))});

beforeEach(()=>{localStorage.clear();mocks.rpc.mockReset().mockResolvedValue({data:null,error:null});});
afterEach(()=>cleanup());
const afficher=(date:string)=>render(<MemoryRouter><ActivitesJourRecette enrollmentId={E} participantId="P1" dateLocale={date} langue="fr" fuseau={F}/></MemoryRouter>);

it('le dimanche : seules les habitudes qui comptent sont en haut, les autres sont « Au repos aujourd’hui »',async()=>{
 mocks.charger.mockResolvedValue(jour(DIMANCHE,true));
 afficher(DIMANCHE);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 expect(screen.getByRole('complementary',{name:'Dimanche, jour de repos'}).textContent).toMatch(/2 moments seulement aujourd’hui/);
 expect(within(journee).getByRole('heading',{name:'Ce qui compte aujourd’hui'})).toBeInTheDocument();
 // Les anneaux et le compteur ne comptent que ce qui compte le dimanche (2), pas les 4 habitudes.
 expect(within(journee).getByText(/0 \/ 2 réalisées/)).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'Ma progression'}).textContent).toMatch(/0 action sur 2|sur 2/);
 const volet=journee.querySelector('details.ios-repos-volet') as HTMLDetailsElement;
 expect(volet).not.toBeNull();expect(volet.open).toBe(false);
 expect(volet.querySelector('summary')!.textContent).toMatch(/Au repos aujourd’hui.*2/);
 const principale=journee.querySelector('.ios-liste')!;
 expect(principale.textContent).toMatch(/Gratitude du matin/);expect(principale.textContent).toMatch(/Prière du soir/);
 expect(principale.textContent).not.toMatch(/Exercice/);
 expect(volet.textContent).toMatch(/Exercice/);expect(volet.textContent).toMatch(/Prière de midi/);
 expect(volet.textContent).toMatch(/Rappel en pause/);
 fireEvent.click(volet.querySelector('summary')!);
 expect(volet.open).toBe(true);
});

it('un jour de semaine : rien ne change, pas de volet « Au repos »',async()=>{
 mocks.charger.mockResolvedValue(jour(LUNDI,false));
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 expect(within(journee).getByRole('heading',{name:'Ma journée'})).toBeInTheDocument();
 expect(journee.querySelector('details.ios-repos-volet')).toBeNull();
 expect(journee.querySelector('.ios-liste')!.textContent).toMatch(/Exercice/);
 expect(screen.queryByRole('complementary',{name:'Dimanche, jour de repos'})).toBeNull();
});
