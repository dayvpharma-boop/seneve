import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001';
const activites=[['bible_matin','Bible du matin','06:20'],['lecture_pro','Lecture professionnelle','12:30'],['predication','Prédication','18:00'],['lecture_personnelle','Développement personnel','20:00'],['bible_soir','Bible du soir','20:35'],['exercice','Exercice','06:45']].map(([habit_key,consigne,heure],i)=>({habit_key,consigne:consigne!,heure:heure!,critere:null,occurrence:{occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:true}}));
beforeEach(()=>{sessionStorage.clear();mocks.charger.mockReset();mocks.rpc.mockReset();mocks.charger.mockResolvedValue({userId:uid,jour:2,activites});});
afterEach(cleanup);
function ouvrir(langue='fr'){return render(<ActivitesJourRecette enrollmentId={eid} participantId="P1" dateLocale="2026-10-27" langue={langue}/>);}
it.each(['fr','en'])('regroupe les cinq lectures en %s sans déclaration automatique, puis ferme par Échap',async(langue)=>{
 ouvrir(langue);const titre=langue==='en'?'Today’s readings':'Lectures du jour';
 const bouton=await screen.findByRole('button',{name:titre});bouton.focus();fireEvent.click(bouton);
 const d=screen.getByRole('dialog',{name:titre});
 expect(within(d).getAllByRole('article')).toHaveLength(5);expect(within(d).queryByRole('article',{name:'Exercice'})).toBeNull();
 expect(within(d).getAllByText(langue==='en'?'Goal: 30 minutes a day':'Objectif : 30 minutes par jour')).toHaveLength(3);
 expect(within(d).getByText(langue==='en'?'0 of 5 completed':'0 sur 5 réalisées')).toBeInTheDocument();
 expect(within(d).getAllByRole('link')).toHaveLength(2);expect(mocks.rpc).not.toHaveBeenCalled();
 fireEvent(d,new Event('cancel',{bubbles:false,cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull();expect(bouton).toHaveFocus();
});
it('une déclaration partielle ne réalise pas les autres lectures et reste visible dans la journée',async()=>{
 mocks.rpc.mockImplementation((_n,p)=>Promise.resolve({data:{event_id:p.p_client_event_id,etat:'partielle',aide_demandee:false,repetition:false},error:null}));
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Lectures du jour'}));const d=screen.getByRole('dialog');
 const carte=within(d).getByRole('article',{name:'Prédication'});fireEvent.click(within(carte).getByRole('button',{name:'Autres choix'}));fireEvent.click(within(carte).getByRole('button',{name:'Je l’ai réalisée en partie'}));
 await within(carte).findByText('En partie');expect(mocks.rpc).toHaveBeenCalledTimes(1);expect(mocks.rpc.mock.calls[0]![1].p_activity_id).toBe(activites[2]!.occurrence.occurrence_id);
 expect(within(d).getByText('0 sur 5 réalisées')).toBeInTheDocument();fireEvent.click(within(d).getByRole('button',{name:'Revenir à ma journée'}));
 expect(within(screen.getByRole('article',{name:'Prédication'})).getByRole('status')).toHaveTextContent('Réalisée en partie');expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');
});
it('une réalisation met à jour le compteur des lectures et la journée, et réouvrir ne la répète pas',async()=>{
 mocks.rpc.mockImplementation((_n,p)=>Promise.resolve({data:{event_id:p.p_client_event_id,etat:'realisee',aide_demandee:false,repetition:false},error:null}));
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Lectures du jour'}));let d=screen.getByRole('dialog');
 fireEvent.click(within(within(d).getByRole('article',{name:'Lecture professionnelle'})).getByRole('button',{name:'J’ai réalisé cette activité'}));
 await within(d).findByText('1 sur 5 réalisées');fireEvent.click(within(d).getByRole('button',{name:'Revenir à ma journée'}));expect(screen.getByRole('progressbar')).toHaveAttribute('value','1');
 fireEvent.click(screen.getByRole('button',{name:'Lectures du jour'}));d=screen.getByRole('dialog');expect(within(d).getByText('1 sur 5 réalisées')).toBeInTheDocument();expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
it('ne propose pas une lecture inventée depuis son seul libellé',async()=>{
 mocks.charger.mockResolvedValue({userId:uid,jour:2,activites:[{...activites[0],habit_key:undefined}]});ouvrir();await screen.findByRole('heading',{name:'Bible du matin'});expect(screen.queryByRole('button',{name:'Lectures du jour'})).toBeNull();
});
