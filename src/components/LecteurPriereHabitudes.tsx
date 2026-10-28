import {cleReperePriere,lireReperePriere,placerReperePriere,retirerReperePriere} from '@/lib/habitudes-priere-reprise';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {amidahFr} from '@/data/amidah-fr';
import {amidahEn} from '@/data/amidah-en';
import type {EtatOccurrence} from '@/lib/habitudes';
import type {ActiviteJourRecette} from '@/lib/habitudes-jour-recette';
import type {TransportProgression} from '@/lib/habitudes-api';
import {DeclarationHabitude} from './DeclarationHabitude';
import {IconeHD} from './IconeHabitudes';
import './LecteurPriereHabitudes.css';

export function momentPriere(cle?:string):'matin'|'midi'|'soir'|null{
 return cle==='priere_matin'?'matin':cle==='priere_midi'?'midi':cle==='priere_soir'?'soir':null;
}
/** Le contexte vient de la journée vérifiée, jamais de paramètres de l'URL du lecteur public.
 * Texte anglais validé le 28/10/2026 : mêmes paragraphes que le français, le repère vaut pour les deux langues. */
export function LecteurPriereHabitudes({activite,userId,langue,transport,onConfirme,onFermer}:{activite:ActiviteJourRecette;userId:string;langue:string;transport:TransportProgression;onConfirme:(etat:EtatOccurrence)=>void;onFermer:()=>void}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [langueTexte,setLangueTexte]=useState<'fr'|'en'>(en?'en':'fr');
 const amidah=langueTexte==='en'?amidahEn:amidahFr;
 const dialog=useRef<HTMLDialogElement>(null),[taille,setTaille]=useState(21);
 const corps=useRef<HTMLDivElement>(null),texte=useRef<HTMLElement>(null),barreRepere=useRef<HTMLElement>(null);
 const cleRepere=cleReperePriere(userId,activite.occurrence);
 const [signet,setSignet]=useState(()=>({cle:cleRepere,index:lireReperePriere(cleRepere,amidahFr.length)}));
 const [messageRepere,setMessageRepere]=useState('');
 const repere=signet.cle===cleRepere?signet.index:null;
 useEffect(()=>{setSignet({cle:cleRepere,index:lireReperePriere(cleRepere,amidahFr.length)});setMessageRepere('');},[cleRepere]);
 function placerRepere(){
  const passages=Array.from(texte.current?.querySelectorAll<HTMLElement>('[data-amidah-paragraphe]')??[]);
  if(!corps.current||!passages.length)return;
  const seuil=corps.current.getBoundingClientRect().top+(barreRepere.current?.getBoundingClientRect().height??0)+12;
  const premier=passages.findIndex(p=>p.getBoundingClientRect().bottom>seuil),index=premier<0?passages.length-1:premier;
  try{placerReperePriere(cleRepere,index,amidahFr.length);setSignet({cle:cleRepere,index});setMessageRepere(l('Repère placé.','Bookmark placed.'));}
  catch{setMessageRepere(l('Le repère n’a pas pu être conservé. Réessaie.','The bookmark could not be kept. Try again.'));}
 }
 function reprendre(){
  if(repere===null||!corps.current)return;
  const passage=texte.current?.querySelector<HTMLElement>(`[data-amidah-paragraphe="${repere}"]`);
  if(!passage)return;
  const top=corps.current.scrollTop+passage.getBoundingClientRect().top-corps.current.getBoundingClientRect().top-(barreRepere.current?.getBoundingClientRect().height??0)-16;
  corps.current.scrollTo({top:Math.max(0,top),behavior:'auto'});passage.focus({preventScroll:true});
 }
 function effacerRepere(){try{retirerReperePriere(cleRepere);setSignet({cle:cleRepere,index:null});setMessageRepere(l('Repère effacé.','Bookmark removed.'));}catch{setMessageRepere(l('Le repère n’a pas pu être effacé. Réessaie.','The bookmark could not be removed. Try again.'));}}
 const moment=momentPriere(activite.habit_key),titre=moment==='midi'?l('Prière de midi','Midday prayer'):moment==='soir'?l('Prière du soir','Evening prayer'):l('Prière du matin','Morning prayer');
 useEffect(()=>{const d=dialog.current;if(!d)return;const avant=document.activeElement;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
  return()=>{document.body.style.overflow=overflow;if(d.open&&typeof d.close==='function')d.close();if(avant instanceof HTMLElement&&avant.isConnected)avant.focus();};
 },[]);
 const ongletLangue=(code:'fr'|'en',nom:string)=><button type="button" aria-pressed={langueTexte===code} onClick={()=>setLangueTexte(code)}>{nom}</button>;
 return createPortal(<dialog ref={dialog} className="hd-lecteur-priere" aria-label={titre} onCancel={e=>{e.preventDefault();onFermer();}}>
  <header className="ap-tete">
   <button type="button" onClick={onFermer} aria-label={l('Revenir à ma journée','Back to my day')}><IconeHD nom="arrow_back"/></button>
   <h2>{titre}</h2>
   <div className="ap-tailles" role="group" aria-label={l('Taille du texte','Text size')}>
    <button type="button" aria-label={l('Diminuer la taille du texte','Decrease text size')} disabled={taille<=16} onClick={()=>setTaille(t=>Math.max(16,t-2))}>A−</button>
    <button type="button" aria-label={l('Augmenter la taille du texte','Increase text size')} disabled={taille>=42} onClick={()=>setTaille(t=>Math.min(42,t+2))}>A+</button>
   </div>
  </header>
  <div className="ap-corps" ref={corps}>
   <div className="ap-meta"><span><IconeHD nom="auto_stories"/> {langueTexte==='en'?l('Amidah · texte anglais intégral','Amidah · full English text'):l('Amidah · texte français intégral','Amidah · full French text')}</span><span><time>{activite.heure}</time> · {l('Durée personnelle','Your own pace')}</span></div>
   <div className="ap-langues" role="group" aria-label={l('Langues de lecture','Reading languages')}>{ongletLangue('fr','Français')}<span aria-disabled="true">{l('Phonétique','Phonetic')} <small>{l('Bientôt','Soon')}</small></span>{ongletLangue('en','English')}</div>
   <p className="ap-information">{l('Gestes et passages conditionnels conservés. Lire ne valide aucune activité. Appuie sur « J’ai prié » seulement après ta prière.','Movements and conditional passages are preserved. Reading completes nothing. Press “I prayed” only after your prayer.')}</p>
   <section className="ap-signets" ref={barreRepere} aria-label={l('Repère de lecture','Reading bookmark')}>
    <div className="ap-commandes-repere">
     <button type="button" onClick={placerRepere}><IconeHD nom="bookmark"/>{l('Placer un repère ici','Place a bookmark here')}</button>
     <button type="button" onClick={reprendre} disabled={repere===null}>{l('Reprendre','Resume')}</button>
     {repere!==null&&<button type="button" onClick={effacerRepere}>{l('Effacer le repère','Remove the bookmark')}</button>}
    </div>
    <p role="status">{messageRepere||l('Conservé dans cet onglet jusqu’à sa fermeture.','Kept in this tab until it is closed.')}</p>
    {repere!==null&&<small>{l('Repère','Bookmark')} : « {amidah[repere]!.texte.slice(0,90)}{amidah[repere]!.texte.length>90?'…':''} »</small>}
   </section>
   <article ref={texte} className="ap-texte" lang={langueTexte} aria-label={l('Texte intégral de l’Amidah','Full text of the Amidah')} style={{fontSize:taille+'px'}}>{amidah.map((p,i)=><p key={i} data-amidah-paragraphe={i} data-repere={repere===i?'true':undefined} tabIndex={-1} className={'ap-'+p.type}>{p.texte}</p>)}</article>
   <p className="ap-source">{langueTexte==='en'?l('Version anglaise validée par Dr Justin Tshims, établie d’après le texte français.','English version approved by Dr Justin Tshims, prepared from the French text.'):l('Source : PDF « LA PRIERE DE LA AMIDAH en phonétique et en traduction française », hassidout.org.','Source: PDF “LA PRIERE DE LA AMIDAH en phonétique et en traduction française”, hassidout.org.')}</p>
  </div>
  <DeclarationHabitude key={activite.occurrence.occurrence_id} variante="priere" userId={userId} occurrence={activite.occurrence} consigne={activite.consigne} critere={activite.critere} etat={activite.etat} langue={langue} lectureSeule={false} aideDisponible={false} transport={transport} onConfirme={onConfirme}/>
 </dialog>,document.body);
}
