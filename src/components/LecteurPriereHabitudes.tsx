import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {amidahFr} from '@/data/amidah-fr';
import type {EtatOccurrence} from '@/lib/habitudes';
import type {ActiviteJourRecette} from '@/lib/habitudes-jour-recette';
import type {TransportProgression} from '@/lib/habitudes-api';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';
import './LecteurPriereHabitudes.css';

export function momentPriere(cle?:string):'matin'|'midi'|'soir'|null{
 return cle==='priere_matin'?'matin':cle==='priere_midi'?'midi':cle==='priere_soir'?'soir':null;
}
/** Le contexte vient de la journée vérifiée, jamais de paramètres de l'URL du lecteur public. */
export function LecteurPriereHabitudes({activite,userId,langue,transport,onConfirme,onFermer}:{activite:ActiviteJourRecette;userId:string;langue:string;transport:TransportProgression;onConfirme:(etat:EtatOccurrence)=>void;onFermer:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[taille,setTaille]=useState(21);
 const moment=momentPriere(activite.habit_key),titre=moment==='midi'?'Prière de midi':moment==='soir'?'Prière du soir':'Prière du matin';
 useEffect(()=>{const d=dialog.current;if(!d)return;const avant=document.activeElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return()=>{document.body.style.overflow=overflow;if(d.open&&typeof d.close==='function')d.close();if(avant instanceof HTMLElement&&avant.isConnected)avant.focus();};
 },[]);
 return createPortal(<dialog ref={dialog} className="hd-lecteur-priere" aria-label={titre} onCancel={e=>{e.preventDefault();onFermer();}}>
  <header className="ap-tete">
   <button type="button" onClick={onFermer} aria-label="Revenir à ma journée"><IconeHD nom="arrow_back"/></button>
   <h2>{titre}</h2>
   <div className="ap-tailles" role="group" aria-label="Taille du texte">
    <button type="button" aria-label="Diminuer la taille du texte" disabled={taille<=16} onClick={()=>setTaille(t=>Math.max(16,t-2))}>A−</button>
    <button type="button" aria-label="Augmenter la taille du texte" disabled={taille>=42} onClick={()=>setTaille(t=>Math.min(42,t+2))}>A+</button>
   </div>
  </header>
  <div className="ap-corps">
   <div className="ap-meta"><span><IconeHD nom="auto_stories"/> Amidah · texte français intégral</span><span><time>{activite.heure}</time> · Durée personnelle</span></div>
   <div className="ap-langues" aria-label="Langues de lecture"><span>Français</span><span aria-disabled="true">Phonétique <small>Bientôt</small></span><span aria-disabled="true">English <small>Bientôt</small></span></div>
   <p className="ap-information">{langue==='en'?'French reading. Movements and conditional passages are preserved. Only “J’ai prié” records this prayer.':'Gestes et passages conditionnels conservés. Lire ne valide aucune activité. Appuie sur « J’ai prié » seulement après ta prière.'}</p>
   <article className="ap-texte" lang="fr" aria-label="Texte intégral de l’Amidah" style={{fontSize:taille+'px'}}>{amidahFr.map((p,i)=><p key={i} className={'ap-'+p.type}>{p.texte}</p>)}</article>
   <p className="ap-source">Source : PDF « LA PRIERE DE LA AMIDAH en phonétique et en traduction française », hassidout.org.</p>
  </div>
  <DeclarationHabitude key={activite.occurrence.occurrence_id} variante="priere" userId={userId} occurrence={activite.occurrence} consigne={activite.consigne} critere={activite.critere} etat={activite.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={transport} onConfirme={onConfirme}/>
 </dialog>,document.body);
}
