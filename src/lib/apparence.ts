import {useEffect,useState} from 'react';
export type Apparence='systeme'|'clair'|'sombre';
const CLE='seneve:apparence';
export function lireApparence():Apparence{try{const v=localStorage.getItem(CLE);return v==='clair'||v==='sombre'?v:'systeme';}catch{return 'systeme';}}
// Barre du haut d'Android (Chrome et appli installée) : elle suit l'apparence, sinon elle restait claire en mode sombre (03/11/2026).
const BARRE={clair:'#F5F7FE',sombre:'#121212'};
export function appliquerApparence(v:Apparence){const sombre=v==='sombre'||(v==='systeme'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.apparence=sombre?'sombre':'clair';document.documentElement.style.colorScheme=sombre?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',sombre?BARRE.sombre:BARRE.clair);}
export function choisirApparence(v:Apparence){try{localStorage.setItem(CLE,v);}catch{/* Le choix reste actif pour cette page. */}appliquerApparence(v);window.dispatchEvent(new CustomEvent('seneve:apparence',{detail:v}));}
export function useApparence(){const[v,setV]=useState(lireApparence);useEffect(()=>{const f=(e:Event)=>setV((e as CustomEvent<Apparence>).detail);window.addEventListener('seneve:apparence',f);return()=>window.removeEventListener('seneve:apparence',f);},[]);return[v,choisirApparence] as const;}
export function suivreApparence(){appliquerApparence(lireApparence());const media=window.matchMedia('(prefers-color-scheme: dark)');const f=()=>appliquerApparence(lireApparence());media.addEventListener('change',f);const stockage=(e:StorageEvent)=>{if(e.key===CLE){f();window.dispatchEvent(new CustomEvent('seneve:apparence',{detail:lireApparence()}));}};window.addEventListener('storage',stockage);return()=>{media.removeEventListener('change',f);window.removeEventListener('storage',stockage);};}
