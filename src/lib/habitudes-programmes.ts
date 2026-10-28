/** Programmes Habitudes & Défis publiés, par langue (anglais ajouté le 28/10/2026, mêmes 181 jours et mêmes activités). */
export const PROGRAMMES_HD_REELS={fr:'HABITUDES_DEFIS_30J_FR_V1',en:'HABITUDES_DEFIS_30J_EN_V1'} as const;
export const PROGRAMME_HD_RECETTE='HD_RECETTE_INSCRIPTION_FR_20261026';
const REELS:readonly string[]=Object.values(PROGRAMMES_HD_REELS);
export const estProgrammeHdReel=(programmeId:string)=>REELS.includes(programmeId);
/** Programme lu par les écrans HD : essai technique (français) ou programme réel, dans la langue de l'inscription. */
export const programmeHdLisible=(programmeId:string,langue:string)=>
 programmeId===PROGRAMME_HD_RECETTE?langue==='fr':PROGRAMMES_HD_REELS[langue as keyof typeof PROGRAMMES_HD_REELS]===programmeId;
