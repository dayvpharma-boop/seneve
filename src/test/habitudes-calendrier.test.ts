import {expect,it} from 'vitest';
import {calendrierHabitudes,fuseauHabitudes} from '@/lib/habitudes-calendrier';
it('deux participants peuvent avoir des jours civils différents au même instant',()=>{
 const now=new Date('2026-10-25T12:30:00Z');
 expect(calendrierHabitudes('2026-10-26',180,'Pacific/Kiritimati',now).joursOuverts).toBe(1);
 expect(calendrierHabitudes('2026-10-26',180,'Etc/GMT+12',now).notStarted).toBe(true);
});
it('ouvre le nouveau jour à minuit local, sans attendre minuit UTC',()=>{
 expect(calendrierHabitudes('2026-10-25',180,'Africa/Kinshasa',new Date('2026-10-25T22:59:59Z')).day).toBe(1);
 expect(calendrierHabitudes('2026-10-25',180,'Africa/Kinshasa',new Date('2026-10-25T23:00:00Z')).day).toBe(2);
});
it('compte les dates civiles au changement d’heure',()=>{
 const a=calendrierHabitudes('2026-03-28',180,'Europe/Paris',new Date('2026-03-29T00:30:00Z'));
 const b=calendrierHabitudes('2026-03-28',180,'Europe/Paris',new Date('2026-03-29T22:30:00Z'));
 expect(a.day).toBe(2);expect(b.day).toBe(3);
});
it('borne les jours ouverts et distingue le lendemain de la fin',()=>{
 const c=calendrierHabitudes('2026-10-01',2,'UTC',new Date('2026-10-03T00:00:00Z'));
 expect(c.finished).toBe(true);expect(c.joursOuverts).toBe(2);
});
it('suit la préférence de rappel puis le fuseau du profil',()=>{
 expect(fuseauHabitudes({fuseau:'UTC',preferences:{rappels:{fuseau:'Europe/Paris'}}})).toBe('Europe/Paris');
 expect(fuseauHabitudes({fuseau:'UTC'})).toBe('UTC');
 expect(fuseauHabitudes({})).toBe('Africa/Kinshasa');
});
it('refuse une date ou un fuseau invalide',()=>{
 expect(()=>fuseauHabitudes({fuseau:'Invalide'})).toThrow();expect(()=>fuseauHabitudes({preferences:{rappels:{fuseau:''}}})).toThrow();expect(()=>calendrierHabitudes('2026-02-30',180,'UTC')).toThrow();
});
