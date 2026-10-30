import {expect,it,vi} from 'vitest';
import {appareilPushValide,traiterRappelsHD} from '../../supabase/functions/envoyer-rappels-hd/dispatch';
const reminder_id='10000000-0000-4000-8000-000000000001',request_id='20000000-0000-4000-8000-000000000001';
const appareil={endpoint:'https://web.push.apple.com/fictif',p256dh:'FICTIF',auth:'FICTIF'};
function transport(options:{actif?:boolean;autorise?:boolean;accordFinal?:boolean;rejeu?:boolean;planifie?:boolean}={}){return vi.fn(async(nom:string)=>({error:null,data:nom==='hd_push_dispatch_enabled'?options.actif!==false:nom==='hd_prepare_push_pilot'?{prepare:options.planifie!==false}:nom==='hd_claim_push_deliveries'?[{reminder_id,request_id}]:nom==='hd_authorize_push_delivery'?{autorise:options.autorise!==false,langue:'fr',habit_key:'priere_matin',activity_id:reminder_id,relance:true,appareils:[appareil,appareil]}:nom==='hd_push_delivery_allowed'?options.accordFinal!==false:true}));}
it('interrupteur fermé : aucune réservation ni notification',async()=>{const rpc=transport({actif:false}),send=vi.fn();expect(await traiterRappelsHD(rpc,send)).toEqual({acceptees:0,echecs:0,bloquees:0,incertaines:0});expect(rpc).toHaveBeenCalledTimes(1);expect(send).not.toHaveBeenCalled();});
it('un refus au dernier contrôle empêche tout envoi',async()=>{const send=vi.fn();await traiterRappelsHD(transport({accordFinal:false}),send);expect(send).not.toHaveBeenCalled();});
it('une autorisation déjà consommée ne permet pas de rejeu fournisseur',async()=>{const send=vi.fn();const c=await traiterRappelsHD(transport({autorise:false}),send);expect(c.bloquees).toBe(1);expect(send).not.toHaveBeenCalled();});
it('déduplique les appareils et nomme la tâche et ouvre la bonne activité',async()=>{const send=vi.fn().mockResolvedValue(undefined);const c=await traiterRappelsHD(transport(),send);expect(c.acceptees).toBe(1);expect(send).toHaveBeenCalledTimes(1);const texte=JSON.parse(send.mock.calls[0]![1]);expect(texte.url).toBe('/seneve/habitudes/aujourdhui?lang=fr#hd-activite-'+reminder_id);expect(texte.title).toBe('SÉNEVÉ · Prière du matin');expect(texte.body).toContain('Prière du matin');});
it('ne réessaie pas après une réponse fournisseur incertaine',async()=>{const send=vi.fn().mockRejectedValue(Error('timeout'));const c=await traiterRappelsHD(transport(),send);expect(send).toHaveBeenCalledTimes(1);expect(c.echecs).toBe(1);});
it('refuse les endpoints arbitraires, HTTP et identifiants dans une URL',()=>{for(const endpoint of ['http://web.push.apple.com/fictif','https://localhost/fictif','https://example.com/fictif','https://user:secret@web.push.apple.com/fictif','https://web.push.apple.com:443/fictif']){const resultat=appareilPushValide({...appareil,endpoint});if(endpoint.includes(':443'))expect(resultat).toBe(true);else expect(resultat).toBe(false);}expect(appareilPushValide(appareil)).toBe(true);});

it('ne réclame ni n’envoie de rappel si aucun planning n’a pu être préparé',async()=>{const rpc=transport({planifie:false}),send=vi.fn();await traiterRappelsHD(rpc,send);expect(rpc.mock.calls.map(c=>c[0])).not.toContain('hd_claim_push_deliveries');expect(send).not.toHaveBeenCalled();});

it('fin de journée locale : minuit chez le participant, quel que soit le fuseau',async()=>{
 const {finJourneeLocale}=await import('../../supabase/functions/envoyer-rappels-hd/dispatch');
 // 30/10 23:50 à Kinshasa (UTC+1) -> minuit du 31/10 à Kinshasa = 30/10 23:00 UTC.
 expect(new Date(finJourneeLocale('2026-10-30T22:50:00Z','Africa/Kinshasa')).toISOString()).toBe('2026-10-30T23:00:00.000Z');
 // Paris passe à l'heure d'hiver le 25/10/2026 : minuit du 26/10 = 25/10 23:00 UTC.
 expect(new Date(finJourneeLocale('2026-10-25T10:00:00Z','Europe/Paris')).toISOString()).toBe('2026-10-25T23:00:00.000Z');
 expect(new Date(finJourneeLocale('2026-07-01T10:00:00Z','America/New_York')).toISOString()).toBe('2026-07-02T04:00:00.000Z');
});
it('validité limitée à minuit et aucun envoi dans la dernière minute de la journée',async()=>{
 const {dureeValidite}=await import('../../supabase/functions/envoyer-rappels-hd/dispatch');
 expect(dureeValidite(null,0)).toBe(1800);expect(dureeValidite(600000,0)).toBe(600);expect(dureeValidite(9e9,0)).toBe(1800);
 const send=vi.fn().mockResolvedValue(undefined);
 const tard=await traiterRappelsHD(transport(),send,undefined,async()=>100000,()=>70000);
 expect(send).not.toHaveBeenCalled();expect(tard.bloquees).toBe(1);
 const send2=vi.fn().mockResolvedValue(undefined);
 await traiterRappelsHD(transport(),send2,undefined,async()=>1000000,()=>400000);
 expect(send2.mock.calls[0]![2]).toBe(600);expect(JSON.parse(send2.mock.calls[0]![1]).fin).toBe(1000000);
});
