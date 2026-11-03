/** Images des offres : visuels verticaux Chariow pour les formations et accompagnements, couvertures du site pour le livre et Habitudes & Défis (03/11/2026 : toutes les offres). */
const CHARIOW:Record<string,[produit:string,hauteur:number]>={
 FORMATION_30J_FR:['prd_tzep7gqk',536],FORMATION_90J_FR:['prd_644jfhtu',508],
 FORMATION_30J_EN:['prd_lhpbe7w2',449],FORMATION_90J_EN:['prd_9dpd5e43',540],
 ACCOMPAGNEMENT_30J_FR:['prd_gh92snpf',508],ACCOMPAGNEMENT_90J_FR:['prd_nxxh7lut',508],
 ACCOMPAGNEMENT_30J_EN:['prd_chq1uan9',449],ACCOMPAGNEMENT_90J_EN:['prd_lwbim0c6',449],
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
