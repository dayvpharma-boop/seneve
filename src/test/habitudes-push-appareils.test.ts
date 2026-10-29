import {expect,it,vi} from 'vitest';
import {traiterRappelsHD,statutHttpPush} from '../../supabase/functions/envoyer-rappels-hd/dispatch';
const request_id='20000000-0000-4000-8000-000000000001';
const reminder_id='10000000-0000-4000-8000-000000000001';
const apple={endpoint:'https://web.push.apple.com/prive',p256dh:'CLE_PRIVEE',auth:'SECRET'};
const google={...apple,endpoint:'https://fcm.googleapis.com/prive'};
function rpc(){return vi.fn(async(n:string)=>({error:null,data:n==='hd_push_dispatch_enabled'?true:n==='hd_prepare_push_pilot'?{prepare:true}:n==='hd_claim_push_deliveries'?[{reminder_id,request_id}]:n==='hd_authorize_push_delivery'?{autorise:true,appareils:[apple,google,google]}:true}));}
it('signale un échec Google même si Apple accepte, sans nouvel essai',async()=>{
 const observe=vi.fn(),send=vi.fn(async(a:typeof apple)=>{if(a.endpoint===google.endpoint)throw {statusCode:410,body:'SECRET',endpoint:google.endpoint};});
 const c=await traiterRappelsHD(rpc(),send,observe);
 expect(send).toHaveBeenCalledTimes(2);expect(c.acceptees).toBe(1);
 expect(observe.mock.calls.map(x=>x[0])).toEqual([{request_id,fournisseur:'apple',resultat:'accepte_fournisseur',statut_http:null},{request_id,fournisseur:'google',resultat:'echec',statut_http:410}]);
 const log=JSON.stringify(observe.mock.calls);expect(log).not.toContain('SECRET');expect(log).not.toContain('prive');expect(log).not.toContain('CLE_PRIVEE');
});
it('les deux fournisseurs peuvent accepter indépendamment',async()=>{
 const observe=vi.fn();await traiterRappelsHD(rpc(),async()=>{},observe);
 expect(observe.mock.calls.map(x=>x[0].resultat)).toEqual(['accepte_fournisseur','accepte_fournisseur']);
});
it('une panne de trace ne change ni les envois ni la clôture',async()=>{
 const send=vi.fn(async()=>{});const c=await traiterRappelsHD(rpc(),send,()=>{throw Error('trace');});
 expect(c.acceptees).toBe(1);expect(c.incertaines).toBe(0);expect(send).toHaveBeenCalledTimes(2);
});
it('un timeout reste inconnu, les messages privés et statuts arbitraires ne sont pas copiés',()=>{
 for(const e of [Error('SECRET'),null,'SECRET',{statusCode:'410'},{statusCode:999},{statusCode:200.5}])expect(statutHttpPush(e)).toBe(null);
 expect(statutHttpPush({statusCode:403,body:'SECRET'})).toBe(403);
});
