import {expect,it} from 'vitest';
import {calendrierPeriodes,dateDuJourHabitudes,debutsMois,jourHabitudes} from '@/lib/habitudes-periodes';

const Z='Africa/Kinshasa';
// Cas réel du 26/10/2026 : inscription à 21h42 (Kinshasa), mois 2 payé d'avance.
const continu=[
 {mois:1,debut:'2026-10-26T20:42:44Z',fin_exclue:'2026-11-25T20:42:44Z'},
 {mois:2,debut:'2026-11-25T20:42:44Z',fin_exclue:'2026-12-25T20:42:44Z'},
];
it('sans coupure : identique au calcul civil (comme le serveur)',()=>{
 const d=debutsMois('2026-10-26',continu,Z);
 expect(d).toEqual([{mois:1,debut:'2026-10-26'},{mois:2,debut:'2026-11-25'}]);
 expect(['2026-10-26','2026-11-25','2026-12-25'].map(x=>jourHabitudes('2026-10-26',d,x))).toEqual([1,31,61]);
 expect([30,31,61].map(j=>dateDuJourHabitudes('2026-10-26',d,j))).toEqual(['2026-11-24','2026-11-25','2026-12-25']);
});
it('achat en retard : le mois 2 reprend au jour 31, le jour de l’achat',()=>{
 const retard=[continu[0]!,{mois:2,debut:'2026-12-05T07:00:00Z',fin_exclue:'2027-01-04T07:00:00Z'}];
 const d=debutsMois('2026-10-26',retard,Z);
 expect(d[1]).toEqual({mois:2,debut:'2026-12-05'});
 expect(jourHabitudes('2026-10-26',d,'2026-12-05')).toBe(31);
 expect(dateDuJourHabitudes('2026-10-26',d,31)).toBe('2026-12-05');
 expect(dateDuJourHabitudes('2026-10-26',d,30)).toBe('2026-11-24');
 const c=calendrierPeriodes('2026-10-26',retard,Z,30,new Date('2026-12-06T10:00:00Z'));
 expect(c.day).toBe(32);expect(c.finished).toBe(false);expect(c.total).toBe(61);
});
it('mois gratuit seul : le jour 31 reste ouvert jusqu’à la fin réelle des 30 jours',()=>{
 const c=calendrierPeriodes('2026-10-26',[continu[0]!],Z,30,new Date('2026-11-25T08:00:00Z'));
 expect(c.day).toBe(31);expect(c.finished).toBe(false);
 expect(calendrierPeriodes('2026-10-26',[continu[0]!],Z,30,new Date('2026-11-26T08:00:00Z')).finished).toBe(true);
});
