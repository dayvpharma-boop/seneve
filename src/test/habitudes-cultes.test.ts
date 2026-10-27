import {expect,it} from 'vitest';
import {filtreCultesPrevus} from '@/lib/habitudes-cultes';
import {joursHabitudesLecture,type ActiviteLecture,type ContenuLecture,type EtatLecture} from '@/lib/habitudes-lecture';
import {semainesHabitudes} from '@/lib/habitudes-bilans';
import {rythmeProposeHabitudes as modeles} from '@/lib/habitudes-rythme-propose';
import type {ConfigurationHoraires} from '@/lib/habitudes-horaires-api';
import type {HorairePersonnelHabitude} from '@/lib/habitudes-planning';

// Le programme publié contient chaque jour 13 habitudes et les trois cultes possibles (deux en semaine, un le dimanche).
const QUOTIDIENNES=modeles.filter(m=>m.jours_iso.length===7).map(m=>m.habit_key);
const CULTES=['culte_semaine:1','culte_semaine:2','culte_dimanche:1'];
const config=(horaires:HorairePersonnelHabitude[]=[]):ConfigurationHoraires=>({enrollment_id:'E',fuseau:'Africa/Kinshasa',date_locale:'2026-10-27',modifications_a_partir_du:'2026-10-28',modeles:[...modeles],horaires,revisions:[]});
const horaire=(h:Partial<HorairePersonnelHabitude>):HorairePersonnelHabitude=>({module_id:'HABITUDES_DEFIS',version:1,langue:'fr',participant_id:'P',habit_key:'culte_semaine',creneau_id:'c1',heure_locale:'18:30',jours_iso:[3,5],fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null,...h});
const source=(culte:string)=>`RECETTE_HD_CULTE_V1:${culte}`;

it('ne garde que les cultes prévus ce jour-là avec les horaires proposés',()=>{
 const garder=filtreCultesPrevus(config());
 const prevus=(date:string)=>CULTES.filter(c=>garder(source(c),date,false));
 expect(prevus('2026-10-26')).toEqual([]);// lundi
 expect(prevus('2026-10-28')).toEqual(['culte_semaine:1']);// mercredi
 expect(prevus('2026-10-30')).toEqual(['culte_semaine:1']);// vendredi
 expect(prevus('2026-11-01')).toEqual(['culte_dimanche:1']);// dimanche
 expect(garder('RECETTE_HD_QUOTIDIEN_V1:priere_matin','2026-10-26',false)).toBe(true);
 expect(garder(null,'2026-10-26',false)).toBe(true);
});

it('suit les jours personnels du culte, y compris deux cultes le même jour',()=>{
 const garder=filtreCultesPrevus(config([horaire({creneau_id:'a',jours_iso:[2],heure_locale:'07:00'}),horaire({creneau_id:'b',jours_iso:[2,6],heure_locale:'19:00'})]));
 expect(CULTES.filter(c=>garder(source(c),'2026-10-27',false))).toEqual(['culte_semaine:1','culte_semaine:2']);// mardi
 expect(CULTES.filter(c=>garder(source(c),'2026-10-28',false))).toEqual([]);// mercredi
 expect(CULTES.filter(c=>garder(source(c),'2026-10-31',false))).toEqual(['culte_semaine:1']);// samedi
});

it('garde toujours un culte déjà déclaré et, sans planning, seulement ceux-là',()=>{
 expect(filtreCultesPrevus(config())(source('culte_dimanche:1'),'2026-10-26',true)).toBe(true);
 const sansPlanning=filtreCultesPrevus(null);
 expect(sansPlanning(source('culte_semaine:1'),'2026-10-28',false)).toBe(false);
 expect(sansPlanning(source('culte_semaine:1'),'2026-10-28',true)).toBe(true);
 expect(sansPlanning('RECETTE_HD_QUOTIDIEN_V1:coucher','2026-10-28',false)).toBe(true);
});

it('un fuseau de planning différent ne casse pas le suivi',()=>{
 const garder=filtreCultesPrevus(config([horaire({fuseau:'Europe/Paris'})]));
 expect(garder(source('culte_semaine:1'),'2026-10-28',false)).toBe(false);
 expect(garder(source('culte_semaine:1'),'2026-10-28',true)).toBe(true);
});

it('une semaine entièrement déclarée devient complète : 94 activités et non 112',()=>{
 const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const contenus:ContenuLecture[]=[],activites:ActiviteLecture[]=[],etats:EtatLecture[]=[];
 const garder=filtreCultesPrevus(config());
 let n=0;
 for(let jour=1;jour<=7;jour++){
  const content_id=`c${jour}`,date=new Date(Date.UTC(2026,9,25+jour)).toISOString().slice(0,10);
  contenus.push({content_id,programme_id:'HD',version:1,langue:'fr',jour,numero_message:1});
  for(const s of [...QUOTIDIENNES.map(h=>`RECETTE_HD_QUOTIDIEN_V1:${h}`),...CULTES.map(source)]){
   const activity_id=id(++n);
   activites.push({activity_id,content_id,type_activite:'action',consigne:s,obligatoire:true,note_source:s});
   // Le participant déclare tout ce que le serveur accepte ce jour-là.
   if(garder(s,date,false))etats.push({enrollment_id:'E',activity_id,etat:'realisee',aide_demandee:false});
  }
 }
 const inscription={enrollment_id:'E',programme_id:'HD',version:1,langue:'fr',date_debut:'2026-10-26'};
 const avant=semainesHabitudes(joursHabitudesLecture(inscription,7,contenus,activites,etats))[0]!;
 expect(avant).toMatchObject({total:112,realisees:94,journeesCompletes:0});
 const jours=joursHabitudesLecture(inscription,7,contenus,activites,etats,undefined,garder);
 expect(jours.map(j=>j.activites.length)).toEqual([13,13,14,13,14,13,14]);
 expect(jours.every(j=>j.bilan.journee==='realisee')).toBe(true);
 expect(semainesHabitudes(jours)[0]).toMatchObject({total:94,realisees:94,journeesCompletes:7});
});
