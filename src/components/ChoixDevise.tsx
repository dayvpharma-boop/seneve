import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {DEVISES_SUIVI} from '@/lib/devises';
import {DEVISES_COURANTES,libelleDevise} from './OptionsDevises';
import './ChoixDevise.css';

/** Choix de la monnaie et du type d'objectif, style iPhone (maquette validée par Dr Justin le 08/11/2026).
 * Remplace les menus déroulants du téléphone : une feuille qui monte du bas, avec recherche. */

const SYMBOLES:Record<string,string>={USD:'$',EUR:'€',XAF:'FCFA',XOF:'FCFA',AOA:'Kz',CDF:'FC',ZMW:'K',RWF:'FRw',BIF:'FBu',UGX:'USh',TZS:'TSh',KES:'KSh',ZAR:'R',NGN:'₦',GHS:'₵',CNY:'¥',AED:'AED',GBP:'£',CAD:'$',CHF:'Fr'};
const COULEURS:Record<string,string>={USD:'#2f9e62',EUR:'#2f6fe0',XAF:'#b8862b',XOF:'#c9702b',AOA:'#d1394b',CDF:'#1e88e5',ZMW:'#2e7d32',RWF:'#00897b',BIF:'#6a5acd',GBP:'#5856d6',CNY:'#c62828',CHF:'#c62828'};
const PALETTE=['#5856d6','#ff9500','#34c759','#007aff','#af52de','#ff2d55','#30b0c7','#a2845e'];
export function symboleDevise(code:string){
 if(SYMBOLES[code])return SYMBOLES[code];
 try{const s=new Intl.NumberFormat('fr-FR',{style:'currency',currency:code,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value;return s&&s.length<=4?s:code;}catch{return code;}
}
function couleurDevise(code:string){return COULEURS[code]??PALETTE[[...code].reduce((s,c)=>s+c.charCodeAt(0),0)%PALETTE.length]!;}
export function PastilleDevise({code,taille=30}:{code:string;taille?:number}){
 const s=symboleDevise(code);
 return <span aria-hidden="true" className="choix-pastille" style={{width:taille,height:taille,background:couleurDevise(code),fontSize:s.length>2?Math.round(taille*.34):Math.round(taille*.45)}}>{s}</span>;
}
const nomSeul=(code:string,langue:'fr'|'en')=>libelleDevise(code,langue).replace(/\s*\([A-Z]{3}\)$/,'');
const sansAccents=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

export function ChoixDevise({id,valeur,onChange,langue}:{id:string;valeur:string;onChange:(code:string)=>void;langue:'fr'|'en'}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const [ouvert,setOuvert]=useState(false),[recherche,setRecherche]=useState('');
 const bouton=useRef<HTMLButtonElement>(null),champ=useRef<HTMLInputElement>(null),liste=useRef<HTMLDivElement>(null);
 const courantes=useMemo(()=>DEVISES_COURANTES.filter(c=>DEVISES_SUIVI.includes(c)),[]);
 const toutes=useMemo(()=>DEVISES_SUIVI.map(c=>({c,n:nomSeul(c,langue)})).sort((a,b)=>a.n.localeCompare(b.n,langue)),[langue]);
 const q=sansAccents(recherche.trim());
 const rang=(c:string)=>{const i=(courantes as readonly string[]).indexOf(c);return i<0?99:i;};
 const trouvees=q?toutes.filter(({c,n})=>sansAccents(n).includes(q)||c.toLowerCase().includes(q)).sort((x,y)=>rang(x.c)-rang(y.c)):[];
 const parLettre=useMemo(()=>{const m=new Map<string,{c:string;n:string}[]>();for(const d of toutes){const k=sansAccents(d.n).charAt(0).toUpperCase();m.set(k,[...(m.get(k)??[]),d]);}return [...m];},[toutes]);
 function fermer(){setOuvert(false);setRecherche('');bouton.current?.focus();}
 function choisir(c:string){onChange(c);fermer();}
 useEffect(()=>{if(!ouvert)return;const t=window.setTimeout(()=>liste.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({block:'center'}),30);
  const k=(e:KeyboardEvent)=>{if(e.key==='Escape')fermer();};document.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{window.clearTimeout(t);document.removeEventListener('keydown',k);document.body.style.overflow=o;};},[ouvert]);// eslint-disable-line react-hooks/exhaustive-deps
 const ligne=(c:string,n:string)=><button key={c} type="button" role="option" aria-selected={c===valeur} className="choix-devise-ligne" onClick={()=>choisir(c)}>
  <PastilleDevise code={c}/><span className="choix-devise-nom"><b>{n}</b><small>{c}</small></span>
  {c===valeur&&<svg className="choix-coche" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>}
 </button>;
 return <>
  <button ref={bouton} id={id} type="button" className="choix-devise-bouton" aria-haspopup="dialog" aria-expanded={ouvert} onClick={()=>setOuvert(true)}>
   <PastilleDevise code={valeur} taille={24}/><span className="choix-devise-valeur">{nomSeul(valeur,langue)}</span>
   <svg className="choix-hautbas" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 5.5l3-3 3 3M2 10.5l3 3 3-3"/></svg>
  </button>
  {ouvert&&createPortal(<div className="choix-devise-fond" onClick={e=>{if(e.target===e.currentTarget)fermer();}}>
   <div role="dialog" aria-modal="true" aria-labelledby={`${id}-titre`} className="choix-devise-feuille">
    <div className="choix-poignee" aria-hidden="true"/>
    <div className="choix-devise-tete"><button type="button" onClick={fermer}>{l('Annuler','Cancel')}</button><h2 id={`${id}-titre`}>{l('Monnaie','Currency')}</h2><span/></div>
    <label className="choix-recherche"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>
     <span className="sr-only">{l('Rechercher une monnaie','Search a currency')}</span>
     <input ref={champ} type="search" value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder={l('Rechercher : dollar, franc, CDF…','Search: dollar, franc, CDF…')} autoComplete="off" enterKeyHint="search"/></label>
    <div ref={liste} className="choix-devise-liste" role="listbox" aria-label={l('Monnaies','Currencies')}>
     {q?<>
      <h3>{trouvees.length?l(`${trouvees.length} résultat${trouvees.length>1?'s':''}`,`${trouvees.length} result${trouvees.length>1?'s':''}`):l('Aucune monnaie trouvée','No currency found')}</h3>
      {trouvees.length>0&&<div className="choix-groupe">{trouvees.map(({c,n})=>ligne(c,n))}</div>}
     </>:<>
      <h3>{l('Les plus utilisées','Most used')}</h3>
      <div className="choix-groupe">{courantes.map(c=>ligne(c,nomSeul(c,langue)))}</div>
      <h3>{l('Toutes les monnaies','All currencies')}</h3>
      {parLettre.map(([k,ds])=><div key={k} id={`${id}-lettre-${k}`}><h4>{k}</h4><div className="choix-groupe">{ds.map(({c,n})=>ligne(c,n))}</div></div>)}
     </>}
    </div>
    {!q&&<nav className="choix-index" aria-label={l('Aller à la lettre','Jump to letter')}>{parLettre.map(([k])=><button key={k} type="button" onClick={()=>document.getElementById(`${id}-lettre-${k}`)?.scrollIntoView({block:'start'})}>{k}</button>)}</nav>}
   </div>
  </div>,document.body)}
 </>;
}

export type TypeObjectif='reserve_joie'|'epargne_investir'|'autre';
export function ChoixTypeObjectif({valeur,onChange,langue}:{valeur:TypeObjectif;onChange:(t:TypeObjectif)=>void;langue:'fr'|'en'}){
 const en=langue==='en',l=(fr:string,english:string)=>en?english:fr;
 const types:{t:TypeObjectif;nom:string;info:string;couleur:string;icone:ReactNode}[]=[
  {t:'reserve_joie',nom:l('Réserve de joie','Family joy reserve'),info:l('Fêtes, cadeaux, moments en famille','Celebrations, gifts, family time'),couleur:'linear-gradient(135deg,#ffb340,#ff9500)',icone:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></>},
  {t:'epargne_investir',nom:l('Pour investir','For investing'),info:l('Faire grandir un projet','Grow a project'),couleur:'linear-gradient(135deg,#4cd964,#2fb24c)',icone:<><path d="M12 21v-9"/><path d="M12 12C12 7 8 4 4 4c0 5 3.5 8 8 8zM12 14c0-4 3-7 8-7 0 4.5-3 7-8 7z"/></>},
  {t:'autre',nom:l('Autre objectif','Other goal'),info:l('Ce que tu veux, à ton nom','Whatever you choose'),couleur:'linear-gradient(135deg,#7d7aff,#5856d6)',icone:<><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/></>},
 ];
 return <div role="radiogroup" aria-label={l('Type d’objectif','Goal type')} className="choix-types">
  {types.map(x=><button key={x.t} type="button" role="radio" aria-checked={valeur===x.t} className="choix-type" onClick={()=>onChange(x.t)}>
   {valeur===x.t&&<span className="choix-type-ok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>}
   <span className="choix-type-icone" style={{background:x.couleur}} aria-hidden="true"><svg viewBox="0 0 24 24">{x.icone}</svg></span>
   <b>{x.nom}</b><small>{x.info}</small>
  </button>)}
 </div>;
}
