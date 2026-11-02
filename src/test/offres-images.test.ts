import {expect,it} from 'vitest';
import {imageOffre} from '@/lib/offres-images';

it('seules les formations 30 et 90 jours reçoivent leur visuel Chariow, en français comme en anglais',()=>{
 for(const [id,prd] of <[string,string][]>[['FORMATION_30J_FR','prd_tzep7gqk'],['FORMATION_90J_FR','prd_644jfhtu'],['FORMATION_30J_EN','prd_lhpbe7w2'],['FORMATION_90J_EN','prd_9dpd5e43']])expect(imageOffre(id)?.src).toContain('illustrations/offres/'+prd+'-360.jpg');
 for(const id of ['LIVRE_PDF_FR','LIVRE_AUDIO_EN','ACCOMPAGNEMENT_30J_FR','ACCOMPAGNEMENT_90J_EN','CONTINUITE_MENSUEL_FR'])expect(imageOffre(id)).toBeNull();
});
