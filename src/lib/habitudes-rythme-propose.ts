import type {ModelePlanningHabitude} from './habitudes-planning';
/** Proposition FR issue du cahier des charges HD, section 4 et 5 (25.10.2026).
 * Configuration de préparation, sans publication ni programmation de rappels.
 */
const base={module_id:'HABITUDES_DEFIS',version:1,langue:'fr'};
const quotidiens:readonly [string,string,string][]=[
 ['reveil','Réveil','05:45'],['gratitude_matin','Gratitude du matin','05:50'],
 ['priere_matin','Prière du matin','06:00'],['bible_matin','Bible du matin','06:20'],
 ['exercice','Exercice adapté','06:45'],['lecture_pro','Lecture professionnelle','12:30'],
 ['priere_midi','Prière de midi','13:10'],['predication','Écoute d’une prédication','18:00'],
 ['lecture_personnelle','Développement personnel','20:00'],['bible_soir','Bible du soir','20:35'],
 ['gratitude_soir','Gratitude du soir','21:00'],['priere_soir','Prière du soir','21:10'],['coucher','Coucher','22:00'],
];
export const rythmeProposeHabitudes:readonly ModelePlanningHabitude[]=[
 ...quotidiens.map(([habit_key,libelle,heure_proposee])=>({...base,habit_key,libelle,heure_proposee,jours_iso:[1,2,3,4,5,6,7]})),
 {...base,habit_key:'culte_semaine',libelle:'Culte en semaine',heure_proposee:'18:30',jours_iso:[3,5]},
 {...base,habit_key:'culte_dimanche',libelle:'Culte du dimanche',heure_proposee:'09:00',jours_iso:[7]},
];
