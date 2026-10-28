import {webcrypto} from 'node:crypto';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({charger:vi.fn(),download:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:m.charger}));
vi.mock('@/lib/habitudes-calendrier-export',async orig=>({...await orig<typeof import('@/lib/habitudes-calendrier-export')>(),telechargerCalendrierHabitudes:m.download}));
import {ExportCalendrierHabitudes} from '@/components/ExportCalendrierHabitudes';
const props={enrollmentId:'E1',participantId:'P1',dateLocale:'2026-10-28',langue:'fr'};
const config={enrollment_id:'E1',fuseau:'Africa/Kinshasa',date_locale:'2026-10-28',modifications_a_partir_du:'2026-10-29',revisions:[],horaires:[],modeles:[{module_id:'HD',version:1,langue:'fr',habit_key:'priere_matin',libelle:'Prière du matin',heure_proposee:'07:30',jours_iso:[1,2,3,4,5,6,7]}]};
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-28T05:00:00Z'));vi.stubGlobal('crypto',webcrypto);m.charger.mockReset().mockResolvedValue(config);m.download.mockReset();});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
function ouvrir(){const d=screen.getByText('Ajouter mes rappels au calendrier').closest('details')!;d.open=true;fireEvent(d,new Event('toggle'));}
it('ne charge rien avant ouverture, prépare un fichier et ne confirme pas une importation',async()=>{
 render(<ExportCalendrierHabitudes {...props}/>);expect(m.charger).not.toHaveBeenCalled();ouvrir();
 await screen.findByLabelText('Prière du matin');fireEvent.click(screen.getByRole('button',{name:'Exporter les 7 prochains jours (.ics)'}));
 await screen.findByText(/Fichier généré/);expect(m.download).toHaveBeenCalledOnce();expect(m.download.mock.calls[0]![0]).toContain('SUMMARY:SÉNEVÉ — Prière du matin');
 expect(m.charger).toHaveBeenCalledWith('E1');expect(screen.getByText(/Les changements d’horaires/)).toBeInTheDocument();
});
it('permet de choisir les rendez-vous et bloque une sélection vide',async()=>{
 render(<ExportCalendrierHabitudes {...props}/>);ouvrir();fireEvent.click(await screen.findByLabelText('Prière du matin'));
 expect(screen.getByRole('button',{name:'Exporter les 7 prochains jours (.ics)'})).toBeDisabled();expect(m.download).not.toHaveBeenCalled();
});
it('propose une reprise après erreur et retire le planning de l’ancien compte',async()=>{
 m.charger.mockRejectedValueOnce(Error('réseau'));const v=render(<ExportCalendrierHabitudes {...props}/>);ouvrir();await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Actualiser les horaires pour l’export'}));await screen.findByLabelText('Prière du matin');
 m.charger.mockReturnValue(new Promise(()=>{}));v.rerender(<ExportCalendrierHabitudes {...props} enrollmentId="E2" participantId="P2"/>);
 expect(screen.queryByLabelText('Prière du matin')).toBeNull();expect(screen.getByRole('status')).toHaveTextContent('Chargement');
});
