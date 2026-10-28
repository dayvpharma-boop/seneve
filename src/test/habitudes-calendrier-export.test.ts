import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {creerCalendrierHabitudes,instantCalendrier,plierIcs,rendezVousCalendrier,texteIcs} from '@/lib/habitudes-calendrier-export';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
const v={module_id:'HD',version:1,langue:'fr'};
const config:ConfigurationHoraires={enrollment_id:'E1',fuseau:'Africa/Kinshasa',date_locale:'2026-10-28',modifications_a_partir_du:'2026-10-29',revisions:[],horaires:[],modeles:[{...v,habit_key:'priere_matin',libelle:'Prière du matin',heure_proposee:'07:30',jours_iso:[1,2,3,4,5,6,7]}]};
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);});afterEach(()=>vi.unstubAllGlobals());
it.each([['Africa/Kinshasa','2026-10-28','07:30','2026-10-28T06:30:00.000Z'],['Asia/Kathmandu','2026-10-28','07:30','2026-10-28T01:45:00.000Z'],['Europe/Paris','2026-03-29','07:30','2026-03-29T05:30:00.000Z']])('conserve les horaires locaux dans %s',(zone,date,heure,iso)=>{expect(new Date(instantCalendrier(date,heure,zone)).toISOString()).toBe(iso);});
it.each([['2026-03-29','02:30'],['2026-10-25','02:30']])('refuse une heure absente ou ambiguë le %s',(date,heure)=>{expect(()=>instantCalendrier(date,heure,'Europe/Paris')).toThrow(/ambigu/);});
it('respecte la date effective du planning personnel et ignore les horaires déjà passés',()=>{
 const c={...config,horaires:[{...v,participant_id:'P1',habit_key:'priere_matin',creneau_id:'personnel',heure_locale:'08:00',jours_iso:[1,2,3,4,5,6,7],fuseau:config.fuseau,valide_du:'2026-10-29',valide_au:null}]};
 const r=rendezVousCalendrier(c,'P1',config.date_locale,['priere_matin'],new Date('2026-10-28T07:00:00Z'));
 expect(r).toHaveLength(6);expect(r[0]).toMatchObject({date:'2026-10-29',heure:'08:00'});expect(r.every(x=>x.heure==='08:00')).toBe(true);
 expect(()=>rendezVousCalendrier(c,'P1','2026-10-29',['priere_matin'],new Date('2026-10-28T05:00:00Z'))).toThrow();
});
it('exclut une clé non exportable et les sélections vides',()=>{
 expect(()=>rendezVousCalendrier(config,'P1',config.date_locale,['compteur_prive'],new Date('2026-10-28T05:00:00Z'))).toThrow();
 expect(()=>rendezVousCalendrier(config,'P1',config.date_locale,[],new Date('2026-10-28T05:00:00Z'))).toThrow();
});
it('produit des événements UTC privés, avec alerte, sans identité personnelle ni récurrence infinie',async()=>{
 const now=new Date('2026-10-28T05:00:00Z'),r=rendezVousCalendrier(config,'P1',config.date_locale,['priere_matin'],now);
 const a=await creerCalendrierHabitudes(r,'inscription-privee','fr',now),b=await creerCalendrierHabitudes(r,'inscription-privee','fr',new Date(+now+1000));
 expect(a.match(/BEGIN:VEVENT/g)).toHaveLength(7);expect(a.match(/BEGIN:VALARM/g)).toHaveLength(7);expect(a).toContain('DTSTART:20261028T063000Z\r\n');expect(a).toContain('TRIGGER:PT0S');
 expect(a.match(/UID:[^\r]+/g)).toEqual(b.match(/UID:[^\r]+/g));expect(a).not.toContain('inscription-privee');expect(a).not.toContain('RRULE:');expect(a).toContain('CLASS:PRIVATE');expect(a).not.toContain('ATTENDEE');
});
it('échappe les retours ligne et plie les lignes en octets UTF-8',()=>{
 const titre='Prière, matin;\\n\r\nBEGIN:VEVENT';
 expect(texteIcs(titre)).toContain('\\nBEGIN:VEVENT');expect(texteIcs(titre)).not.toContain('\r\n');
 const s='SUMMARY:'+('é🙏'.repeat(80)),fold=plierIcs(s);
 expect(fold.split('\r\n').every(l=>new TextEncoder().encode(l).length<=75)).toBe(true);expect(fold.replace(/\r\n /g,'')).toBe(s);
});
