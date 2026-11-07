/** Dimanche, jour de repos (décision de Dr Justin, 03/11/2026, option A pour tout le monde).
 * Restent comptés : culte du dimanche, prières du matin et du soir, gratitudes, Bible du matin, dîme.
 * Deviennent facultatifs (affichés, cochables, jamais comptés comme oubliés) : les habitudes ci-dessous.
 * Les rappels de celles marquées « en pause » ne sonnent pas le dimanche (seneve_060). */
export const EN_PAUSE_LE_DIMANCHE=['reveil','coucher','exercice','lecture_pro','predication','lecture_personnelle'] as const;
export const FACULTATIVES_LE_DIMANCHE:readonly string[]=[...EN_PAUSE_LE_DIMANCHE,'priere_midi','bible_soir'];
const QUOTIDIEN=/^RECETTE_HD_QUOTIDIEN_V[12]:([a-z_]+)$/;

export function estDimanche(dateLocale:string){return new Date(dateLocale+'T12:00:00Z').getUTCDay()===0;}
/** Une activité facultative le dimanche ne compte pas parmi les activités requises de la journée. */
export function requiseCeJour(noteSource:string|null|undefined,dateLocale:string,obligatoire:boolean){
 if(!obligatoire||!estDimanche(dateLocale))return obligatoire;
 const habit=QUOTIDIEN.exec(noteSource??'')?.[1];
 return !(habit&&FACULTATIVES_LE_DIMANCHE.includes(habit));
}
