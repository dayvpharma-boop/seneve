import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({tables:{} as Record<string,unknown[]>,horaires:vi.fn()}));
vi.mock('@/lib/habitudes-horaires-api',()=>({chargerHorairesHabitudes:mocks.horaires}));
vi.mock('@/lib/supabase',()=>({supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'U1'}}},error:null})},from:(table:string)=>{const b:any={};b.select=()=>b;b.eq=(col:string,value:unknown)=>{b.filtres=[...(b.filtres??[]),[col,value]];return b;};const rows=()=> (mocks.tables[table]??[]).filter((r:any)=>(b.filtres??[]).every(([k,v]:[string,unknown])=>r[k]===v));b.single=async()=>({data:rows()[0],error:null});b.then=(ok:any,ko:any)=>Promise.resolve({data:rows(),error:null}).then(ok,ko);return b;}}}));
import {chargerJourRecette} from '@/lib/habitudes-jour-recette';
beforeEach(()=>{
 const modeles=Array.from({length:13},(_,i)=>({module_id:'HD',version:1,langue:'fr',habit_key:`h${i}`,libelle:`Habitude ${i}`,jours_iso:[1,2,3,4,5,6,7],heure_proposee:'06:00'}));
 mocks.horaires.mockReset().mockResolvedValue({date_locale:'2026-10-26',fuseau:'Africa/Kinshasa',modeles,horaires:modeles.map(m=>({...m,participant_id:'P1',creneau_id:'1',heure_locale:'07:30',fuseau:'Africa/Kinshasa',valide_du:'2026-10-26',valide_au:null}))});
 mocks.tables={enrollments:[{enrollment_id:'E1',participant_id:'P1',programme_id:'HD_RECETTE_INSCRIPTION_FR_20261026',version:1,langue:'fr',date_debut:'2026-10-26',etat:'active'}],contents:[{content_id:'C1',programme_id:'HD_RECETTE_INSCRIPTION_FR_20261026',version:1,langue:'fr',jour:1}],activities:modeles.map((m,i)=>({activity_id:`A${i}`,content_id:'C1',type_activite:'action',consigne:m.libelle,note_source:`RECETTE_HD_QUOTIDIEN_V1:${m.habit_key}`,obligatoire:true,critere_realisation:null})),activity_state:[{enrollment_id:'E1',activity_id:'A0',etat:'partielle',aide_demandee:false},{enrollment_id:'AUTRE',activity_id:'A1',etat:'realisee',aide_demandee:false}]};
});
it('associe les vrais identifiants aux horaires personnels et aux seuls états de cette inscription',async()=>{
 const d=await chargerJourRecette('E1','P1','2026-10-26');expect(d.activites).toHaveLength(13);expect(d.activites.every(a=>a.heure==='07:30')).toBe(true);expect(d.activites.find(a=>a.occurrence.occurrence_id==='A0')!.etat?.etat).toBe('partielle');expect(d.activites.find(a=>a.occurrence.occurrence_id==='A1')!.etat).toBeUndefined();
});
it('refuse une autre identité de participant',async()=>{await expect(chargerJourRecette('E1','P2','2026-10-26')).rejects.toThrow('Inscription hors recette');});
it('refuse de réutiliser la journée précédente',async()=>{await expect(chargerJourRecette('E1','P1','2026-10-27')).rejects.toThrow('Journée à actualiser');});
it('refuse un catalogue incomplet ou une correspondance ambiguë',async()=>{
 mocks.tables.activities!.pop();await expect(chargerJourRecette('E1','P1','2026-10-26')).rejects.toThrow('incomplet');
});
