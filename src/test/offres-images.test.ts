import {expect,it} from 'vitest';
import {imageOffre} from '@/lib/offres-images';

it('chaque offre a son image : visuel Chariow pour formations et accompagnements, couverture pour le livre et Habitudes & Défis',()=>{
 for(const [id,prd] of <[string,string][]>[['FORMATION_30J_FR','prd_tzep7gqk'],['FORMATION_90J_FR','prd_644jfhtu'],['FORMATION_30J_EN','prd_lhpbe7w2'],['FORMATION_90J_EN','prd_9dpd5e43'],['ACCOMPAGNEMENT_30J_FR','prd_gh92snpf'],['ACCOMPAGNEMENT_90J_FR','prd_nxxh7lut'],['ACCOMPAGNEMENT_30J_EN','prd_chq1uan9'],['ACCOMPAGNEMENT_90J_EN','prd_lwbim0c6']])expect(imageOffre(id,'fr')?.src).toContain('illustrations/offres/'+prd+'-360.jpg');
 expect(imageOffre('LIVRE_PDF_FR','fr')?.src).toContain('couverture-livre-fr-v1-683.webp');expect(imageOffre('LIVRE_PAPIER_EN','en')?.src).toContain('couverture-livre-en-v1-683.webp');
 expect(imageOffre('CONTINUITE_MENSUEL_FR','fr')?.src).toContain('couverture-habitudes-fr-v1-683.webp');expect(imageOffre('CONTINUITE_MENSUEL_EN','en')?.src).toContain('couverture-habitudes-en-v1-683.webp');
 expect(imageOffre('OFFRE_INCONNUE','fr')).toBeNull();
});
