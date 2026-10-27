import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001';
beforeEach(()=>{sessionStorage.clear();mocks.charger.mockReset();mocks.rpc.mockReset();vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-27T04:00:00Z'));});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it.each([['fr',false],['fr',true],['en',false],['en',true]] as const)('accès gratitude %s, soir réalisé=%s : écrire ne déclare rien',async(langue,fait)=>{
 const activites=[['gratitude_matin','Gratitude du matin','05:50'],['exercice','Exercice','06:45'],['lecture_pro','Lecture professionnelle','12:30'],['predication','Prédication','18:00'],['gratitude_soir','Gratitude du soir','21:00'],['autre','Gratitude libre','21:15']].map(([habit_key,consigne,heure],i)=>{
  const occurrence={occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:true};
  return {habit_key,consigne:consigne!,heure:heure!,critere:null,occurrence,...(fait&&habit_key==='gratitude_soir'?{etat:{...occurrence,etat:'realisee',aide_demandee:false,synchronisation:'synchronise'}}:{})};
 });
 mocks.charger.mockResolvedValue({userId:uid,jour:2,date:'2026-10-27',activites});
 render(<ActivitesJourRecette enrollmentId={eid} participantId="P1" dateLocale="2026-10-27" langue={langue}/>);
 const noms=langue==='en'?['Write my morning gratitude','Write my evening gratitude']:['Écrire ma gratitude du matin','Écrire ma gratitude du soir'];
 await screen.findByRole('link',{name:noms[0]});
 for(const [i,moment] of ['matin','soir'].entries()){
  const lien=within(screen.getByRole('article',{name:`Gratitude du ${moment}`})).getByRole('link',{name:noms[i]});
  const url=new URL(lien.getAttribute('href')!,'https://exemple.invalid');
  expect(url.pathname).toMatch(/\/journal$/);expect(url.searchParams.get('depuis')).toBe('habitudes');expect(url.searchParams.get('gratitude')).toBe(moment);expect(url.searchParams.get('lang')).toBe(langue);expect(url.searchParams.get('ecrire')).toBe('1');
  expect(lien.getAttribute('href')).not.toContain(uid);expect(lien.getAttribute('href')).not.toContain(eid);
  lien.addEventListener('click',e=>e.preventDefault());fireEvent.click(lien);
 }
 expect(screen.getByRole('progressbar')).toHaveAttribute('value',fait?'1':'0');expect(mocks.rpc).not.toHaveBeenCalled();
 expect(screen.getAllByRole('link',{name:/Écrire ma gratitude|Write my .* gratitude/})).toHaveLength(2);
 expect(within(screen.getByRole('article',{name:'Gratitude libre'})).queryByRole('link')).toBeNull();
});
