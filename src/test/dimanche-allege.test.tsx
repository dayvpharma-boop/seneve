import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';

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

it('« Mes habitudes » est placé juste avant « Suivre mes défis facultatifs » (demande du 08/11/2026)',async()=>{
 mocks.charger.mockResolvedValue(jour(LUNDI,false));
 render(<MemoryRouter><ActivitesJourRecette enrollmentId={E} participantId="P1" dateLocale={LUNDI} langue="fr" fuseau={F} avantDefis={<nav aria-label="Mes habitudes">raccourcis</nav>}/></MemoryRouter>);
 const nav=await screen.findByRole('navigation',{name:'Mes habitudes'});
 const suivi=await screen.findByRole('region',{name:'Suivi de mes défis facultatifs'});
 expect(nav.compareDocumentPosition(suivi)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(nav.compareDocumentPosition(screen.getByRole('region',{name:'Ma journée'}))&Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
});

it('en semaine : le premier groupe de trois reste visible tant qu’il n’est pas fini, les suivantes se déplient',async()=>{
 const source=jour(LUNDI,false);
 const creer=(n:number,habit_key:string,consigne:string,heure:string)=>({...source.activites[0]!,habit_key,consigne,heure,occurrence:{...source.activites[0]!.occurrence,occurrence_id:id(n)}});
 const derniere={...source.activites[3]!,etat:{...source.activites[3]!.occurrence,etat:'realisee',synchronisation:'synchronise',aide_demandee:false}};
 mocks.charger.mockResolvedValue({...source,activites:[...source.activites.slice(0,3),derniere,creer(5,'lecture_personnelle','Lecture personnelle','20:00'),creer(6,'gratitude_soir','Gratitude du soir','21:10')]});
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 const trois=journee.querySelector('.ios-liste')!;
 expect(trois.children).toHaveLength(3);
 expect(trois.textContent).toMatch(/Gratitude du matin/);
 expect(trois.textContent).not.toMatch(/Prière du soir/);
 const volet=journee.querySelector('details.hd-autres-activites') as HTMLDetailsElement;
 expect(volet).not.toBeNull();
 expect(volet.open).toBe(false);
 expect(volet.querySelector('summary')!.textContent).toMatch(/Voir les 3 activités suivantes/);
 expect(journee.querySelector('details.hd-activites-faites')).toBeNull();
 expect(volet.querySelector('summary')!.textContent).toMatch(/1 \/ 3 réalisées et synchronisées/);
 fireEvent.click(volet.querySelector('summary')!);
 expect(volet.open).toBe(true);
 expect(within(volet).getByRole('heading',{name:'Prière du soir'})).toBeInTheDocument();
 fireEvent.click(volet.querySelector('summary')!);
 expect(volet.open).toBe(false);
});

// Groupes de trois (demande du 12/11/2026).
const fait=(a:ReturnType<typeof jour>['activites'][number])=>({...a,etat:{...a.occurrence,etat:'realisee',synchronisation:'synchronise',aide_demandee:false}});
it('les trois premières faites se replient dans « Déjà faites » et le groupe suivant apparaît',async()=>{
 const source=jour(LUNDI,false);
 mocks.charger.mockResolvedValue({...source,activites:source.activites.map((a,i)=>i<3?fait(a):a)});
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 const liste=journee.querySelector('.ios-liste')!;
 expect(liste.children).toHaveLength(1);
 expect(liste.textContent).toMatch(/Prière du soir/);
 expect(liste.textContent).not.toMatch(/Gratitude du matin/);
 const faites=journee.querySelector('details.hd-activites-faites') as HTMLDetailsElement;
 expect(faites.open).toBe(false);
 expect(faites.querySelector('summary')!.textContent).toMatch(/Déjà faites · 3/);
 fireEvent.click(faites.querySelector('summary')!);
 expect(within(faites).getByRole('heading',{name:'Gratitude du matin'})).toBeInTheDocument();
});

it('une seule activité faite ne replie pas le groupe : les trois restent ouvertes',async()=>{
 const source=jour(LUNDI,false);
 mocks.charger.mockResolvedValue({...source,activites:source.activites.map((a,i)=>i===0?fait(a):a)});
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 const liste=journee.querySelector('.ios-liste')!;
 expect(liste.children).toHaveLength(3);
 expect(liste.textContent).toMatch(/Gratitude du matin/);
 expect(journee.querySelector('details.hd-activites-faites')).toBeNull();
});

it('quand tout est fait : « Ta journée est complète », tout est replié dans « Déjà faites »',async()=>{
 const source=jour(LUNDI,false);
 mocks.charger.mockResolvedValue({...source,activites:source.activites.map(fait)});
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 expect(within(journee).getByText('Ta journée est complète.')).toBeInTheDocument();
 expect(journee.querySelector('details.hd-activites-faites summary')!.textContent).toMatch(/Déjà faites · 4/);
});

it('le bouton Commencer ouvre une activité rangée parmi les suivantes',async()=>{
 const source=jour(LUNDI,false);
 const creer=(n:number,habit_key:string,consigne:string,heure:string)=>({...source.activites[0]!,habit_key,consigne,heure,occurrence:{...source.activites[0]!.occurrence,occurrence_id:id(n)}});
 // Le groupe en cours (3 premières) a une activité « en partie » ; les suivantes commencent à 20 h.
 const activites=[...source.activites.slice(0,3).map((a,i)=>i<2?fait(a):{...a,etat:{...a.occurrence,etat:'partielle',synchronisation:'synchronise',aide_demandee:false}}),source.activites[3]!,creer(5,'lecture_personnelle','Lecture personnelle','20:00')];
 mocks.charger.mockResolvedValue({...source,activites});
 const vue=afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 const volet=journee.querySelector('details.hd-autres-activites:not(.hd-activites-faites)') as HTMLDetailsElement;
 expect(volet.open).toBe(false);
 fireEvent.click(vue.container.querySelector('.ios-jour-bouton')!);
 expect(volet.open).toBe(true);
});

it('la palette pastel cible uniquement Aujourd’hui Habitudes & Défis, avec variante sombre',async()=>{
 mocks.charger.mockResolvedValue(jour(LUNDI,false));
 afficher(LUNDI);
 const journee=await screen.findByRole('region',{name:'Ma journée'});
 expect(journee.closest('.hd-aujourdhui-pastel')).not.toBeNull();
 expect(journee.closest('.hd-aujourdhui-pastel')!.querySelector('.hd-reflexion-jour')).not.toBeNull();
 const css=readFileSync(`${process.cwd()}/src/styles-habitudes-aujourdhui-pastel.css`,'utf8');
 expect(css).toContain(':has(.hd-aujourdhui-pastel)');
 expect(css).toContain('.hd-aujourdhui-pastel .ios-carte.ios-priere');
 expect(css).toContain('.hd-aujourdhui-pastel .hd-autres-activites');
 expect(css).toContain('[data-apparence="sombre"]');
 expect(css).toContain('prefers-color-scheme:dark');
});
