import {useEffect,useState} from 'react';

export type Palette = 'ivoire'|'sable'|'sauge'|'argile'|'ardoise';
export type TailleTexte = 'petite'|'normale'|'grande'|'tres-grande';
export type PreferencesVisuelles = {palette:Palette;taille:TailleTexte};
const CLE='seneve:preferences-visuelles:v1';
const EVENEMENT='seneve:preferences-visuelles';
let temporaire:PreferencesVisuelles|null=null;
export const DEFAUT_VISUEL:PreferencesVisuelles={palette:'ivoire',taille:'normale'};
export const ECHELLES_TEXTE:Record<TailleTexte,number>={petite:0.9,normale:1,grande:1.125,'tres-grande':1.25};

function valider(v:unknown):PreferencesVisuelles {
  const p=v&&typeof v==='object'?v as Record<string,unknown>:{};
  return {palette:p.palette==='sable'||p.palette==='sauge'||p.palette==='argile'||p.palette==='ardoise'?p.palette:'ivoire',taille:p.taille==='petite'||p.taille==='grande'||p.taille==='tres-grande'?p.taille:'normale'};
}
export function lirePreferencesVisuelles():PreferencesVisuelles {
  if(temporaire)return {...temporaire};
  try{return valider(JSON.parse(localStorage.getItem(CLE)??'null'));}catch{return {...DEFAUT_VISUEL};}
}
export function appliquerPreferencesVisuelles(p:PreferencesVisuelles) {
  const valeur=valider(p);
  document.documentElement.dataset.palette=valeur.palette;
  document.documentElement.dataset.tailleTexte=valeur.taille;
  document.documentElement.style.setProperty('--texte-echelle',String(ECHELLES_TEXTE[valeur.taille]));
}
/** Préférences propres à ce navigateur, sans donnée de compte ni appel serveur. */
export function choisirPreferencesVisuelles(p:PreferencesVisuelles):boolean {
  const valeur=valider(p);let conserve=true;
  try{localStorage.setItem(CLE,JSON.stringify(valeur));temporaire=null;}catch{conserve=false;temporaire=valeur;}
  appliquerPreferencesVisuelles(valeur);
  window.dispatchEvent(new CustomEvent(EVENEMENT,{detail:valeur}));
  return conserve;
}
export function usePreferencesVisuelles() {
  const [preferences,setPreferences]=useState(lirePreferencesVisuelles);
  useEffect(()=>{const lire=(e:Event)=>setPreferences(valider((e as CustomEvent).detail));window.addEventListener(EVENEMENT,lire);return()=>window.removeEventListener(EVENEMENT,lire);},[]);
  return [preferences,choisirPreferencesVisuelles] as const;
}
export function suivrePreferencesVisuelles() {
  appliquerPreferencesVisuelles(lirePreferencesVisuelles());
  const actualiser=(e:StorageEvent)=>{if(e.key===CLE||e.key===null){temporaire=null;const p=lirePreferencesVisuelles();appliquerPreferencesVisuelles(p);window.dispatchEvent(new CustomEvent(EVENEMENT,{detail:p}));}};
  window.addEventListener('storage',actualiser);
  return()=>window.removeEventListener('storage',actualiser);
}
