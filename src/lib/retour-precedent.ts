import type {MouseEvent} from 'react';

/** Bouton « Retour » (demande de Dr Justin, 03/11/2026) : revenir à la page d'où l'on vient dans SÉNEVÉ.
 * Le lien garde sa page de secours (son href) : elle sert seulement quand on arrive directement
 * (lien partagé, nouvel onglet), car l'historique de l'app est alors vide (idx 0 de React Router). */
export function retourPrecedent(e:MouseEvent<HTMLElement>){
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const idx=(window.history.state as {idx?:unknown}|null)?.idx;
 if(typeof idx==='number'&&idx>0){e.preventDefault();window.history.back();}
}
