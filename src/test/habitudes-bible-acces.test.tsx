import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001';
beforeEach(()=>{sessionStorage.clear();mocks.charger.mockReset();mocks.rpc.mockReset();vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-27T04:00:00Z'));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it.each([false,true])('propose les deux lectures sans valider ni perdre le lien quand le soir est réalisé=%s',async(fait)=>{
 const activites=[['bible_matin','Bible du matin','06:20'],['exercice','Exercice adapté','06:45'],['lecture_pro','Lecture professionnelle','12:30'],['predication','Prédication','18:00'],['bible_soir','Bible du soir','20:35']].map(([habit_key,consigne,heure],i)=>{
  const occurrence={occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:true};
  return {habit_key,consigne:consigne!,heure:heure!,critere:null,occurrence,...(fait&&habit_key==='bible_soir'?{etat:{...occurrence,etat:'realisee',aide_demandee:false,synchronisation:'synchronise'}}:{})};
 });
 mocks.charger.mockResolvedValue({userId:uid,jour:2,date:'2026-10-27',activites});
 render(<ActivitesJourRecette enrollmentId={eid} participantId="P1" dateLocale="2026-10-27" langue="fr"/>);
 const matin=await screen.findByRole('link',{name:'Lire la Bible du matin'}),soir=screen.getByRole('link',{name:'Lire la Bible du soir'});
 expect(within(screen.getByRole('article',{name:'Bible du matin'})).getByRole('link',{name:'Lire la Bible du matin'})).toBe(matin);
 expect(within(screen.getByRole('article',{name:'Bible du soir'})).getByRole('link',{name:'Lire la Bible du soir'})).toBe(soir);
 for(const [lien,moment] of [[matin,'matin'],[soir,'soir']] as const){const url=new URL(lien.getAttribute('href')!,'https://exemple.invalid');expect(url.pathname).toMatch(/\/bible\/livres$/);expect(url.searchParams.get('depuis')).toBe('habitudes');expect(url.searchParams.get('moment')).toBe(moment);expect(url.searchParams.get('lang')).toBe('fr');lien.addEventListener('click',e=>e.preventDefault());fireEvent.click(lien);}
 expect(screen.getByRole('progressbar')).toHaveAttribute('value',fait?'1':'0');expect(mocks.rpc).not.toHaveBeenCalled();
 expect(screen.getAllByRole('link',{name:/Lire la Bible/})).toHaveLength(2);
});
