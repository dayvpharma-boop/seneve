import {expect,it} from 'vitest';
import {planningHabitudesPourDate,jourDimeDuMois,type ModelePlanningHabitude,type HorairePersonnelHabitude,type RythmeDime} from '@/lib/habitudes-planning';
import {filtreCultesPrevus} from '@/lib/habitudes-cultes';
import {rythmeProposeHabitudes} from '@/lib/habitudes-rythme-propose';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';

// Décision de Dr Justin (03/11/2026) : commerçant chaque semaine, salarié une fois par mois ; comptée comme les cultes.
const dime:ModelePlanningHabitude={module_id:'HABITUDES_DEFIS',version:1,langue:'fr',habit_key:'dime',libelle:'Dîme',heure_proposee:'12:00',jours_iso:[7]};
const modeles=[...rythmeProposeHabitudes,dime];
const ctx={participant_id:'P',module_id:'HABITUDES_DEFIS',version:1,langue:'fr',fuseau:'Africa/Kinshasa'};
const horaire=(h:Partial<HorairePersonnelHabitude>):HorairePersonnelHabitude=>({...ctx,habit_key:'dime',creneau_id:'paie',heure_locale:'19:00',jours_iso:[5],valide_du:'2026-10-01',valide_au:null,...h});
const dimeLe=(date:string,rythme?:RythmeDime,hs:HorairePersonnelHabitude[]=[])=>planningHabitudesPourDate({...ctx,date_locale:date,dime:rythme},modeles,hs).rendezVous.filter(r=>r.habit_key==='dime');

it('hebdomadaire : seulement le dimanche proposé, ou le jour choisi par le commerçant',()=>{
 expect(dimeLe('2026-11-01')).toHaveLength(1);expect(dimeLe('2026-11-02')).toHaveLength(0);
 expect(dimeLe('2026-11-06',{rythme:'semaine'},[horaire({})])[0]).toMatchObject({heure_locale:'19:00',origine:'personnel'});
 expect(dimeLe('2026-11-01',{rythme:'semaine'},[horaire({})])).toHaveLength(0);
});
it('mensuelle : une seule fois dans le mois, au jour choisi et à l’heure du planning',()=>{
 const rythme:RythmeDime={rythme:'mois',jour_mois:25};
 const jours=Array.from({length:30},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`).filter(d=>dimeLe(d,rythme).length);
 expect(jours).toEqual(['2026-11-25']);
 expect(dimeLe('2026-11-25',rythme,[horaire({})])[0]).toMatchObject({heure_locale:'19:00'});
});
it('mensuelle : le dernier jour si le mois est plus court',()=>{
 expect(jourDimeDuMois('2026-11-10',31)).toBe(30);expect(jourDimeDuMois('2027-02-10',30)).toBe(28);expect(jourDimeDuMois('2028-02-10',31)).toBe(29);
 expect(dimeLe('2026-11-30',{rythme:'mois',jour_mois:31})).toHaveLength(1);
});
it('le suivi ne compte la dîme que le jour prévu, et garde une dîme déjà déclarée',()=>{
 const config=(d?:RythmeDime):ConfigurationHoraires=>({enrollment_id:'E',fuseau:'Africa/Kinshasa',date_locale:'2026-11-03',modifications_a_partir_du:'2026-11-04',modeles,horaires:[],revisions:[],...(d?{dime:d}:{})});
 const source='RECETTE_HD_DIME_V1:dime';
 const hebdo=filtreCultesPrevus(config());
 expect(hebdo(source,'2026-11-01',false)).toBe(true);expect(hebdo(source,'2026-11-03',false)).toBe(false);expect(hebdo(source,'2026-11-03',true)).toBe(true);
 const mensuel=filtreCultesPrevus(config({rythme:'mois',jour_mois:3}));
 expect(mensuel(source,'2026-11-03',false)).toBe(true);expect(mensuel(source,'2026-11-01',false)).toBe(false);
});
it('les créneaux de la dîme acceptent de 1 à 7 jours ; les autres habitudes gardent leur fréquence',async()=>{
 const {creneauxRespectentFrequence}=await import('@/lib/habitudes-creneaux');
 expect(creneauxRespectentFrequence('dime',[{creneau_id:'principal',heure_locale:'12:00',jours_iso:[3,5,7]}],1)).toBe(true);
 expect(creneauxRespectentFrequence('dime',[{creneau_id:'principal',heure_locale:'12:00',jours_iso:[]}],1)).toBe(false);
 expect(creneauxRespectentFrequence('culte_dimanche',[{creneau_id:'principal',heure_locale:'09:00',jours_iso:[3,7]}],1)).toBe(false);
});
