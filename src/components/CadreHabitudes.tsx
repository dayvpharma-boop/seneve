import {retourPrecedent} from '@/lib/retour-precedent';
import type {ReactNode} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {dejaSurCettePage,remonterEnHaut} from '@/lib/remonter-en-haut';
import {IconeHD} from './IconeHabitudes';
import {ClocheNotifications} from './ClocheNotifications';
import {IconeOnglet} from './IconesIphone';

/** Barre du haut et barre du bas des maquettes Stitch Habitudes & Défis, reproduites telles quelles.
 * Parcours, Bibliothèque, Bible et Journal mènent aux mêmes pages que la barre de l'espace (BarreNav) :
 * demande de Dr Justin du 04/11/2026, ces onglets ne répondaient pas après l'ouverture d'un rappel.
 */
export type OngletHD='aujourdhui'|'parcours'|'bibliotheque'|'bible'|'journal';
const PAGES:Partial<Record<OngletHD,string>>={parcours:'/progres',bibliotheque:'/bibliotheque',bible:'/bible',journal:'/journal'};
const ONGLETS:{id:OngletHD;fr:string;en:string}[]=[
 {id:'aujourdhui',fr:'Aujourd’hui',en:'Today'},
 {id:'parcours',fr:'Parcours',en:'Journey'},
 {id:'bibliotheque',fr:'Bibliothèque',en:'Library'},
 {id:'bible',fr:'Bible',en:'Bible'},
 {id:'journal',fr:'Journal',en:'Journal'},
];
export function CadreHabitudes({titre,langue,actif,liens={},retour,retourLibelle,sousTitreCentre,droite,children,avecNavigation=true,cloche=false}:{
 /** Cloche des notifications : seulement sur les écrans d'un participant inscrit (aucun appel serveur sinon). */
 cloche?:boolean;titre:string;langue:string;actif?:OngletHD;liens?:Partial<Record<OngletHD,string>>;retour?:string;retourLibelle?:string;sousTitreCentre?:string;droite?:ReactNode;children:ReactNode;avecNavigation?:boolean}){
 const en=langue==='en',ici=useLocation();
 return <div className="hd-ecran ios hd-stitch bg-hd-surface text-hd-on-surface antialiased flex flex-col min-h-screen font-hd-body-md">
  {sousTitreCentre?<header className="sticky top-0 inset-x-0 z-40 bg-hd-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(29,28,19,0.04)] pt-safe">
   <div className="h-20 px-hd-margin grid grid-cols-[auto_1fr_auto] items-center gap-2">
    <div className="flex items-center gap-hd-space-xs">{retour&&<Link onClick={retourPrecedent} to={retour} aria-label={retourLibelle??(en?'Back':'Retour')} className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center text-hd-on-surface hover:bg-hd-surface-container/60 transition-colors"><IconeHD nom="arrow_back_ios_new" className="text-[22px]"/></Link>}<img alt="" className="h-8 w-8 object-contain rounded-lg" src={`${import.meta.env.BASE_URL}icons/icon.svg`}/></div>
    <div className="flex flex-col items-center justify-center text-center min-w-0"><span className="font-hd-headline-md text-hd-headline-sm tracking-wide text-hd-on-surface leading-none">{titre}</span><span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary mt-1">{sousTitreCentre}</span></div>
    <div className="flex items-center justify-end min-w-11">{droite??<div className="flex items-center gap-1">{cloche&&<ClocheNotifications langue={langue} className="cloche-hd"/>}<div className="w-8 h-8 rounded-full bg-hd-primary flex items-center justify-center shadow-[0_2px_6px_rgba(88,68,0,0.18)]"><IconeHD nom="person" className="text-hd-on-primary text-[18px]"/></div></div>}</div>
   </div>
  </header>:<header className="sticky top-0 w-full z-40 pt-safe bg-hd-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(29,28,19,0.04)]">
   <div className="h-14 px-hd-margin flex items-center justify-between">
    <div className="flex items-center gap-hd-space-sm min-w-0">
     {retour?<><Link onClick={retourPrecedent} to={retour} aria-label={retourLibelle??(en?'Back':'Retour')} className="w-11 h-11 flex items-center justify-center -ml-2 text-hd-on-surface hover:text-hd-primary-container transition-colors"><IconeHD nom="arrow_back" className="text-[22px]"/></Link><img alt="" className="h-8 w-8 object-contain rounded-lg" src={`${import.meta.env.BASE_URL}icons/icon.svg`}/></>
      :<img alt="" className="h-8 w-8 object-contain rounded-lg" src={`${import.meta.env.BASE_URL}icons/icon.svg`}/>}
     <div className="flex flex-col min-w-0">
      <span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary">SÉNEVÉ</span>
      <span className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface leading-none truncate">{titre}</span>
     </div>
    </div>
    {droite??<div className="flex items-center gap-1">{cloche&&<ClocheNotifications langue={langue} className="cloche-hd"/>}<div className="w-8 h-8 rounded-full bg-hd-primary flex items-center justify-center"><IconeHD nom="person" className="text-hd-on-primary text-[18px]"/></div></div>}
   </div>
  </header>}
  <main className={`flex-1 flex flex-col relative w-full bg-hd-surface ${avecNavigation?'pb-20':''}`}>{children}</main>
  {avecNavigation&&<nav aria-label={en?'Main navigation':'Navigation principale'} className="hd-onglets fixed bottom-0 left-0 w-full z-50 pb-safe bg-hd-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(29,28,19,0.04)]">
   <div className="flex justify-around items-center h-16 px-hd-space-xs max-w-[560px] mx-auto">
    {ONGLETS.map(o=>{
     const courant=o.id===actif,cl=`ios-onglet flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-1 transition-colors ${courant?'text-hd-secondary font-semibold':'text-hd-on-surface-variant hover:text-hd-on-surface'}`;
     // Style iPhone (05/11/2026) : mêmes icônes que la barre de l’espace.
     const contenu=<><IconeOnglet cle={o.id} actif={courant}/><span className="font-hd-label-nav text-hd-label-nav">{en?o.en:o.fr}</span></>;
     const page=PAGES[o.id],lien=liens[o.id]??(page&&(en?`${page}?lang=en`:page));
     return lien?<Link key={o.id} to={lien} aria-current={courant?'page':undefined} className={cl} onClick={ev=>{if(courant&&dejaSurCettePage(lien,ici.pathname,ici.search)){ev.preventDefault();remonterEnHaut();}}}>{contenu}</Link>:<span key={o.id} aria-disabled="true" className={cl}>{contenu}</span>;
    })}
   </div>
  </nav>}
 </div>;
}
