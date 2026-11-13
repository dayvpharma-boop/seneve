/** Images des offres : visuels verticaux Chariow pour les formations et accompagnements, couvertures du site pour le livre et Habitudes & Défis (03/11/2026 : toutes les offres). */
const CHARIOW:Record<string,[produit:string,largeur:number,hauteur:number]>={
 FORMATION_30J_FR:['prd_tzep7gqk',360,536],FORMATION_90J_FR:['prd_644jfhtu',360,508],
 FORMATION_30J_EN:['prd_lhpbe7w2',360,449],FORMATION_90J_EN:['prd_9dpd5e43',360,540],
 ACCOMPAGNEMENT_30J_FR:['prd_gh92snpf',360,508],ACCOMPAGNEMENT_90J_FR:['prd_nxxh7lut',360,508],
 ACCOMPAGNEMENT_30J_EN:['prd_chq1uan9',360,449],ACCOMPAGNEMENT_90J_EN:['prd_lwbim0c6',360,449],
 // Abonnements (visuels créés le 12-13/11/2026, 1080 × 1350 — repris en grand le 13/11 : la version 360 px
 // rendait flou au zoom sur la page « Mon abonnement »).
 ABONNEMENT_SENEVE_MOIS_FR:['prd_96ryvw31',1080,1350],ABONNEMENT_SENEVE_AN_FR:['prd_qiurdmp9',1080,1350],
 ABONNEMENT_PLUS_MOIS_FR:['prd_h3vrqqmd',1080,1350],ABONNEMENT_PLUS_AN_FR:['prd_xe7ztah4',1080,1350],
 ABONNEMENT_SENEVE_MOIS_EN:['prd_m7ohegvs',1080,1350],ABONNEMENT_SENEVE_AN_EN:['prd_b9gl6kss',1080,1350],
 ABONNEMENT_PLUS_MOIS_EN:['prd_akmxiqk5',1080,1350],ABONNEMENT_PLUS_AN_EN:['prd_suk1i66g',1080,1350],
 ABONNEMENT_ACCOMP_MOIS_FR:['prd_d0s7l40t',1080,1350],ABONNEMENT_ACCOMP_AN_FR:['prd_97x0dego',1080,1350],
 ABONNEMENT_ACCOMP_MOIS_EN:['prd_zsafn1in',1080,1350],ABONNEMENT_ACCOMP_AN_EN:['prd_64b4smae',1080,1350],
};
export type ImageOffre={src:string;srcSet?:string;largeur:number;hauteur:number};
export function imageOffre(offreId:string,langue:string):ImageOffre|null{
 const base=`${import.meta.env.BASE_URL}illustrations/`,l=langue==='en'?'en':'fr';
 const c=CHARIOW[offreId];
 if(c)return{src:`${base}offres/${c[0]}-${c[1]}.jpg`,largeur:c[1],hauteur:c[2]};
 const couverture=(ouvrage:'livre'|'habitudes'):ImageOffre=>({src:`${base}couverture-${ouvrage}-${l}-v1-683.webp`,srcSet:`${base}couverture-${ouvrage}-${l}-v1-200.webp 200w, ${base}couverture-${ouvrage}-${l}-v1-683.webp 683w`,largeur:683,hauteur:1024});
 if(offreId.startsWith('LIVRE_'))return couverture('livre');
 if(offreId.startsWith('CONTINUITE_')||offreId.startsWith('HABITUDES_DEFIS_'))return couverture('habitudes');
 return null;
}
