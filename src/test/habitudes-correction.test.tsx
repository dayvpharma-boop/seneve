import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {DeclarationHabitude} from '@/components/DeclarationHabitude';
const o={enrollment_id:'10000000-0000-4000-8000-000000000002',occurrence_id:'20000000-0000-4000-8000-000000000001',version:1,date_locale:'2026-10-28',requise:true};
const etat={...o,etat:'realisee' as const,aide_demandee:false,synchronisation:'synchronise' as const};
const token='a'.repeat(32),onConfirme=vi.fn();
const rpc=vi.fn(async(_n:string,p:Record<string,string>):Promise<{data:unknown;error:unknown}>=>p.p_confirmation?{data:{event_id:p.p_client_event_id,etat:'non_commencee',aide_demandee:false,repetition:false},error:null}:{data:{confirmation:token},error:null});
const props={userId:'10000000-0000-4000-8000-000000000001',occurrence:o,consigne:'Lecture professionnelle',langue:'fr',lectureSeule:false,transport:{rpc},etat,onConfirme};
beforeEach(()=>{sessionStorage.clear();vi.clearAllMocks();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('prépare sans changer Fait, permet de renoncer, puis attend la confirmation serveur',async()=>{
 render(<DeclarationHabitude {...props} variante="stitch"/>);
 fireEvent.click(screen.getByRole('button',{name:'Corriger ce « Fait »'}));
 await screen.findByRole('button',{name:'Garder « Fait »'});expect(onConfirme).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Garder « Fait »'}));expect(rpc).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Corriger ce « Fait »'}));await screen.findByRole('button',{name:'Confirmer la correction'});
 let resolve!:(x:{data:unknown;error:unknown})=>void;rpc.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 fireEvent.click(screen.getByRole('button',{name:'Confirmer la correction'}));expect(onConfirme).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Réessayer la correction'})).toBeDisabled();
 const p=rpc.mock.calls.at(-1)![1];resolve({data:{event_id:p.p_client_event_id,etat:'non_commencee',aide_demandee:false,repetition:false},error:null});
 await waitFor(()=>expect(onConfirme).toHaveBeenCalledWith(expect.objectContaining({etat:'non_commencee'})));
 expect(screen.queryByRole('button',{name:'Corriger ce « Fait »'})).toBeNull();
 expect(await screen.findByRole('button',{name:'J’ai réalisé cette activité'})).toBeEnabled();
});
it('conserve la même demande après erreur et remontage',async()=>{
 const v=render(<DeclarationHabitude {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Corriger ce « Fait »'}));await screen.findByRole('button',{name:'Confirmer la correction'});
 rpc.mockRejectedValueOnce(Error('réseau'));fireEvent.click(screen.getByRole('button',{name:'Confirmer la correction'}));await screen.findByRole('alert');
 const p=rpc.mock.calls.at(-1)![1];expect(onConfirme).not.toHaveBeenCalled();v.unmount();
 render(<DeclarationHabitude {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Réessayer la correction'}));
 await waitFor(()=>expect(onConfirme).toHaveBeenCalledTimes(1));expect(rpc.mock.calls.at(-1)![1]).toEqual(p);
});
it('un conflit n’écrase pas une nouvelle déclaration',async()=>{
 render(<DeclarationHabitude {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Corriger ce « Fait »'}));await screen.findByRole('button',{name:'Confirmer la correction'});
 rpc.mockResolvedValueOnce({data:null,error:{code:'40001'}});fireEvent.click(screen.getByRole('button',{name:'Confirmer la correction'}));
 await screen.findByRole('alert');expect(onConfirme).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Corriger ce « Fait »'})).toBeDisabled();
});
it('ne corrige pas les archives',()=>{render(<DeclarationHabitude {...props} lectureSeule/>);expect(screen.queryByRole('button',{name:'Corriger ce « Fait »'})).toBeNull();expect(rpc).not.toHaveBeenCalled();});


