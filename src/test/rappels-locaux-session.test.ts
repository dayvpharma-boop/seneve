import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({native:true,callback:null as null|((event:string,session:{user:{id:string}}|null)=>void),stop:vi.fn(),change:vi.fn(),listener:vi.fn()}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{onAuthStateChange:(callback:typeof m.callback)=>{m.callback=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
vi.mock('@/lib/rappels-locaux',()=>({CLE_ERREUR_ARRET_LOCAL:'echec-arret',rappelsLocauxDisponibles:()=>m.native,arreterRappelsLocaux:m.stop,changementCompteRappelsLocaux:m.change}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:{addListener:m.listener}}));
import {initialiserRappelsLocaux} from '@/lib/rappels-locaux-session';
beforeEach(()=>{localStorage.clear();m.native=true;m.callback=null;m.stop.mockReset().mockResolvedValue(undefined);m.change.mockReset().mockResolvedValue(undefined);m.listener.mockReset().mockResolvedValue({remove:vi.fn()});});
afterEach(()=>localStorage.clear());
it('ne prépare aucune notification sur le site web',()=>{m.native=false;initialiserRappelsLocaux();expect(m.callback).toBeNull();expect(m.listener).not.toHaveBeenCalled();});
it('annule au changement de compte et à la déconnexion, sans attente dans le callback Auth',()=>{
 initialiserRappelsLocaux();expect(m.callback!('INITIAL_SESSION',{user:{id:'A'}})).toBeUndefined();expect(m.change).toHaveBeenCalledWith('A');
 m.callback!('TOKEN_REFRESHED',{user:{id:'A'}});expect(m.stop).not.toHaveBeenCalled();
 m.callback!('SIGNED_IN',{user:{id:'B'}});expect(m.stop).toHaveBeenCalledOnce();
 m.callback!('SIGNED_OUT',null);expect(m.stop).toHaveBeenCalledTimes(2);
});
it('conserve un avertissement si l’arrêt au changement de compte échoue',async()=>{
 m.stop.mockRejectedValue(Error('téléphone indisponible'));initialiserRappelsLocaux();m.callback!('INITIAL_SESSION',{user:{id:'A'}});m.callback!('SIGNED_OUT',null);
 await vi.waitFor(()=>expect(localStorage.getItem('echec-arret')).toBe('1'));
});

