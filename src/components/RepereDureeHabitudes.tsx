/** Repères du cahier Habitudes & Défis ; aucun chronomètre ni validation automatique. */
export function RepereDureeHabitudes({habitKey,langue,dansCarte=false}:{habitKey?:string;langue:string;dansCarte?:boolean}){
 const en=langue==='en';
 const texte=habitKey==='exercice'?(en?'Suggested time: 10 to 15 minutes, adapted to your abilities.':'Repère : 10 à 15 minutes d’exercice adapté, selon tes possibilités.'):
  ['lecture_pro','predication','lecture_personnelle'].includes(habitKey??'')?(en?'Suggested time: 30 minutes a day. Record only what you actually did.':'Repère : 30 minutes par jour. Déclare uniquement ce que tu as réellement fait.'):null;
 return texte?<p className={dansCarte?'font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant':'px-2 pt-1 pb-2 font-hd-body-sm text-hd-body-sm text-hd-on-surface-variant'}>{texte}</p>:null;
}
/** Vrai si l'activité a un repère de durée (pour n'ajouter aucun bloc vide dans la carte). */
export function aRepereDuree(habitKey?:string){return ['exercice','lecture_pro','predication','lecture_personnelle'].includes(habitKey??'');}
