import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn(),historique:vi.fn(),enregistrer:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:mock.charger}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerHistoriqueRecette:mock.historique}));
vi.mock('@/lib/habitudes-api',()=>({enregistrerHabitude:mock.enregistrer}));
vi.mock('@/lib/supabase',()=>({supabase:{rpc:mock.rpc}}));
import {CultesSemaineHabitudes,rendezVousCultes,semaineCultes} from '@/components/CultesSemaineHabitudes';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import type {JourRecette} from '@/lib/habitudes-jour-recette';
const version={module_id:'HD',version:1,langue:'fr'};
const config:ConfigurationHoraires={enrollment_id:'E1',fuseau:'Africa/Kinshasa',date_locale:'2026-10-27',modifications_a_partir_du:'2026-10-28',revisions:[],horaires:[],modeles:[{...version,habit_key:'culte_semaine',libelle:'Culte',heure_proposee:'18:30',jours_iso:[3,5]},{...version,habit_key:'culte_dimanche',libelle:'Culte du dimanche',heure_proposee:'09:00',jours_iso:[7]}]};
const props={enrollmentId:'E1',participantId:'P1',dateLocale:'2026-10-27',langue:'fr'};
// Mardi 27/10 : le culte du dimanche 25/10 appartient à la semaine précédente ; mercredi, vendredi et dimanche sont à venir.
const occ=(id:string,date:string)=>({occurrence_id:id,enrollment_id:'11111111-1111-4111-8111-111111111111',version:1,date_locale:date,requise:false});
const jours:JourRecette[]=[
 {userId:'55555555-5555-4555-8555-555555555555',date:'2026-10-25',jour:11,activites:[{habit_key:'culte_dimanche',occurrence:occ('22222222-2222-4222-8222-222222222222','2026-10-25'),consigne:'Culte du dimanche',critere:null,heure:'09:00'}]},
 {userId:'55555555-5555-4555-8555-555555555555',date:'2026-10-27',jour:13,activites:[{habit_key:'priere_matin',occurrence:occ('33333333-3333-4333-8333-333333333333','2026-10-27'),consigne:'Prière du matin',critere:null,heure:'06:00'}]},
];
const configMercredi={...config,date_locale:'2026-10-28'};
const joursMercredi:JourRecette[]=[...jours,{userId:'55555555-5555-4555-8555-555555555555',date:'2026-10-28',jour:14,activites:[{habit_key:'culte_semaine',occurrence:occ('44444444-4444-4444-8444-444444444444','2026-10-28'),consigne:'Culte',critere:null,heure:'18:30'}]}];
beforeEach(()=>{mock.charger.mockReset().mockResolvedValue(config);mock.historique.mockReset().mockResolvedValue(jours);mock.enregistrer.mockReset();});afterEach(cleanup);

function Journal(){const s=useLocation().state as {citationBiblique?:string}|null;return <p>Journal ouvert : {s?.citationBiblique}</p>;}
function afficher(p=props){return render(<MemoryRouter initialEntries={['/habitudes/aujourdhui']}><Routes><Route path="/habitudes/aujourdhui" element={<CultesSemaineHabitudes {...p}/>}/><Route path="/journal" element={<Journal/>}/></Routes></MemoryRouter>);}
async function ouvrir(){const d=screen.getByText('Mes cultes de la semaine').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));await screen.findByText(/Objectif : 3 participations/);}

it('présente les trois propositions dans les sept prochains jours civils',()=>{
 expect(rendezVousCultes(config,'P1','2026-10-27').map(r=>[r.date,r.heure_locale,r.origine])).toEqual([['2026-10-28','18:30','proposition'],['2026-10-30','18:30','proposition'],['2026-11-01','09:00','proposition']]);
});
it('applique les créneaux personnels à leur date effective sans réintroduire les propositions',()=>{
 const c={...config,horaires:[{...version,participant_id:'P1',habit_key:'culte_semaine',creneau_id:'personnel',heure_locale:'19:00',jours_iso:[4,6],fuseau:config.fuseau,valide_du:'2026-10-28',valide_au:null}]};
 expect(rendezVousCultes(c,'P1',config.date_locale).map(r=>[r.date,r.heure_locale])).toEqual([['2026-10-29','19:00'],['2026-10-31','19:00'],['2026-11-01','09:00']]);expect(()=>rendezVousCultes(config,'P1','2026-10-28')).toThrow();
});
it('limite la semaine du lundi au dimanche : jours ouverts déclarables, jours suivants à venir',()=>{
 const s=semaineCultes(configMercredi,joursMercredi,'P1','2026-10-28');
 expect([s.lundi,s.dimanche]).toEqual(['2026-10-26','2026-11-01']);
 expect(s.cultes.map(c=>[c.date,c.heure,c.futur,!!c.activite])).toEqual([['2026-10-28','18:30',false,true],['2026-10-30','18:30',true,false],['2026-11-01','09:00',true,false]]);
});
it('charge uniquement à l’ouverture et ne propose aucune déclaration pour un culte à venir',async()=>{
 afficher();expect(mock.charger).not.toHaveBeenCalled();await ouvrir();
 expect(screen.getAllByText('À venir')).toHaveLength(3);expect(screen.getByText('0 participation sur 3')).toBeVisible();
 expect(screen.queryByRole('button',{name:/J’y ai participé/})).toBeNull();expect(screen.queryByRole('button',{name:/Je n’ai pas pu/})).toBeNull();
});
it('déclare « J’y ai participé » par l’enregistrement habituel et compte la participation',async()=>{
 mock.charger.mockResolvedValue(configMercredi);mock.historique.mockResolvedValue(joursMercredi);
 mock.enregistrer.mockImplementation(async(_t,o)=>({etat:{occurrence_id:o.occurrence_id,enrollment_id:o.enrollment_id,version:1,date_locale:o.date_locale,etat:'realisee',aide_demandee:false,synchronisation:'synchronise'}}));
 const onConfirme=vi.fn();render(<MemoryRouter><CultesSemaineHabitudes {...props} dateLocale="2026-10-28" onConfirme={onConfirme}/></MemoryRouter>);await ouvrir();
 expect(screen.getByText('Aujourd’hui')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'J’y ai participé'}));
 await screen.findByText('Participation déclarée · Synchronisée');
 expect(mock.enregistrer).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({occurrence_id:'44444444-4444-4444-8444-444444444444'}),expect.any(String),'realisee');
 expect(screen.getByText('1 participation sur 3')).toBeVisible();expect(screen.getByText('Fait')).toBeVisible();expect(onConfirme).toHaveBeenCalledOnce();
});
it('« Je n’ai pas pu » sans raison ni mot : rien n’est envoyé, le culte est seulement marqué signalé',async()=>{
 mock.charger.mockResolvedValue(configMercredi);mock.historique.mockResolvedValue(joursMercredi);afficher({...props,dateLocale:'2026-10-28'});await ouvrir();
 fireEvent.click(screen.getByRole('button',{name:'Je n’ai pas pu'}));expect(screen.getByRole('dialog',{name:'Merci de le signaler'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer en paix'}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByText('Signalé')).toBeVisible();expect(screen.queryByText(/Journal ouvert/)).toBeNull();
 expect(mock.enregistrer).not.toHaveBeenCalled();expect(mock.rpc).not.toHaveBeenCalled();
});
it('« Je n’ai pas pu » avec une raison et un mot ouvre le journal privé avec ce brouillon, sans rien envoyer',async()=>{
 mock.charger.mockResolvedValue(configMercredi);mock.historique.mockResolvedValue(joursMercredi);afficher({...props,dateLocale:'2026-10-28'});await ouvrir();
 fireEvent.click(screen.getByRole('button',{name:'Je n’ai pas pu'}));fireEvent.click(screen.getByRole('button',{name:'Travail'}));
 expect(screen.getByRole('button',{name:'Travail'})).toHaveAttribute('aria-pressed','true');
 fireEvent.change(screen.getByLabelText('Un mot pour ton journal privé (facultatif)'),{target:{value:'Prière à la maison'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer en paix'}));
 expect(await screen.findByText(/Journal ouvert : Culte du mercredi 28 octobre · 18:30 : je n’ai pas pu y participer\. Raison : Travail\./)).toBeVisible();
 expect(screen.getByText(/Prière à la maison/)).toBeVisible();expect(mock.enregistrer).not.toHaveBeenCalled();expect(mock.rpc).not.toHaveBeenCalled();
});
it('permet de réessayer un chargement impossible et retire la semaine au changement de compte',async()=>{
 mock.historique.mockRejectedValueOnce(Error('offline'));const vue=afficher();const d=screen.getByText('Mes cultes de la semaine').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));
 await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));await screen.findByText(/Objectif : 3 participations/);
 mock.charger.mockReturnValue(new Promise(()=>{}));vue.rerender(<MemoryRouter initialEntries={['/habitudes/aujourdhui']}><Routes><Route path="/habitudes/aujourdhui" element={<CultesSemaineHabitudes {...props} participantId="P2"/>}/></Routes></MemoryRouter>);
 expect(screen.queryByText(/Objectif : 3 participations/)).toBeNull();await waitFor(()=>expect(screen.getByRole('status')).toBeVisible());
});
