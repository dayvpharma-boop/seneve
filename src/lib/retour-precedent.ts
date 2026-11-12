import type {MouseEvent} from 'react';

/** Bouton « Retour » (demande de Dr Justin, 03/11/2026) : revenir à la page d'où l'on vient dans SÉNEVÉ.
 * Le lien garde sa page de secours (son href) : elle sert seulement quand on arrive directement
 * (lien partagé, nouvel onglet), car l'historique de l'app est alors vide (idx 0 de React Router).
 *
 * 12/11/2026 : après un rechargement complet (nouvelle version publiée), l'historique de l'app repart de zéro
 * et « Retour » ramenait toujours à Aujourd'hui. Les pages visitées sont donc aussi notées pour l'onglet
 * (sessionStorage, effacé à la fermeture) : « Retour » ramène à la page précédente même après un rechargement. */
const CLE='seneve:pages-visitees';
const MAX=20;
// La langue (?lang=en) est remise par GarderLangue : elle ne compte pas pour reconnaître une page.
const sansLangue=(chemin:string,recherche:string)=>{const q=new URLSearchParams(recherche);q.delete('lang');const r=q.toString();return chemin+(r?'?'+r:'');};
const ici=()=>sansLangue(window.location.pathname,window.location.search);

function lire():string[]{
 try{const v=JSON.parse(sessionStorage.getItem(CLE)??'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];}catch{return [];}
}
function ecrire(pages:string[]){try{sessionStorage.setItem(CLE,JSON.stringify(pages.slice(-MAX)));}catch{/* stockage indisponible */}}

/** À appeler à chaque changement de page. Un retour en arrière retire la dernière page de la liste. */
export function noterPage(page=ici()){
 const pages=lire();
 if(pages.at(-1)===page)return;
 if(pages.at(-2)===page){pages.pop();ecrire(pages);return;}
 pages.push(page);ecrire(pages);
}

/** Page visitée juste avant la page actuelle, s'il y en a une. */
export function pagePrecedente(page=ici()):string|null{
 const pages=lire();
 return pages.at(-1)===page&&pages.length>1?pages.at(-2)??null:null;
}

export function retourPrecedent(e:MouseEvent<HTMLElement>){
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
 const idx=(window.history.state as {idx?:unknown}|null)?.idx;
 if(typeof idx==='number'&&idx>0){e.preventDefault();window.history.back();return;}
 // Historique vide (arrivée directe ou rechargement) : la page précédente notée pour cet onglet, sinon le lien de secours.
 const avant=pagePrecedente();
 if(!avant)return;
 e.preventDefault();
 window.history.replaceState({usr:null,key:'retour',idx:0},'',avant);
 window.dispatchEvent(new PopStateEvent('popstate',{state:window.history.state}));
}
