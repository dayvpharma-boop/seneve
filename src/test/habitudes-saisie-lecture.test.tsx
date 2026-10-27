import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {SaisieLectureHabitudes} from '@/components/SaisieLectureHabitudes';
const uid='10000000-0000-4000-8000-000000000001',o={enrollment_id:'20000000-0000-4000-8000-000000000001',occurrence_id:'30000000-0000-4000-8000-000000000001',date_locale:'2026-10-27',version:1,requise:true};
const activite={habit_key:'lecture_pro',occurrence:o,consigne:'Lecture professionnelle',critere:null,heure:'12:30'};
beforeEach(()=>sessionStorage.clear());afterEach(cleanup);
it('choisir ou fermer ne déclare rien ; aucun choix de durée implicite',()=>{
 const rpc=vi.fn(),onConfirme=vi.fn(),onFermer=vi.fn();render(<SaisieLectureHabitudes activite={activite} userId={uid} langue="fr" transport={{rpc}} onConfirme={onConfirme} onFermer={onFermer}/>);
 expect(screen.getByRole('button',{name:'Fait'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'20 min'}));fireEvent.click(screen.getByRole('button',{name:'Fermer la saisie de durée'}));expect(onFermer).toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();expect(onConfirme).not.toHaveBeenCalled();
});
it('échec réseau puis reprise : mêmes identifiant, durée et titre ; une seule confirmation',async()=>{
 const rpc=vi.fn().mockResolvedValueOnce({data:null,error:'réseau'}).mockImplementation((_n,p)=>Promise.resolve({data:{event_id:p.p_client_event_id,etat:p.p_etat,aide_demandee:false,repetition:true,reading:{activity_id:p.p_activity_id,minutes:Number(p.p_minutes),titre:p.p_titre}},error:null})),onConfirme=vi.fn(),onFermer=vi.fn();
 const afficher=()=>render(<SaisieLectureHabitudes activite={activite} userId={uid} langue="fr" transport={{rpc}} onConfirme={onConfirme} onFermer={onFermer}/>);afficher();
 fireEvent.click(screen.getByRole('button',{name:'Autre'}));fireEvent.change(screen.getByRole('spinbutton'),{target:{value:'45'}});fireEvent.change(screen.getByRole('textbox'),{target:{value:'Mon manuel'}});fireEvent.click(screen.getByRole('button',{name:'Fait'}));
 await screen.findByRole('alert');expect(onConfirme).not.toHaveBeenCalled();cleanup();afficher();expect(screen.getByRole('textbox')).toHaveValue('Mon manuel');expect(screen.getByRole('spinbutton')).toHaveValue(45);
 fireEvent.click(screen.getByRole('button',{name:'Réessayer la même déclaration'}));await waitFor(()=>expect(onConfirme).toHaveBeenCalledTimes(1));expect(rpc.mock.calls[0]![1]).toEqual(rpc.mock.calls[1]![1]);expect(onFermer).toHaveBeenCalledTimes(1);
});
it('bloque le double clic et ne confirme rien avant la réponse serveur',async()=>{
 let terminer!:(v:unknown)=>void;const rpc=vi.fn(()=>new Promise<any>(r=>{terminer=r;})),onConfirme=vi.fn();
 render(<SaisieLectureHabitudes activite={activite} userId={uid} langue="en" transport={{rpc}} onConfirme={onConfirme} onFermer={()=>{}}/>);
 fireEvent.click(screen.getByRole('button',{name:'30 min'}));const fait=screen.getByRole('button',{name:'Done'});fireEvent.click(fait);fireEvent.click(fait);expect(rpc).toHaveBeenCalledTimes(1);expect(onConfirme).not.toHaveBeenCalled();
 terminer({data:{event_id:crypto.randomUUID(),etat:'realisee',aide_demandee:false,repetition:false,reading:{activity_id:o.occurrence_id,minutes:30,titre:null}},error:null});await waitFor(()=>expect(onConfirme).toHaveBeenCalledTimes(1));
});
