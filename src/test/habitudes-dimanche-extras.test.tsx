import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
const mock=vi.hoisted(()=>({historique:vi.fn()}));
vi.mock('@/lib/habitudes-jour-recette',()=>({chargerHistoriqueRecette:mock.historique}));
import {DimancheHabitudes} from '@/components/DimancheHabitudes';
import {resumeSemaine} from '@/lib/habitudes-resume-semaine';
import type {JourRecette} from '@/lib/habitudes-jour-recette';

const E='10000000-0000-4000-8000-000000000002',P='10000000-0000-4000-8000-000000000003';
function act_(date:string,habit_key:string,fait:boolean,requise=true){
 const occurrence={occurrence_id:`${date}-${habit_key}`,enrollment_id:E,version:1,date_locale:date,requise};
 return {habit_key,occurrence,consigne:habit_key,critere:null,heure:'06:00',etat:fait?{...occurrence,etat:'realisee' as const,aide_demandee:false,synchronisation:'synchronise' as const}:undefined};
}
const jour=(date:string,activites:ReturnType<typeof act_>[]):JourRecette=>({userId:'u',date,jour:1,activites});
// Semaine du lundi 2 au dimanche 8 novembre 2026, plus un jour de la semaine précédente (ignoré).
const historique=[
 jour('2026-11-01',[act_('2026-11-01','reveil',true)]),
 jour('2026-11-02',[act_('2026-11-02','reveil',true),act_('2026-11-02','priere_matin',true)]),
 jour('2026-11-04',[act_('2026-11-04','reveil',true),act_('2026-11-04','priere_matin',false),act_('2026-11-04','culte_semaine',true),act_('2026-11-04','dime',true)]),
 jour('2026-11-08',[act_('2026-11-08','priere_matin',true),act_('2026-11-08','exercice',false,false),act_('2026-11-08','culte_dimanche',true)]),
];
beforeEach(()=>{mock.historique.mockReset();localStorage.clear();});afterEach(cleanup);

it('résume la semaine du lundi au dimanche sans compter les activités facultatives',()=>{
 expect(resumeSemaine(historique,'2026-11-08')).toEqual({jours:3,faites:7,requises:8,journeesCompletes:2,cultes:2,dime:true});
});
function Lieu(){const l=useLocation();return <p data-testid="lieu">{l.pathname+l.search}|{String((l.state as {citationBiblique?:string}|null)?.citationBiblique??'')}</p>;}
function afficher(){return render(<MemoryRouter initialEntries={['/espace']}><Routes><Route path="/espace" element={<DimancheHabitudes enrollmentId={E} participantId={P} dateLocale="2026-11-08" langue="fr"/>}/><Route path="/journal" element={<Lieu/>}/></Routes></MemoryRouter>);}
it('ouvre le journal privé avec un début de phrase pour le culte',()=>{
 afficher();fireEvent.click(screen.getByRole('button',{name:'Écrire dans mon journal'}));
 expect(screen.getByTestId('lieu')).toHaveTextContent('/journal?ecrire=1|Ce que je retiens du culte — dimanche 8 novembre :');
});
it('garde « Temps en famille » sur l’appareil, pour ce dimanche seulement',()=>{
 const r=afficher();const c=screen.getByRole('checkbox',{name:'J’ai pris du temps avec ma famille'});
 expect(c).not.toBeChecked();fireEvent.click(c);expect(c).toBeChecked();r.unmount();
 afficher();expect(screen.getByRole('checkbox',{name:'J’ai pris du temps avec ma famille'})).toBeChecked();
 expect(localStorage.getItem(`seneve:hd:famille:v1:${P}:2026-11-08`)).toBe('1');
});
it('charge le résumé seulement à l’ouverture du volet',async()=>{
 mock.historique.mockResolvedValue(historique);const r=afficher();expect(mock.historique).not.toHaveBeenCalled();
 const d=r.container.querySelector('details')!;act(()=>{d.open=true;d.dispatchEvent(new Event('toggle'));});
 expect(await screen.findByText('7 activités faites sur 8')).toBeInTheDocument();
 expect(screen.getByText('2 journées complètes sur 3')).toBeInTheDocument();expect(screen.getByText('2 cultes cette semaine')).toBeInTheDocument();expect(screen.getByText('Dîme donnée cette semaine')).toBeInTheDocument();
 expect(mock.historique).toHaveBeenCalledWith(E,P,'2026-11-08');
});
