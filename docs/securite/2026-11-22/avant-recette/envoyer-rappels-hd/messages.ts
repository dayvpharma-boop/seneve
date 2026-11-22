/** Libellés publics uniquement : jamais de journal, titre personnel ni compteur privé. */
const NOMS:Record<string,readonly [string,string]>={
 reveil:['Réveil','Wake up'],gratitude_matin:['Gratitude du matin','Morning gratitude'],
 priere_matin:['Prière du matin','Morning prayer'],bible_matin:['Bible du matin','Morning Bible reading'],
 exercice:['Exercice doux','Gentle exercise'],lecture_pro:['Lecture professionnelle','Professional reading'],
 priere_midi:['Prière de midi','Midday prayer'],predication:['Écoute d’une prédication','Listen to a sermon'],
 lecture_personnelle:['Développement personnel','Personal development reading'],bible_soir:['Bible du soir','Evening Bible reading'],
 gratitude_soir:['Gratitude du soir','Evening gratitude'],priere_soir:['Prière du soir','Evening prayer'],
 coucher:['Coucher','Bedtime'],culte_semaine:['Culte en semaine','Weekday worship'],culte_dimanche:['Culte du dimanche','Sunday worship']
};
export function messageRappel(habitKey:unknown,langue:unknown,relance:unknown){
 const en=langue==='en',nom=typeof habitKey==='string'?NOMS[habitKey]?.[en?1:0]:undefined;
 const titre=nom??(en?'Scheduled activity':'Activité prévue');
 return {title:`SÉNEVÉ · ${titre}`,body:relance===true
  ?en?`${titre} is still waiting. Complete the activity or choose “Skip for today”.`:`${titre} reste à faire. Réalise l’activité ou choisis « Ignorer pour aujourd’hui ».`
  :en?`It’s time for: ${titre}. Open your activity when you’re ready.`:`C’est l’heure : ${titre}. Ouvre ton activité quand tu es prêt.`};
}
