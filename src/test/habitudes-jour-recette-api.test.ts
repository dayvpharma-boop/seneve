import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({tables:{} as Record<string,unknown[]>,horaires:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:mocks.horaires}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'U1'}}},error:null})},from:(table:string)=>{const b:any={};b.select=()=>b;b.eq=(col:string,value:unknown)=>{b.filtres=[...(b.filtres??[]),[col,value]];return b;};b.lte=(col:string,value:number)=>{b.max=[col,value];return b;};b.gte=(col:string,value:number)=>{b.min=[col,value];return b;};b.order=()=>b;b.range=(de:number,fin:number)=>{b.tranche=[de,fin+1];return b;};b.in=(col:string,values:unknown[])=>{b.liste=[col,values];return b;};const rows=()=> (mocks.tables[table]??[]).filter((r:any)=>(b.filtres??[]).every(([k,v]:[string,unknown])=>r[k]===v)&&(!b.max||r[b.max[0]]<=b.max[1])&&(!b.min||r[b.min[0]]>=b.min[1])&&(!b.liste||b.liste[1].includes(r[b.liste[0]])));b.single=async()=>({data:rows()[0],error:null});b.then=(ok:any,ko:any)=>Promise.resolve({data:b.tranche?rows().slice(...b.tranche):rows(),error:null}).then(ok,ko);return b;}}}));
import {chargerJourRecette,chargerHistoriqueRecette} from '@/lib/habitudes-jour-recette';
beforeEach(()=>{
 const modeles=Array.from({length:13},(_,i)=>({module_id:'HD',version:1,langue:'fr',habit_key:`h${i}`,libelle:`Habitude ${i}`,jours_iso:[1,2,3,4,5,6,7],heure_proposee:'06:00'}));
 mocks.horaires.mockReset().mockResolvedValue({date_locale:'2026-10-26',fuseau:'Africa/Kinshasa',modeles,horaires:modeles.map(m=>({...m,participant_id:'P1',creneau_id:'1',heure_locale:'07:30',fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null}))});
 mocks.tables={enrollments:[{enrollment_id:'E1',participant_id:'P1',programme_id:'HD_RECETTE_INSCRIPTION_FR_20261026',version:1,langue:'fr',date_debut:'2026-10-26',etat:'active'}],contents:[{content_id:'C1',programme_id:'HD_RECETTE_INSCRIPTION_FR_20261026',version:1,langue:'fr',jour:1}],activities:modeles.map((m,i)=>({activity_id:`A${i}`,content_id:'C1',type_activite:'action',consigne:m.libelle,note_source:`RECETTE_HD_QUOTIDIEN_V1:${m.habit_key}`,obligatoire:true,critere_realisation:null})),activity_state:[{enrollment_id:'E1',activity_id:'A0',etat:'partielle',aide_demandee:false},{enrollment_id:'AUTRE',activity_id:'A1',etat:'realisee',aide_demandee:false}]};
 mocks.tables.activities!.push(...['culte_semaine:1','culte_semaine:2','culte_dimanche:1'].map((k,i)=>({activity_id:`CULTE${i}`,content_id:'C1',type_activite:'action',consigne:'Culte',note_source:`RECETTE_HD_CULTE_V1:${k}`,obligatoire:true,critere_realisation:null})));
});
it('associe les vrais identifiants aux horaires personnels et aux seuls états de cette inscription',async()=>{
 const d=await chargerJourRecette('E1','P1','2026-10-26');expect(d.activites).toHaveLength(13);expect(d.activites.every(a=>a.heure==='07:30')).toBe(true);expect(d.activites.find(a=>a.occurrence.occurrence_id==='A0')!.etat?.etat).toBe('partielle');expect(d.activites.find(a=>a.occurrence.occurrence_id==='A1')!.etat).toBeUndefined();
});
it('refuse une autre identité de participant',async()=>{await expect(chargerJourRecette('E1','P2','2026-10-26')).rejects.toThrow('Inscription hors recette');});
it('refuse de réutiliser la journée précédente',async()=>{await expect(chargerJourRecette('E1','P1','2026-10-27')).rejects.toThrow('Journée à actualiser');});
it('refuse un catalogue incomplet ou une correspondance ambiguë',async()=>{
 mocks.tables.activities!.shift();await expect(chargerJourRecette('E1','P1','2026-10-26')).rejects.toThrow('incomplet');
});

it('affiche deux cultes le même jour avec deux identifiants indépendants',async()=>{
 const h=await mocks.horaires();h.modeles.push({module_id:'HD',version:1,langue:'fr',habit_key:'culte_semaine',libelle:'Culte',jours_iso:[3,5],heure_proposee:'18:30'});
 h.horaires.push(...['18:00','20:00'].map((heure,i)=>({participant_id:'P1',module_id:'HD',version:1,langue:'fr',habit_key:'culte_semaine',creneau_id:`culte${i}`,heure_locale:heure,jours_iso:[1],fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null})));
 const d=await chargerJourRecette('E1','P1','2026-10-26');expect(d.activites).toHaveLength(15);const c=d.activites.filter(a=>a.consigne.startsWith('Culte'));expect(c.map(a=>a.heure)).toEqual(['18:00','20:00']);expect(new Set(c.map(a=>a.occurrence.occurrence_id)).size).toBe(2);
});
it('ne propose pas un culte hors du jour personnel, même si le modèle le proposait',async()=>{
 const h=await mocks.horaires();h.modeles.push({module_id:'HD',version:1,langue:'fr',habit_key:'culte_dimanche',libelle:'Culte',jours_iso:[1],heure_proposee:'09:00'});
 h.horaires.push({participant_id:'P1',module_id:'HD',version:1,langue:'fr',habit_key:'culte_dimanche',creneau_id:'culte',heure_locale:'10:00',jours_iso:[7],fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null});
 const d=await chargerJourRecette('E1','P1','2026-10-26');expect(d.activites).toHaveLength(13);expect(d.activites.some(a=>a.consigne.startsWith('Culte'))).toBe(false);
});

it('historique : exclut le futur et conserve les horaires valides de chaque journée',async()=>{
 const enr=mocks.tables.enrollments![0] as Record<string,unknown>;enr.date_debut='2026-10-25';
 const h=await mocks.horaires();h.horaires=h.horaires.flatMap((x:Record<string,unknown>)=>[{...x,valide_du:'2026-10-25',valide_au:'2026-10-25'},{...x,valide_du:'2026-10-26',valide_au:null,heure_locale:'08:00'}]);
 mocks.tables.contents!.push({content_id:'C2',programme_id:enr.programme_id,version:1,langue:'fr',jour:2},{content_id:'C3',programme_id:enr.programme_id,version:1,langue:'fr',jour:3});
 const originales=mocks.tables.activities! as Record<string,unknown>[];mocks.tables.activities=[...originales,...originales.map(x=>({...x,content_id:'C2',activity_id:String(x.activity_id)+'_J2'})),...originales.map(x=>({...x,content_id:'C3',activity_id:String(x.activity_id)+'_FUTUR'}))];
 const jours=await chargerHistoriqueRecette('E1','P1','2026-10-26');expect(jours.map(j=>j.date)).toEqual(['2026-10-25','2026-10-26']);expect(jours[0]!.activites.every(a=>a.heure==='07:30')).toBe(true);expect(jours[1]!.activites.every(a=>a.heure==='08:00')).toBe(true);expect(jours.flatMap(j=>j.activites).some(a=>a.occurrence.occurrence_id.includes('FUTUR'))).toBe(false);
});
it('historique : refuse un trou dans les journées publiées',async()=>{
 (mocks.tables.enrollments![0] as Record<string,unknown>).date_debut='2026-10-25';await expect(chargerHistoriqueRecette('E1','P1','2026-10-26')).rejects.toThrow('Historique incomplet');
});

it('mois 2 : le jour 31 lit sa propre journée publiée et seulement ses propres états',async()=>{
 const enr=mocks.tables.enrollments![0] as Record<string,unknown>;enr.programme_id='HABITUDES_DEFIS_30J_FR_V1';enr.date_debut='2026-09-26';
 mocks.tables.contents=[{content_id:'C1',programme_id:'HABITUDES_DEFIS_30J_FR_V1',version:1,langue:'fr',jour:1},{content_id:'C31',programme_id:'HABITUDES_DEFIS_30J_FR_V1',version:1,langue:'fr',jour:31}];
 const jour1=mocks.tables.activities! as Record<string,unknown>[];
 mocks.tables.activities=[...jour1,...jour1.map(x=>({...x,content_id:'C31',activity_id:String(x.activity_id)+'_J31'}))];
 const d=await chargerJourRecette('E1','P1','2026-10-26');
 expect(d.jour).toBe(31);expect(d.activites).toHaveLength(13);
 expect(d.activites.every(a=>a.occurrence.occurrence_id.endsWith('_J31'))).toBe(true);
 // L'état « partielle » du jour 1 (A0) ne déborde pas sur le jour 31.
 expect(d.activites.some(a=>a.etat)).toBe(false);
});
it('refuse un jour au-delà des six mois',async()=>{
 (mocks.tables.enrollments![0] as Record<string,unknown>).date_debut='2026-04-27';
 await expect(chargerJourRecette('E1','P1','2026-10-26')).rejects.toThrow('Jour hors parcours');
});
it('historique du mois 2 : seulement les journées du mois en cours',async()=>{
 const enr=mocks.tables.enrollments![0] as Record<string,unknown>;enr.programme_id='HABITUDES_DEFIS_30J_FR_V1';enr.date_debut='2026-09-25';
 mocks.tables.contents=[1,30,31,32].map(j=>({content_id:`C${j}`,programme_id:'HABITUDES_DEFIS_30J_FR_V1',version:1,langue:'fr',jour:j}));
 const jour1=mocks.tables.activities! as Record<string,unknown>[];
 mocks.tables.activities=[1,30,31,32].flatMap(j=>jour1.map(x=>({...x,content_id:`C${j}`,activity_id:`${x.activity_id}_J${j}`})));
 const h=await mocks.horaires();h.horaires=h.horaires.map((x:Record<string,unknown>)=>({...x,valide_du:'2026-09-25'}));
 const jours=await chargerHistoriqueRecette('E1','P1','2026-10-26');
 expect(jours.map(j=>j.jour)).toEqual([31,32]);expect(jours.map(j=>j.date)).toEqual(['2026-10-25','2026-10-26']);
});
