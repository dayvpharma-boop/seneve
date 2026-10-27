import {beforeEach,expect,it,vi} from 'vitest';
import {chargerDetailsLectures,cleLecture,enregistrerLecture,lireLectureEnAttente,preparerLecture} from '@/lib/habitudes-lectures-api';
import {effacerSaisiesHabitudes} from '@/lib/habitudes-saisie';
const uid='10000000-0000-4000-8000-000000000001',autre='10000000-0000-4000-8000-000000000002',eid='20000000-0000-4000-8000-000000000001',aid='30000000-0000-4000-8000-000000000001';
const o={enrollment_id:eid,occurrence_id:aid,date_locale:'2026-10-27',version:1,requise:true};
beforeEach(()=>sessionStorage.clear());
it('garde le même événement et le contenu exact après erreur, sans mélanger les comptes',async()=>{
 const cle=cleLecture(uid,o),s=preparerLecture(sessionStorage,cle,'partielle',20,'  Manuel  '),rpc=vi.fn().mockResolvedValue({data:null,error:'réseau'});
 await expect(enregistrerLecture({rpc},o,s)).rejects.toBe('réseau');
 expect(preparerLecture(sessionStorage,cle,'partielle',20,'Manuel')).toEqual(s);expect(lireLectureEnAttente(sessionStorage,cleLecture(autre,o))).toBeNull();
 expect(()=>preparerLecture(sessionStorage,cle,'realisee',30,'Autre')).toThrow();expect(lireLectureEnAttente(sessionStorage,cle)).toEqual(s);
 effacerSaisiesHabitudes();expect(lireLectureEnAttente(sessionStorage,cle)).toBeNull();
});
it.each([0,1441,1.5,NaN])('refuse la durée %s avant toute écriture',n=>{expect(()=>preparerLecture(sessionStorage,cleLecture(uid,o),'realisee',n,'')).toThrow();});
it('refuse un titre trop long',()=>expect(()=>preparerLecture(sessionStorage,cleLecture(uid,o),'realisee',30,'x'.repeat(161))).toThrow());
it('lit seulement les activités demandées et refuse une réponse d’une autre activité',async()=>{
 const rpc=vi.fn().mockResolvedValue({data:[{activity_id:aid,minutes:20,titre:'Manuel'}],error:null});expect(await chargerDetailsLectures({rpc},eid,[aid])).toEqual([{activity_id:aid,minutes:20,titre:'Manuel'}]);
 rpc.mockResolvedValue({data:[{activity_id:eid,minutes:20,titre:null}],error:null});await expect(chargerDetailsLectures({rpc},eid,[aid])).rejects.toThrow();
});
it('n’accepte une confirmation que si état et durée sont valides pour la bonne activité',async()=>{
 const s=preparerLecture(sessionStorage,cleLecture(uid,o),'realisee',30,'');
 const rpc=vi.fn().mockResolvedValue({data:{event_id:crypto.randomUUID(),etat:'realisee',aide_demandee:false,repetition:false,reading:{activity_id:aid,minutes:30,titre:null}},error:null});
 expect((await enregistrerLecture({rpc},o,s)).etat).toMatchObject({etat:'realisee',synchronisation:'synchronise'});
 rpc.mockResolvedValue({data:{event_id:crypto.randomUUID(),etat:'partielle',aide_demandee:false,repetition:false,reading:{activity_id:aid,minutes:30,titre:null}},error:null});await expect(enregistrerLecture({rpc},o,s)).rejects.toThrow();
});
