import {expect,it} from 'vitest';
import {planningHabitudesPourDate,type HorairePersonnelHabitude} from '@/lib/habitudes-planning';
import {rythmeProposeHabitudes as modeles} from '@/lib/habitudes-rythme-propose';
const ctx={participant_id:'A',module_id:'HABITUDES_DEFIS',version:1,langue:'fr',date_locale:'2026-10-26',fuseau:'Pacific/Kiritimati'};
const horaire=(h:Partial<HorairePersonnelHabitude>={}):HorairePersonnelHabitude=>({...ctx,habit_key:'priere_matin',creneau_id:'matin',heure_locale:'07:00',jours_iso:[1,2,3,4,5,6,7],valide_du:'2026-10-26',valide_au:null,...h});
const calc=(date=ctx.date_locale,hs:HorairePersonnelHabitude[]=[])=>planningHabitudesPourDate({...ctx,date_locale:date},modeles,hs);
it('propose 13 repères quotidiens et exactement trois cultes dans une semaine',()=>{
 let cultes=0;for(let j=26;j<=32;j++){const date=j<=31?`2026-10-${j}`:'2026-11-01',p=calc(date);expect(p.rendezVous.filter(r=>!r.habit_key.startsWith('culte'))).toHaveLength(13);cultes+=p.rendezVous.filter(r=>r.habit_key.startsWith('culte')).length;}
 expect(cultes).toBe(3);expect(calc('2026-10-28').rendezVous.find(r=>r.habit_key==='culte_semaine')!.heure_locale).toBe('18:30');
});
it('remplace une proposition par l’heure personnelle sans toucher aux entrées',()=>{
 const hs=[horaire()],avant=JSON.stringify({modeles,hs}),p=calc('2026-10-26',hs);expect(p.rendezVous.find(r=>r.habit_key==='priere_matin')).toMatchObject({heure_locale:'07:00',origine:'personnel'});expect(JSON.stringify({modeles,hs})).toBe(avant);
});
it('conserve les anciens horaires lors d’un changement daté',()=>{
 const hs=[horaire({valide_du:'2026-10-01',valide_au:'2026-10-26',heure_locale:'07:00'}),horaire({valide_du:'2026-10-27',heure_locale:'08:15'})];
 expect(calc('2026-10-26',hs).rendezVous.find(r=>r.habit_key==='priere_matin')!.heure_locale).toBe('07:00');expect(calc('2026-10-27',hs).rendezVous.find(r=>r.habit_key==='priere_matin')!.heure_locale).toBe('08:15');
});
it('permet des heures et jours réels différents pour chaque culte',()=>{
 const hs=[horaire({habit_key:'culte_semaine',creneau_id:'premier',jours_iso:[2],heure_locale:'17:45'}),horaire({habit_key:'culte_semaine',creneau_id:'second',jours_iso:[6],heure_locale:'18:15'}),horaire({habit_key:'culte_dimanche',creneau_id:'troisieme',jours_iso:[7],heure_locale:'10:30'})];
 expect(calc('2026-10-27',hs).rendezVous.find(r=>r.habit_key==='culte_semaine')!.heure_locale).toBe('17:45');expect(calc('2026-10-28',hs).rendezVous.some(r=>r.habit_key==='culte_semaine')).toBe(false);expect(calc('2026-10-31',hs).rendezVous.find(r=>r.habit_key==='culte_semaine')!.heure_locale).toBe('18:15');expect(calc('2026-11-01',hs).rendezVous.find(r=>r.habit_key==='culte_dimanche')!.heure_locale).toBe('10:30');
});
it('utilise la date civile fournie sans décalage du jour de culte par UTC',()=>{
 expect(planningHabitudesPourDate({...ctx,date_locale:'2026-11-01',fuseau:'Etc/GMT+12'},modeles,[]).rendezVous.some(r=>r.habit_key==='culte_dimanche')).toBe(true);
});
it('isole le participant, la langue et la version',()=>{
 const hs=[horaire({participant_id:'B'}),horaire({langue:'en'}),horaire({version:2})];expect(calc('2026-10-26',hs).rendezVous.find(r=>r.habit_key==='priere_matin')!.origine).toBe('proposition');
});
it('signale les rendez-vous simultanés sans déplacer la prière ni inventer sa durée',()=>{
 const p=calc('2026-10-26',[horaire({heure_locale:'06:20'})]);expect(p.simultanes).toHaveLength(1);expect(p.simultanes[0]!.map(r=>r.habit_key).sort()).toEqual(['bible_matin','priere_matin']);expect(p.rendezVous.find(r=>r.habit_key==='priere_matin')!.heure_locale).toBe('06:20');expect(p.rendezVous[0]).not.toHaveProperty('etat');
});
it('refuse deux versions actives du même créneau et les fuseaux incohérents',()=>{
 expect(()=>calc('2026-10-26',[horaire(),horaire({heure_locale:'09:00'})])).toThrow('superposées');expect(()=>calc('2026-10-26',[horaire({fuseau:'Africa/Kinshasa'})])).toThrow('incohérent');
});
it('refuse dates impossibles, heures invalides et jours répétés',()=>{
 expect(()=>calc('2026-02-30')).toThrow('Date civile');expect(()=>calc('2026-10-26',[horaire({heure_locale:'24:00'})])).toThrow('Horaire');expect(()=>calc('2026-10-26',[horaire({jours_iso:[1,1]})])).toThrow('semaine');expect(()=>calc('2026-10-26',[horaire({valide_au:'2026-10-25'})])).toThrow('Période');
});
it('ne conserve pas un horaire orphelin ou deux modèles contradictoires',()=>{
 expect(()=>calc('2026-10-26',[horaire({habit_key:'inconnu'})])).toThrow('modèle');expect(()=>planningHabitudesPourDate(ctx,[...modeles,modeles[0]!],[])).toThrow('ambigu');
});
