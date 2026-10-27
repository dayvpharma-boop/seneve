import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({charger:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:mock.charger}));
import {CultesSemaineHabitudes,rendezVousCultes} from '@/components/CultesSemaineHabitudes';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
const version={module_id:'HD',version:1,langue:'fr'};
const config:ConfigurationHoraires={enrollment_id:'E1',fuseau:'Africa/Kinshasa',date_locale:'2026-10-27',modifications_a_partir_du:'2026-10-28',revisions:[],horaires:[],modeles:[{...version,habit_key:'culte_semaine',libelle:'Culte',heure_proposee:'18:30',jours_iso:[3,5]},{...version,habit_key:'culte_dimanche',libelle:'Culte du dimanche',heure_proposee:'09:00',jours_iso:[7]}]};
const props={enrollmentId:'E1',participantId:'P1',dateLocale:'2026-10-27',langue:'fr'};
beforeEach(()=>{mock.charger.mockReset().mockResolvedValue(config);});afterEach(cleanup);
it('présente les trois propositions dans les sept prochains jours civils',()=>{
 expect(rendezVousCultes(config,'P1','2026-10-27').map(r=>[r.date,r.heure_locale,r.origine])).toEqual([['2026-10-28','18:30','proposition'],['2026-10-30','18:30','proposition'],['2026-11-01','09:00','proposition']]);
});
it('applique les créneaux personnels à leur date effective sans réintroduire les propositions',()=>{
 const c={...config,horaires:[{...version,participant_id:'P1',habit_key:'culte_semaine',creneau_id:'personnel',heure_locale:'19:00',jours_iso:[4,6],fuseau:config.fuseau,valide_du:'2026-10-28',valide_au:null}]};
 expect(rendezVousCultes(c,'P1',config.date_locale).map(r=>[r.date,r.heure_locale])).toEqual([['2026-10-29','19:00'],['2026-10-31','19:00'],['2026-11-01','09:00']]);expect(()=>rendezVousCultes(config,'P1','2026-10-28')).toThrow();
});
it('charge uniquement à l’ouverture et ne propose aucune déclaration de participation',async()=>{
 render(<CultesSemaineHabitudes {...props}/>);expect(mock.charger).not.toHaveBeenCalled();const d=screen.getByText('Mes rendez-vous de culte').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));await screen.findByText(/Les 7 prochains jours/);expect(screen.getAllByText('Horaire proposé · Prévu')).toHaveLength(3);expect(screen.queryByRole('button',{name:/réalisé|participé/i})).toBeNull();expect(screen.getByText(/ne sont pas des participations enregistrées/)).toBeVisible();
});
it('permet de réessayer un chargement impossible et retire les horaires au changement de compte',async()=>{
 mock.charger.mockRejectedValueOnce(Error('offline'));const vue=render(<CultesSemaineHabitudes {...props}/>);const d=screen.getByText('Mes rendez-vous de culte').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Réessayer les rendez-vous'}));await screen.findByText(/Les 7 prochains jours/);mock.charger.mockReturnValue(new Promise(()=>{}));vue.rerender(<CultesSemaineHabitudes {...props} participantId="P2"/>);expect(screen.queryByText(/Les 7 prochains jours/)).toBeNull();await waitFor(()=>expect(screen.getByRole('status')).toBeVisible());
});
