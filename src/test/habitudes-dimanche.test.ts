import {expect,it} from 'vitest';
import {estDimanche,requiseCeJour} from '@/lib/habitudes-dimanche';
import {bilanHabitudes} from '@/lib/habitudes';

// Dimanche, jour de repos (décision de Dr Justin, 03/11/2026, option A).
const q=(h:string)=>`RECETTE_HD_QUOTIDIEN_V1:${h}`;
it('le dimanche, seules les habitudes essentielles restent requises',()=>{
 expect(estDimanche('2026-11-08')).toBe(true);expect(estDimanche('2026-11-09')).toBe(false);
 for(const h of ['priere_matin','priere_soir','gratitude_matin','gratitude_soir','bible_matin'])expect(requiseCeJour(q(h),'2026-11-08',true)).toBe(true);
 for(const h of ['reveil','coucher','exercice','lecture_pro','predication','lecture_personnelle','priere_midi','bible_soir'])expect(requiseCeJour(q(h),'2026-11-08',true)).toBe(false);
 expect(requiseCeJour('RECETTE_HD_CULTE_V1:culte_dimanche:1','2026-11-08',true)).toBe(true);
 expect(requiseCeJour('RECETTE_HD_DIME_V1:dime','2026-11-08',true)).toBe(true);
});
it('en semaine, rien ne change',()=>{
 for(const h of ['reveil','exercice','priere_midi','bible_soir'])expect(requiseCeJour(q(h),'2026-11-09',true)).toBe(true);
 expect(requiseCeJour(q('exercice'),'2026-11-08',false)).toBe(false);
});
it('un dimanche où seules les habitudes essentielles sont faites est une journée complète',()=>{
 const ctx={enrollment_id:'E',version:1,date_locale:'2026-11-08'};
 const habitudes=['priere_matin','priere_soir','exercice','lecture_pro'];
 const occ=habitudes.map((h,i)=>({occurrence_id:`o${i}`,enrollment_id:'E',version:1,date_locale:'2026-11-08',requise:requiseCeJour(q(h),'2026-11-08',true)}));
 const etats=occ.slice(0,2).map(o=>({...o,etat:'realisee' as const,aide_demandee:false,synchronisation:'synchronise' as const}));
 expect(bilanHabitudes(ctx,occ,etats).journee).toBe('realisee');
});
