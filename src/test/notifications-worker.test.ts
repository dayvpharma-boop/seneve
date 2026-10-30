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
it('à minuit, retire les rappels de la veille encore affichés mais garde les annonces et les rappels du jour', async () => {
 const handlers: Record<string, (e: unknown) => void> = {}, fermes: string[] = [], setAppBadge = vi.fn().mockResolvedValue(undefined);
 const n = (tag: string, data: Record<string, unknown>) => ({ tag, data, close: () => fermes.push(tag) });
 const maintenant = Date.now(), hier = new Date(maintenant - 86400000), j = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
 const liste = [n('seneve-hd-a', { jour: j(hier) }), n('seneve-hd-b', { fin: maintenant - 1000 }), n('seneve-matin', { jour: j(hier) }), n('seneve-annonce-1', { jour: j(hier) }), n('seneve-hd-c', { fin: maintenant + 3600000 }), n('seneve-soir', { jour: j(new Date(maintenant)) })];
 runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: 'https://example.test/seneve/sw.js', navigator: { setAppBadge }, addEventListener: (name: string, fn: (e: unknown) => void) => { handlers[name] = fn; }, registration: { showNotification: vi.fn().mockResolvedValue(undefined), getNotifications: async () => liste }, clients: { matchAll: async () => [] } } });
 let attente: Promise<unknown> | undefined;
 handlers.push!({ data: { json: () => ({ title: 'SÉNEVÉ', body: 'Rappel', tag: 'seneve-hd-c', fin: maintenant + 3600000 }) }, waitUntil: (p: Promise<unknown>) => { attente = p; } });
 await attente;
 expect(fermes.sort()).toEqual(['seneve-hd-a', 'seneve-hd-b', 'seneve-matin']);
 expect(setAppBadge).toHaveBeenCalledWith(3);
 fermes.length = 0; let attente2: Promise<unknown> | undefined;
 handlers.message!({ data: { type: 'seneve-retirer-rappels-perimes' }, waitUntil: (p: Promise<unknown>) => { attente2 = p; } });
 await attente2; expect(fermes.length).toBe(3);
});
it('transmet la fin de journée reçue du serveur à la notification affichée', async () => {
 const handlers: Record<string, (e: unknown) => void> = {}, showNotification = vi.fn().mockResolvedValue(undefined);
 runInNewContext(readFileSync('public/sw.js', 'utf8'), { URL, self: { location: 'https://example.test/seneve/sw.js', addEventListener: (name: string, fn: (e: unknown) => void) => { handlers[name] = fn; }, registration: { showNotification } } });
 let attente: Promise<unknown> | undefined;
 handlers.push!({ data: { json: () => ({ title: 'SÉNEVÉ', tag: 'seneve-hd-x', fin: 123 }) }, waitUntil: (p: Promise<unknown>) => { attente = p; } });
 await attente; expect(showNotification).toHaveBeenCalledWith('SÉNEVÉ', expect.objectContaining({ data: expect.objectContaining({ fin: 123 }) }));
});
