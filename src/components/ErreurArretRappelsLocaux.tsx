import {useEffect,useState} from 'react';
import {arreterRappelsLocaux,rappelsLocauxDisponibles,CLE_ERREUR_ARRET_LOCAL} from '@/lib/rappels-locaux';
export function ErreurArretRappelsLocaux(){
 const [erreur,setErreur]=useState(()=>{try{return localStorage.getItem(CLE_ERREUR_ARRET_LOCAL)==='1';}catch{return false;}}),[busy,setBusy]=useState(false);
 useEffect(()=>{const montrer=()=>setErreur(true);window.addEventListener('seneve:rappels-locaux-erreur',montrer);return()=>window.removeEventListener('seneve:rappels-locaux-erreur',montrer);},[]);
 if(!rappelsLocauxDisponibles()||!erreur)return null;
 return <aside role="alert" style={{position:'fixed',top:8,left:8,right:8,zIndex:9999,padding:16,background:'#fff3d8',color:'#352a13'}}>
  <p>L’arrêt des rappels locaux n’est pas confirmé. Vérifie les notifications de SÉNEVÉ dans les réglages du téléphone.</p>
  <button type="button" disabled={busy} onClick={()=>{setBusy(true);void arreterRappelsLocaux().then(()=>setErreur(false)).catch(()=>{}).finally(()=>setBusy(false));}}>Réessayer d’arrêter les rappels</button>
 </aside>;
}

