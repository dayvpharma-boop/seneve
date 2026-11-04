import {useEffect,useRef,useState} from 'react';
import {cheminPiste,lienLivre,pistesAudio,type LangueLivre} from '@/lib/livre-fichiers';
import {IconeBibliotheque as I} from './IconeBibliotheque';

const VITESSES=[1,1.25,1.5,0.75] as const;
/** Livre audio par pistes (décision du 04/11/2026) : piste en cours et position retenues sur l'appareil,
 * passage automatique à la piste suivante, vitesse réglable. Les liens temporaires durent 3 heures. */
export function LecteurAudioLivre({langue,userId}:{langue:LangueLivre;userId:string}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const cle=`seneve:livre-audio:v1:${userId}:${langue}`;
 const memoire=(()=>{try{const m=JSON.parse(localStorage.getItem(cle)??'null') as {piste?:unknown;temps?:unknown}|null;return {piste:typeof m?.piste==='string'?m.piste:null,temps:typeof m?.temps==='number'?m.temps:0};}catch{return {piste:null,temps:0};}})();
 const [pistes,setPistes]=useState<string[]|null>(null),[erreur,setErreur]=useState(false);
 const [courante,setCourante]=useState<string|null>(memoire.piste),[url,setUrl]=useState<string|null>(null),[vitesse,setVitesse]=useState(1);
 const audio=useRef<HTMLAudioElement>(null),reprise=useRef(memoire.temps),lecture=useRef(false);
 useEffect(()=>{let actif=true;void pistesAudio(langue).then(p=>{if(!actif)return;setPistes(p);setCourante(c=>c&&p.includes(c)?c:p[0]??null);},()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[langue]);
 useEffect(()=>{if(!courante)return;let actif=true;setUrl(null);void lienLivre(cheminPiste(langue,courante),10800).then(u=>{if(actif)setUrl(u);},()=>{if(actif)setErreur(true);});return()=>{actif=false;};},[courante,langue]);
 useEffect(()=>{if(audio.current)audio.current.playbackRate=vitesse;},[vitesse,url]);
 function retenir(){const a=audio.current;if(!a||!courante)return;try{localStorage.setItem(cle,JSON.stringify({piste:courante,temps:Math.floor(a.currentTime)}));}catch{/* position non retenue */}}
 function choisir(p:string,jouer:boolean){retenir();reprise.current=0;lecture.current=jouer;setCourante(p);}
 if(erreur)return <p role="alert" className="la-erreur">{l('Le livre audio ne peut pas s’ouvrir pour le moment. Vérifie ta connexion puis réessaie.','The audiobook cannot open right now. Check your connection and try again.')}</p>;
 if(!pistes)return <p role="status" className="la-chargement">{l('Chargement du livre audio…','Loading the audiobook…')}</p>;
 if(!pistes.length)return <p role="status" className="la-chargement">{l('Les enregistrements arrivent bientôt dans l’application.','The recordings will be available in the app soon.')}</p>;
 const rang=courante?pistes.indexOf(courante):-1;
 const titre=(p:string)=>l(`Partie ${Number(p.slice(0,2))}`,`Part ${Number(p.slice(0,2))}`);
 return <section className="la-lecteur" aria-label={l('Écouter le livre','Listen to the book')}>
  <div className="la-en-cours">
   <p className="la-titre"><I nom="headphones" taille={20}/>{courante?titre(courante):''}<span>{l(`${rang+1} sur ${pistes.length}`,`${rang+1} of ${pistes.length}`)}</span></p>
   {url?<audio ref={audio} controls controlsList="nodownload" preload="metadata" src={url}
     onLoadedMetadata={e=>{const a=e.currentTarget;a.playbackRate=vitesse;if(reprise.current>0&&reprise.current<a.duration-5)a.currentTime=reprise.current;reprise.current=0;if(lecture.current){lecture.current=false;void a.play().catch(()=>undefined);}}}
     onPause={retenir} onTimeUpdate={e=>{if(Math.floor(e.currentTarget.currentTime)%15===0)retenir();}}
     onEnded={()=>{const suivante=pistes[rang+1];if(suivante)choisir(suivante,true);}}/>
    :<p role="status" className="la-chargement">{l('Préparation de la piste…','Preparing the track…')}</p>}
   <div className="la-commandes">
    <button type="button" disabled={rang<=0} onClick={()=>choisir(pistes[rang-1]!,true)} aria-label={l('Piste précédente','Previous track')}><I nom="arrow_back" taille={20}/></button>
    <button type="button" className="la-vitesse" onClick={()=>setVitesse(v=>VITESSES[(VITESSES.indexOf(v as typeof VITESSES[number])+1)%VITESSES.length]!)} aria-label={l(`Vitesse ${vitesse}×, changer`,`Speed ${vitesse}×, change`)}>{vitesse}×</button>
    <button type="button" disabled={rang>=pistes.length-1} onClick={()=>choisir(pistes[rang+1]!,true)} aria-label={l('Piste suivante','Next track')}><I nom="east" taille={20}/></button>
   </div>
  </div>
  <ol className="la-pistes">{pistes.map(p=><li key={p}><button type="button" aria-current={p===courante?'true':undefined} onClick={()=>choisir(p,true)}><span className="la-numero">{p.slice(0,2)}</span>{titre(p)}<I nom={p===courante?'headphones':'chevron_right'} taille={18}/></button></li>)}</ol>
 </section>;
}
