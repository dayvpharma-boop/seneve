import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {preparerRappelsLocaux,PREMIER_ID_LOCAL} from '@/lib/rappels-locaux-planning';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
const conf:ConfigurationHoraires={enrollment_id:'E',fuseau:'Africa/Kinshasa',date_locale:'2026-10-28',modifications_a_partir_du:'2026-10-29',horaires:[],revisions:[],modeles:['priere_matin','bible_matin'].map(habit_key=>({module_id:'HD',version:1,langue:'fr',habit_key,libelle:habit_key,heure_proposee:'07:30',jours_iso:[1,2,3,4,5,6,7]}))};
const now=new Date('2026-10-28T05:00:00Z');
it('regroupe les horaires simultanés et s’arrête strictement à la fin du droit',()=>{
 const p=preparerRappelsLocaux(conf,'P',conf.date_locale,['priere_matin','bible_matin'],'2026-10-30T06:30:00Z',now);
 expect(p.rappels).toHaveLength(2);expect(p.rappels[0]).toMatchObject({id:PREMIER_ID_LOCAL,instant:Date.parse('2026-10-28T06:30:00Z')});
 expect(p.rappels[0]!.titre).toContain('bible_matin · priere_matin');expect(p.rappels.every(r=>r.instant<p.fin)).toBe(true);
});
it('refuse un accès expiré et ne crée jamais de répétition',()=>{
 expect(()=>preparerRappelsLocaux(conf,'P',conf.date_locale,['priere_matin'],'2026-10-27T05:00:00Z',now)).toThrow();
 expect(preparerRappelsLocaux(conf,'P',conf.date_locale,['priere_matin'],'2027-01-01T00:00:00Z',now).rappels).toHaveLength(7);
});
const m=vi.hoisted(()=>({native:true,permission:'granted',exact:'granted',pending:[] as {id:number}[],schedule:vi.fn(),cancel:vi.fn(),request:vi.fn(),settings:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>m.native,isPluginAvailable:()=>m.native,getPlatform:()=> 'android'}}));
vi.mock('@capacitor/local-notifications',()=>({LocalNotifications:{
 getPending:vi.fn(async()=>({notifications:[...m.pending]})),
 checkPermissions:vi.fn(async()=>({display:m.permission})),
 requestPermissions:m.request,
 checkExactNotificationSetting:vi.fn(async()=>({exact_alarm:m.exact})),
 changeExactNotificationSetting:m.settings,
 createChannel:vi.fn(async()=>{}),
 schedule:m.schedule,cancel:m.cancel,
}}));
import {arreterRappelsLocaux,programmerRappelsLocaux,etatRappelsLocaux,changementCompteRappelsLocaux,ReglageAlarmesRequis,AutorisationRappelsRefusee} from '@/lib/rappels-locaux';
beforeEach(()=>{
 vi.stubEnv('VITE_SENEVE_MOBILE','1');vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);
 localStorage.clear();m.native=true;m.permission='granted';m.exact='granted';m.pending=[];
 m.schedule.mockReset().mockImplementation(async({notifications})=>{m.pending.push(...notifications.map((n:{id:number})=>({id:n.id})));return {notifications};});
 m.cancel.mockReset().mockImplementation(async({notifications})=>{m.pending=m.pending.filter(n=>!notifications.some((x:{id:number})=>x.id===n.id));});
 m.request.mockReset().mockImplementation(async()=>({display:m.permission}));m.settings.mockReset();
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
const plan=()=>preparerRappelsLocaux(conf,'P',conf.date_locale,['priere_matin'],'2026-11-01T00:00:00Z',now);
it('n’active rien sur le web et ne demande pas de permission en consultant l’état',async()=>{
 m.native=false;await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toThrow('mobile');expect(m.schedule).not.toHaveBeenCalled();
 m.native=true;await etatRappelsLocaux();expect(m.request).not.toHaveBeenCalled();
});
it('gère le refus de notifications et le réglage Android sans prétendre avoir programmé',async()=>{
 m.permission='denied';await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toBeInstanceOf(AutorisationRappelsRefusee);
 m.permission='granted';m.exact='denied';await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toBeInstanceOf(ReglageAlarmesRequis);
 expect(m.settings).not.toHaveBeenCalled();expect(m.schedule).not.toHaveBeenCalled();
});
it('remplace les alertes HD, conserve les autres, puis vérifie les alertes acceptées',async()=>{
 m.pending=[{id:PREMIER_ID_LOCAL+40},{id:42}];
 const r=await programmerRappelsLocaux(plan(),'U','E');
 expect(r.nombre).toBe(4);expect(m.pending.map(n=>n.id)).toEqual([42,PREMIER_ID_LOCAL,PREMIER_ID_LOCAL+1,PREMIER_ID_LOCAL+2,PREMIER_ID_LOCAL+3]);
 const n=m.schedule.mock.calls[0]![0].notifications[0];expect(n.schedule.at).toBeInstanceOf(Date);expect(n.schedule).not.toHaveProperty('repeats');expect(n.isExactMandatory).toBe(true);
 expect((await etatRappelsLocaux()).nombre).toBe(4);
 await arreterRappelsLocaux();expect(m.pending).toEqual([{id:42}]);expect(localStorage.getItem('seneve:rappels-locaux:v1')).toBeNull();
});
it('annule les rappels du précédent compte',async()=>{
 await programmerRappelsLocaux(plan(),'U','E');await changementCompteRappelsLocaux('AUTRE');
 expect(m.pending).toEqual([]);expect((await etatRappelsLocaux()).nombre).toBe(0);
});
it('ne confirme pas une programmation partielle et nettoie les alertes déjà déposées',async()=>{
 m.schedule.mockImplementation(async({notifications})=>{m.pending.push({id:notifications[0].id});return {notifications};});
 await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toThrow('confirmée');expect(m.pending).toEqual([]);
});
it('un arrêt pendant la demande de permission empêche une programmation tardive',async()=>{
 m.permission='prompt';let accorder!:(x:{display:string})=>void;
 m.request.mockReturnValue(new Promise(resolve=>{accorder=resolve;}));
 const activation=programmerRappelsLocaux(plan(),'U','E');await vi.waitUntil(()=>m.request.mock.calls.length>0);
 const arret=arreterRappelsLocaux();accorder({display:'granted'});
 await expect(activation).rejects.toThrow('annulée');await arret;expect(m.schedule).not.toHaveBeenCalled();
});
it('un planning devenu passé pendant l’autorisation ne supprime pas les anciens rappels',async()=>{
 m.pending=[{id:PREMIER_ID_LOCAL+40}];m.permission='prompt';m.request.mockImplementation(async()=>{vi.setSystemTime(new Date('2026-10-28T07:00:00Z'));return {display:'granted'};});
 await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toThrow('actualiser');expect(m.pending).toEqual([{id:PREMIER_ID_LOCAL+40}]);expect(m.schedule).not.toHaveBeenCalled();
});
it('ne présente pas un arrêt comme confirmé si le téléphone conserve les alertes',async()=>{
 m.pending=[{id:PREMIER_ID_LOCAL}];m.cancel.mockResolvedValue(undefined);
 await expect(arreterRappelsLocaux()).rejects.toThrow('non confirmé');expect((await etatRappelsLocaux()).nombre).toBe(1);
});
it('la capacité saturée du téléphone conserve la programmation précédente',async()=>{
 m.pending=[...Array.from({length:62},(_,i)=>({id:i})),{id:PREMIER_ID_LOCAL+40}];
 await expect(programmerRappelsLocaux(plan(),'U','E')).rejects.toThrow('trop de rappels');
 expect(m.cancel).not.toHaveBeenCalled();expect(m.schedule).not.toHaveBeenCalled();
});


