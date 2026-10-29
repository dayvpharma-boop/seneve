import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';
it('conserve le nom de tâche et redemande une alerte quand sa notification est remplacée',async()=>{
 const handlers:Record<string,(e:unknown)=>void>={},showNotification=vi.fn().mockResolvedValue(undefined);
 runInNewContext(readFileSync('public/sw.js','utf8'),{URL,self:{location:'https://example.test/seneve/sw.js',addEventListener:(name:string,fn:(e:unknown)=>void)=>{handlers[name]=fn;},registration:{showNotification}}});
 let attente:Promise<unknown>|undefined;
 handlers.push!({data:{json:()=>({title:'SÉNEVÉ · Prière du matin',body:'Prière du matin reste à faire.',tag:'seneve-hd-activite',url:'/seneve/habitudes/aujourdhui'})},waitUntil:(p:Promise<unknown>)=>{attente=p;}});
 await attente;expect(showNotification).toHaveBeenCalledWith('SÉNEVÉ · Prière du matin',expect.objectContaining({body:'Prière du matin reste à faire.',tag:'seneve-hd-activite',renotify:true}));
});
it('après l’affichage d’un rappel, prévient les pages ouvertes pour que la cloche se relise', async () => {
 const handlers: Record<string, (e: unknown) => void> = {}, showNotification = vi.fn().mockResolvedValue(undefined), postMessage = vi.fn();
 runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: 'https://example.test/seneve/sw.js', addEventListener: (name: string, fn: (e: unknown) => void) => { handlers[name] = fn; }, registration: { showNotification }, clients: { matchAll: async () => [{ postMessage }] } } });
 let attente: Promise<unknown> | undefined;
 handlers.push!({ data: { json: () => ({ title: 'SÉNEVÉ', body: 'Rappel', tag: 'seneve-matin' }) }, waitUntil: (p: Promise<unknown>) => { attente = p; } });
 await attente;
 expect(postMessage).toHaveBeenCalledWith({ type: 'seneve-notification' });
});
it('fixe le chiffre de l’icône au nombre de notifications SÉNEVÉ affichées, quand le navigateur le permet', async () => {
 const handlers: Record<string, (e: unknown) => void> = {}, setAppBadge = vi.fn().mockResolvedValue(undefined);
 runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: 'https://example.test/seneve/sw.js', navigator: { setAppBadge }, addEventListener: (name: string, fn: (e: unknown) => void) => { handlers[name] = fn; }, registration: { showNotification: vi.fn().mockResolvedValue(undefined), getNotifications: async () => [{}, {}] }, clients: { matchAll: async () => [] } } });
 let attente: Promise<unknown> | undefined;
 handlers.push!({ data: { json: () => ({ title: 'SÉNEVÉ', body: 'Rappel' }) }, waitUntil: (p: Promise<unknown>) => { attente = p; } });
 await attente;
 expect(setAppBadge).toHaveBeenCalledWith(2);
});
