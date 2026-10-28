import {expect,it} from 'vitest';
import {contexteBilanHabitudes,cleBrouillonBilan} from '@/lib/habitudes-journal-bilan';
const id='20000000-0000-4000-8000-000000000001';
it('sépare les brouillons par inscription, type et période',()=>{
 const b=contexteBilanHabitudes(new URLSearchParams(`depuis=habitudes&bilan=mois&periode=2&inscription=${id}`))!;expect(b).toEqual({type:'mois',numero:2,inscription:id});expect(cleBrouillonBilan(b)).not.toBe(cleBrouillonBilan({...b,type:'semaine'}));expect(cleBrouillonBilan(b)).not.toBe(cleBrouillonBilan({...b,numero:3}));
});
it.each(['bilan=mois&periode=7','bilan=semaine&periode=27','bilan=mois&periode=0','bilan=mois&periode=NaN','bilan=autre&periode=1','bilan=mois&periode=1&activite=X','bilan=mois&periode=1&gratitude=matin'])('ignore le contexte incohérent %s',query=>{
 expect(contexteBilanHabitudes(new URLSearchParams(`depuis=habitudes&inscription=${id}&${query}`))).toBeNull();
});
