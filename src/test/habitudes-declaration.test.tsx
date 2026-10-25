import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {DeclarationHabitude} from '@/components/DeclarationHabitude';
import {cleSaisie,preparerSaisie,effacerSaisiesHabitudes} from '@/lib/habitudes-saisie';
const uid='10000000-0000-4000-8000-000000000001',eid='10000000-0000-4000-8000-000000000002';
const aid=(n:number)=>`20000000-0000-4000-8000-00000000000${n}`;
const occurrence={enrollment_id:eid,occurrence_id:aid(1),version:1,date_locale:'2026-10-25',requise:true};
const onConfirme=vi.fn();
const ok=(args:Record<string,string>)=>({data:{event_id:args.p_client_event_id,etat:args.p_etat==='aide_demandee'?'non_commencee':args.p_etat,aide_demandee:args.p_etat==='aide_demandee',repetition:false},error:null});
const rpc=vi.fn((_nom:string,args:Record<string,string>)=>Promise.resolve(ok(args)));
const props={userId:uid,occurrence,consigne:'Prière du matin',langue:'fr',lectureSeule:false,transport:{rpc},onConfirme};
beforeEach(()=>{sessionStorage.clear();rpc.mockReset().mockImplementation((_nom,args)=>Promise.resolve(ok(args)));onConfirme.mockReset();});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllEnvs();});
it('attend la confirmation, bloque le double clic et ne valide pas midi',async()=>{
 let resolve!:(r:ReturnType<typeof ok>)=>void;rpc.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 render(<><DeclarationHabitude {...props}/><DeclarationHabitude {...props} occurrence={{...occurrence,occurrence_id:aid(2)}} consigne="Prière de midi"/></>);
 const matin=screen.getByRole('region',{name:'Prière du matin'}),midi=screen.getByRole('region',{name:'Prière de midi'});
 const bouton=within(matin).getByRole('button',{name:'J’ai réalisé cette activité'});fireEvent.click(bouton);fireEvent.click(bouton);
 expect(rpc).toHaveBeenCalledTimes(1);expect(within(matin).queryByText(/Synchronisée/)).toBeNull();expect(onConfirme).not.toHaveBeenCalled();
 resolve(ok(rpc.mock.calls[0]![1]));await within(matin).findByText('Réalisée · Synchronisée');
 expect(within(midi).getByText('Pas encore enregistrée')).toBeInTheDocument();
});
it('réutilise la même requête après erreur et remontage de la carte',async()=>{
 rpc.mockRejectedValueOnce(new Error('réseau'));const view=render(<DeclarationHabitude {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'J’ai réalisé cette activité'}));await screen.findByRole('alert');
 const id=rpc.mock.calls[0]![1].p_client_event_id;expect(onConfirme).not.toHaveBeenCalled();view.unmount();render(<DeclarationHabitude {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'Réessayer cette déclaration'}));await screen.findByText('Réalisée · Synchronisée');
 expect(rpc.mock.calls[1]![1].p_client_event_id).toBe(id);expect(sessionStorage.getItem(cleSaisie(uid,eid,aid(1)))).toBeNull();
});
it('une réponse serveur vide ne devient pas synchronisée',async()=>{
 rpc.mockResolvedValueOnce({data:null as never,error:null});render(<DeclarationHabitude {...props}/>);fireEvent.click(screen.getByRole('button',{name:'J’ai réalisé cette activité'}));
 await screen.findByRole('alert');expect(screen.queryByText(/Synchronisée/)).toBeNull();expect(onConfirme).not.toHaveBeenCalled();
});
it('l’aide demandée ne réalise pas l’activité',async()=>{
 render(<DeclarationHabitude {...props}/>);fireEvent.click(screen.getByRole('button',{name:'J’ai besoin d’aide'}));await screen.findByText('Aide demandée');
 expect(screen.getByText('Pas encore enregistrée · Synchronisée')).toBeInTheDocument();expect(onConfirme.mock.calls[0]![0].etat).toBe('non_commencee');
});
it.each([['Je l’ai préparée','Préparée'],['Je l’ai réalisée en partie','Réalisée en partie']])('conserve l’état %s distinct de réalisée',async(bouton,etat)=>{
 render(<DeclarationHabitude {...props}/>);fireEvent.click(screen.getByRole('button',{name:bouton}));await screen.findByText(`${etat} · Synchronisée`);expect(screen.getByRole('button',{name:'J’ai réalisé cette activité'})).toBeEnabled();
});
it('une carte en lecture seule ne propose aucune déclaration',()=>{
 render(<DeclarationHabitude {...props} lectureSeule/>);expect(screen.queryByRole('button')).toBeNull();expect(rpc).not.toHaveBeenCalled();
});
it('un stockage indisponible bloque l’appel avant tout envoi',async()=>{
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});render(<DeclarationHabitude {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'J’ai réalisé cette activité'}));await screen.findByRole('alert');expect(rpc).not.toHaveBeenCalled();
});
it('isole comptes et activités et nettoie les requêtes à la déconnexion',()=>{
 const key=cleSaisie(uid,eid,aid(1));preparerSaisie(sessionStorage,key,'realisee');
 expect(()=>preparerSaisie(sessionStorage,key,'partielle')).toThrow();expect(cleSaisie(aid(8),eid,aid(1))).not.toBe(key);expect(cleSaisie(uid,eid,aid(2))).not.toBe(key);
 sessionStorage.setItem('autre','conserver');effacerSaisiesHabitudes();expect(sessionStorage.getItem(key)).toBeNull();expect(sessionStorage.getItem('autre')).toBe('conserver');
});

it('un nettoyage local échoué ne nie pas une confirmation serveur reçue',async()=>{
 vi.spyOn(Storage.prototype,'removeItem').mockImplementation(()=>{throw new Error('stockage');});render(<DeclarationHabitude {...props}/>);
 fireEvent.click(screen.getByRole('button',{name:'J’ai réalisé cette activité'}));await screen.findByText('Réalisée · Synchronisée');
 expect(screen.getByText('Enregistrement confirmé. Réessaie pour terminer la mise à jour sur cet appareil.')).toBeInTheDocument();expect(onConfirme).toHaveBeenCalledTimes(1);
 expect(screen.queryByText(/Cette déclaration n’est pas encore confirmée/)).toBeNull();
});
