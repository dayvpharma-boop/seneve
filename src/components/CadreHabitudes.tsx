import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {IconeHD} from './IconeHabitudes';

/** Barre du haut et barre du bas des maquettes Stitch Habitudes & Défis, reproduites telles quelles.
 * Les onglets sans lien fourni restent visibles mais inactifs (hors du périmètre de l'écran).
 */
export type OngletHD='aujourdhui'|'parcours'|'bibliotheque'|'bible'|'journal';
const ONGLETS:{id:OngletHD;icone:string;fr:string;en:string}[]=[
 {id:'aujourdhui',icone:'wb_twilight',fr:'Aujourd’hui',en:'Today'},
 {id:'parcours',icone:'route',fr:'Parcours',en:'Journey'},
 {id:'bibliotheque',icone:'auto_stories',fr:'Bibliothèque',en:'Library'},
 {id:'bible',icone:'menu_book',fr:'Bible',en:'Bible'},
 {id:'journal',icone:'edit_note',fr:'Journal',en:'Journal'},
];
export function CadreHabitudes({titre,langue,actif,liens={},retour,retourLibelle,droite,children,avecNavigation=true}:{titre:string;langue:string;actif?:OngletHD;liens?:Partial<Record<OngletHD,string>>;retour?:string;retourLibelle?:string;droite?:ReactNode;children:ReactNode;avecNavigation?:boolean}){
 const en=langue==='en';
 return <div className="hd-ecran bg-hd-surface text-hd-on-surface antialiased flex flex-col min-h-screen font-hd-body-md">
  <header className="sticky top-0 w-full z-40 pt-safe bg-hd-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(29,28,19,0.04)]">
   <div className="h-14 px-hd-margin flex items-center justify-between">
    <div className="flex items-center gap-hd-space-sm min-w-0">
     {retour?<><Link to={retour} aria-label={retourLibelle??(en?'Back':'Retour')} className="w-11 h-11 flex items-center justify-center -ml-2 text-hd-on-surface hover:text-hd-primary-container transition-colors"><IconeHD nom="arrow_back" className="text-[22px]"/></Link><img alt="" className="h-8 w-8 object-contain rounded-lg" src={`${import.meta.env.BASE_URL}icons/icon.svg`}/></>
      :<img alt="" className="h-8 w-8 object-contain rounded-lg" src={`${import.meta.env.BASE_URL}icons/icon.svg`}/>}
     <div className="flex flex-col min-w-0">
      <span className="font-hd-label-sm text-hd-label-sm uppercase tracking-wider text-hd-secondary">SÉNEVÉ</span>
      <span className="font-hd-headline-sm text-hd-headline-sm text-hd-on-surface leading-none truncate">{titre}</span>
     </div>
    </div>
    {droite??<div className="w-8 h-8 rounded-full bg-hd-primary flex items-center justify-center"><IconeHD nom="person" className="text-hd-on-primary text-[18px]"/></div>}
   </div>
  </header>
  <main className={`flex-1 flex flex-col relative w-full bg-hd-surface ${avecNavigation?'pb-20':''}`}>{children}</main>
  {avecNavigation&&<nav aria-label={en?'Main navigation':'Navigation principale'} className="fixed bottom-0 left-0 w-full z-50 pb-safe bg-hd-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(29,28,19,0.04)]">
   <div className="flex justify-around items-center h-16 px-hd-space-xs max-w-[560px] mx-auto">
    {ONGLETS.map(o=>{
     const courant=o.id===actif,cl=`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] gap-1 transition-colors ${courant?'text-hd-secondary font-semibold':'text-hd-on-surface-variant hover:text-hd-on-surface'}`;
     const contenu=<><IconeHD nom={o.icone} className="text-[22px]"/><span className="font-hd-label-nav text-hd-label-nav">{en?o.en:o.fr}</span></>;
     const lien=liens[o.id];
     return lien?<Link key={o.id} to={lien} aria-current={courant?'page':undefined} className={cl}>{contenu}</Link>:<span key={o.id} aria-disabled="true" className={cl}>{contenu}</span>;
    })}
   </div>
  </nav>}
 </div>;
}
