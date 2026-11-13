/** Images des offres : visuels verticaux Chariow pour les formations et accompagnements, couvertures du site pour le livre et Habitudes & Défis (03/11/2026 : toutes les offres). */
const CHARIOW:Record<string,[produit:string,hauteur:number]>={
 FORMATION_30J_FR:['prd_tzep7gqk',536],FORMATION_90J_FR:['prd_644jfhtu',508],
 FORMATION_30J_EN:['prd_lhpbe7w2',449],FORMATION_90J_EN:['prd_9dpd5e43',540],
 ACCOMPAGNEMENT_30J_FR:['prd_gh92snpf',508],ACCOMPAGNEMENT_90J_FR:['prd_nxxh7lut',508],
 ACCOMPAGNEMENT_30J_EN:['prd_chq1uan9',449],ACCOMPAGNEMENT_90J_EN:['prd_lwbim0c6',449],
 // Abonnements (visuels créés le 12/11/2026, 360 × 450).
 ABONNEMENT_SENEVE_MOIS_FR:['prd_96ryvw31',450],ABONNEMENT_SENEVE_AN_FR:['prd_qiurdmp9',450],
 ABONNEMENT_PLUS_MOIS_FR:['prd_h3vrqqmd',450],ABONNEMENT_PLUS_AN_FR:['prd_xe7ztah4',450],
 ABONNEMENT_SENEVE_MOIS_EN:['prd_m7ohegvs',450],ABONNEMENT_SENEVE_AN_EN:['prd_b9gl6kss',450],
 ABONNEMENT_PLUS_MOIS_EN:['prd_akmxiqk5',450],ABONNEMENT_PLUS_AN_EN:['prd_suk1i66g',450],
 // Accompagnement (visuels créés le 13/11/2026, branchés au fur et à mesure que Dr Justin crée les produits).
 ABONNEMENT_ACCOMP_MOIS_FR:['prd_d0s7l40t',450],ABONNEMENT_ACCOMP_AN_FR:['prd_97x0dego',450],
 ABONNEMENT_ACCOMP_MOIS_EN:['prd_zsafn1in',450],ABONNEMENT_ACCOMP_AN_EN:['prd_64b4smae',450],
};
export type ImageOffre={src:string;srcSet?:string;largeur:number;hauteur:number};
export function imageOffre(offreId:string,langue:string):ImageOffre|null{
 const base=`${import.meta.env.BASE_URL}illustrations/`,l=langue==='en'?'en':'fr';
 const c=CHARIOW[offreId];
 if(c)return{src:`${base}offres/${c[0]}-360.jpg`,largeur:360,hauteur:c[1]};
 const couverture=(ouvrage:'livre'|'habitudes'):ImageOffre=>({src:`${base}couverture-${ouvrage}-${l}-v1-683.webp`,srcSet:`${base}couverture-${ouvrage}-${l}-v1-200.webp 200w, ${base}couverture-${ouvrage}-${l}-v1-683.webp 683w`,largeur:683,hauteur:1024});
 if(offreId.startsWith('LIVRE_'))return couverture('livre');
 if(offreId.startsWith('CONTINUITE_')||offreId.startsWith('HABITUDES_DEFIS_'))return couverture('habitudes');
 return null;
}
