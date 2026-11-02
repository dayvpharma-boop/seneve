/** Visuels Chariow des formations 30 et 90 jours, affichés sur leur carte d’offre (demande du 03/11/2026 : les formations seulement). */
const FORMATIONS:Record<string,[produit:string,hauteur:number]>={
 FORMATION_30J_FR:['prd_tzep7gqk',536],FORMATION_90J_FR:['prd_644jfhtu',508],
 FORMATION_30J_EN:['prd_lhpbe7w2',449],FORMATION_90J_EN:['prd_9dpd5e43',540],
};
export type ImageOffre={src:string;largeur:number;hauteur:number};
export function imageOffre(offreId:string):ImageOffre|null{
 const f=FORMATIONS[offreId];
 return f?{src:`${import.meta.env.BASE_URL}illustrations/offres/${f[0]}-360.jpg`,largeur:360,hauteur:f[1]}:null;
}
