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
