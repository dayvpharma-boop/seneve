import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({charger:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerJourRecette:mocks.charger,chargerHistoriqueRecette:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mocks.rpc}}));
import {ActivitesJourRecette} from '@/components/ActivitesJourRecette';
import {LecturesJourHabitudes} from '@/components/LecturesJourHabitudes';
const uid='10000000-0000-4000-8000-000000000001',eid='20000000-0000-4000-8000-000000000001';
const activites=[['bible_matin','Bible du matin','06:20'],['lecture_pro','Lecture professionnelle','12:30'],['predication','Prédication','18:00'],['lecture_personnelle','Développement personnel','20:00'],['bible_soir','Bible du soir','20:35'],['exercice','Exercice','06:45']].map(([habit_key,consigne,heure],i)=>({habit_key,consigne:consigne!,heure:heure!,critere:null,occurrence:{occurrence_id:`30000000-0000-4000-8000-00000000000${i+1}`,enrollment_id:eid,version:1,date_locale:'2026-10-27',requise:true}}));
const sauvees:{activity_id:string;minutes:number;titre:string|null}[]=[];
beforeEach(()=>{sessionStorage.clear();sauvees.length=0;mocks.charger.mockReset();mocks.rpc.mockReset();mocks.charger.mockResolvedValue({userId:uid,jour:2,activites});mocks.rpc.mockImplementation((n,p)=>{
 if(n==='hd_reading_details')return Promise.resolve({data:[...sauvees],error:null});
 const reading={activity_id:p.p_activity_id,minutes:Number(p.p_minutes),titre:p.p_titre||null};sauvees.push(reading);
 return Promise.resolve({data:{event_id:p.p_client_event_id,etat:p.p_etat,aide_demandee:false,repetition:false,reading},error:null});
});});
const ecritures=()=>mocks.rpc.mock.calls.filter(c=>c[0]!=='hd_reading_details');
async function pretes(d:HTMLElement){await waitFor(()=>expect(within(d).getByRole('button',{name:'Saisir la durée — Lecture professionnelle'})).toBeEnabled());}
afterEach(cleanup);
function ouvrir(langue='fr'){return render(<ActivitesJourRecette enrollmentId={eid} participantId="P1" dateLocale="2026-10-27" langue={langue}/>);}
it.each(['fr','en'])('regroupe les cinq lectures en %s sans déclaration automatique, puis ferme par Échap',async(langue)=>{
 ouvrir(langue);const titre=langue==='en'?'Today’s readings':'Lectures du jour';
 const bouton=await screen.findByRole('button',{name:titre});bouton.focus();fireEvent.click(bouton);
 const d=screen.getByRole('dialog',{name:titre});
 expect(within(d).getAllByRole('article')).toHaveLength(5);expect(within(d).queryByRole('article',{name:'Exercice'})).toBeNull();
 expect(within(d).getAllByText(langue==='en'?'Goal: 30 minutes a day':'Objectif : 30 minutes par jour')).toHaveLength(3);
 expect(within(d).getByText(langue==='en'?'0 of 5 completed':'0 sur 5 réalisées')).toBeInTheDocument();
 expect(within(d).getAllByRole('link')).toHaveLength(2);await within(d).findAllByText(langue==='en'?'No time recorded':'Aucune durée déclarée');expect(ecritures()).toHaveLength(0);
 fireEvent(d,new Event('cancel',{bubbles:false,cancelable:true}));expect(screen.queryByRole('dialog')).toBeNull();expect(bouton).toHaveFocus();
});
it('une déclaration partielle ne réalise pas les autres lectures et reste visible dans la journée',async()=>{
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Lectures du jour'}));const d=screen.getByRole('dialog');
 await pretes(d);
 const carte=within(d).getByRole('article',{name:'Prédication'});fireEvent.click(within(carte).getByRole('button',{name:'Autres choix'}));fireEvent.click(within(carte).getByRole('button',{name:'Je l’ai réalisée en partie'}));
 const saisie=screen.getByRole('dialog',{name:'Combien de temps ?'});expect(ecritures()).toHaveLength(0);fireEvent.click(within(saisie).getByRole('button',{name:'20 min'}));fireEvent.click(within(saisie).getByRole('button',{name:'En partie'}));
 await within(carte).findByText('En partie');expect(ecritures()).toHaveLength(1);expect(ecritures()[0]![1].p_activity_id).toBe(activites[2]!.occurrence.occurrence_id);expect(within(d).getByText('20 min')).toBeInTheDocument();
 expect(within(d).getByText('0 sur 5 réalisées')).toBeInTheDocument();fireEvent.click(within(d).getByRole('button',{name:'Revenir à ma journée'}));
 expect(within(screen.getByRole('article',{name:'Prédication'})).getByRole('status')).toHaveTextContent('Réalisée en partie');expect(screen.getByRole('progressbar')).toHaveAttribute('value','0');
});
it('une réalisation met à jour le compteur des lectures et la journée, et réouvrir ne la répète pas',async()=>{
 ouvrir();fireEvent.click(await screen.findByRole('button',{name:'Lectures du jour'}));let d=screen.getByRole('dialog');
 await pretes(d);
 fireEvent.click(within(within(d).getByRole('article',{name:'Lecture professionnelle'})).getByRole('button',{name:'J’ai réalisé cette activité'}));
 const saisie=screen.getByRole('dialog',{name:'Combien de temps ?'});expect(ecritures()).toHaveLength(0);fireEvent.click(within(saisie).getByRole('button',{name:'30 min'}));fireEvent.click(within(saisie).getByRole('button',{name:'Fait'}));
 await within(d).findByText('1 sur 5 réalisées');fireEvent.click(within(d).getByRole('button',{name:'Revenir à ma journée'}));expect(screen.getByRole('progressbar')).toHaveAttribute('value','1');
 fireEvent.click(screen.getByRole('button',{name:'Lectures du jour'}));d=screen.getByRole('dialog');expect(within(d).getByText('1 sur 5 réalisées')).toBeInTheDocument();await within(d).findByText('30 min');expect(ecritures()).toHaveLength(1);
});
it('ne propose pas une lecture inventée depuis son seul libellé',async()=>{
 mocks.charger.mockResolvedValue({userId:uid,jour:2,activites:[{...activites[0],habit_key:undefined}]});ouvrir();await screen.findByRole('heading',{name:'Bible du matin'});expect(screen.queryByRole('button',{name:'Lectures du jour'})).toBeNull();
});
it('retire immédiatement les anciens titres quand le compte ou l’inscription change',async()=>{
 const transport={rpc:mocks.rpc};mocks.rpc.mockResolvedValueOnce({data:[{activity_id:activites[0]!.occurrence.occurrence_id,minutes:20,titre:'Titre du premier compte'}],error:null});
 const props={activites:activites.slice(0,5),userId:uid,langue:'fr',transport,onConfirme:vi.fn(),onFermer:vi.fn()};
 const vue=render(<LecturesJourHabitudes {...props}/>);await screen.findByText(/Titre du premier compte/);
 mocks.rpc.mockImplementation(()=>new Promise(()=>{}));
 vue.rerender(<LecturesJourHabitudes {...props} userId="10000000-0000-4000-8000-000000000002"/>);
 expect(screen.queryByText(/Titre du premier compte/)).toBeNull();expect(screen.getByText('Chargement des durées…')).toBeInTheDocument();
});
