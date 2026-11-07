import {expect,it} from 'vitest';
import {momentLisible} from '@/lib/date-heure-finances';

it('ajoute l’heure de la saisie à la date, à l’heure du téléphone',()=>{
 const t=new Date(2026,10,7,14,32);
 expect(momentLisible('2026-11-07',t.toISOString(),false)).toBe('7 novembre 2026 · 14:32');
});
it('précise le jour de la saisie quand il diffère de la date choisie',()=>{
 const t=new Date(2026,10,9,10,5);
 expect(momentLisible('2026-11-07',t.toISOString(),false)).toBe('7 novembre 2026 · noté le 9 novembre à 10:05');
 expect(momentLisible('2026-11-07',t.toISOString(),true)).toBe('7 November 2026 · recorded 9 November at 10:05');
});
it('sans heure enregistrée, la date seule reste affichée',()=>{
 expect(momentLisible('2026-11-07',undefined,false)).toBe('7 novembre 2026');
});
