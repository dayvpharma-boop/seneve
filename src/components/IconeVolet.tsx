import {useId} from 'react';
import './IconeVolet.css';

/** Icônes en couleur des volets de la page Aujourd'hui (demande de Dr Justin du 08/11/2026) :
 *  « Ma dîme », « Mes cultes de la semaine », « SÉNEVÉ Finance ».
 *  Pastille pastel + dessin multicolore, décoratif (le titre du volet reste le texte lu). */
export type NomIconeVolet='dime'|'cultes'|'finance';

export function IconeVolet({nom}:{nom:NomIconeVolet}){
 const id=useId().replace(/:/g,'');
 const g=(s:string)=>`${id}-${s}`;
 return <span className="hd-icone-volet" data-ton={nom} aria-hidden="true">
  <svg viewBox="0 0 32 32" width="30" height="30" focusable="false">
   {nom==='dime'&&<>
    <defs>
     <linearGradient id={g('piece')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFE58A"/><stop offset="1" stopColor="#F59E0B"/></linearGradient>
     <linearGradient id={g('main')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FDBA74"/><stop offset="1" stopColor="#EA7A1F"/></linearGradient>
    </defs>
    {/* pièce dorée avec une pousse : la dîme comme semence */}
    <circle cx="16.5" cy="10.5" r="7" fill={`url(#${g('piece')})`} stroke="#D97706" strokeWidth="1"/>
    <circle cx="16.5" cy="10.5" r="5" fill="none" stroke="#FFF6D5" strokeOpacity=".8" strokeWidth=".9"/>
    <path d="M16.5 14.2V9.8" stroke="#15803D" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M16.5 11.6c-1.9 0-3.1-1.2-3.1-3 1.9 0 3.1 1.2 3.1 3Z" fill="#22A355"/>
    <path d="M16.5 10.2c0-1.9 1.2-3.2 3.2-3.2 0 1.9-1.2 3.2-3.2 3.2Z" fill="#34C759"/>
    {/* main ouverte qui donne */}
    <rect x="2.5" y="19" width="4.6" height="9" rx="1.6" fill="#B45309"/>
    <path d="M7.1 20.4c2.2-1.2 4.6-1.6 6.8-1l4.4 1.3c1.5.4 1.3 2.6-.3 2.6h-4.2l5.8.1 5.4-2.3c1.6-.7 3.3.9 2.2 2.3-.4.5-1 .9-1.6 1.2l-6.6 3.4c-1.5.8-3.2 1-4.9.7L7.1 27.2Z" fill={`url(#${g('main')})`}/>
    <path d="M13.8 22.9h3.9" stroke="#C2410C" strokeOpacity=".55" strokeWidth=".9" strokeLinecap="round"/>
    {/* éclat */}
    <path d="M26.3 4.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" fill="#F5B70A"/>
   </>}
   {nom==='cultes'&&<>
    <defs>
     <linearGradient id={g('toit')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B83FF"/><stop offset="1" stopColor="#4F46E5"/></linearGradient>
     <linearGradient id={g('mur')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF"/><stop offset="1" stopColor="#E3E0FF"/></linearGradient>
     <radialGradient id={g('lumiere')}><stop offset="0" stopColor="#FFF3B0"/><stop offset="1" stopColor="#F5B70A"/></radialGradient>
    </defs>
    {/* croix dorée */}
    <rect x="15.2" y="1.6" width="1.6" height="6" rx=".6" fill="#F5B70A"/>
    <rect x="13.4" y="3.2" width="5.2" height="1.6" rx=".6" fill="#F5B70A"/>
    {/* murs, toit, porte, rosace lumineuse */}
    <rect x="8" y="14" width="16" height="14.5" rx="1.4" fill={`url(#${g('mur')})`} stroke="#6D63F0" strokeWidth="1"/>
    <path d="M5.6 15.6 16 7.2l10.4 8.4c.6.5.2 1.4-.6 1.4H6.2c-.8 0-1.2-.9-.6-1.4Z" fill={`url(#${g('toit')})`}/>
    <circle cx="16" cy="19.6" r="2.3" fill={`url(#${g('lumiere')})`} stroke="#E6A100" strokeWidth=".6"/>
    <path d="M13.4 28.5v-3.6a2.6 2.6 0 0 1 5.2 0v3.6Z" fill="#5B4EE8"/>
    <rect x="9.8" y="18.2" width="2.2" height="3.4" rx="1.1" fill="#C7C2FF"/>
    <rect x="20" y="18.2" width="2.2" height="3.4" rx="1.1" fill="#C7C2FF"/>
   </>}
   {nom==='finance'&&<>
    <defs>
     <linearGradient id={g('feuille')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6EE7A0"/><stop offset="1" stopColor="#16A34A"/></linearGradient>
     <linearGradient id={g('or')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FCD34D"/><stop offset="1" stopColor="#F59E0B"/></linearGradient>
    </defs>
    {/* pile de pièces */}
    <rect x="3" y="24" width="14" height="4.2" rx="2.1" fill="#E58E0B"/>
    <rect x="4" y="20.2" width="14" height="4.2" rx="2.1" fill={`url(#${g('or')})`} stroke="#D97706" strokeWidth=".7"/>
    <rect x="3" y="16.4" width="14" height="4.2" rx="2.1" fill="#FDE68A" stroke="#E0A10A" strokeWidth=".7"/>
    <path d="M6.5 18.5h7" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth=".9" strokeLinecap="round"/>
    {/* le sénevé qui pousse */}
    <ellipse cx="23.5" cy="28.2" rx="4.6" ry="1.3" fill="#86E3A6" fillOpacity=".7"/>
    <path d="M23.5 28V13" stroke="#15803D" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M23.5 18.6c-3.7 0-6-2.4-6-6.1 3.7 0 6 2.4 6 6.1Z" fill={`url(#${g('feuille')})`}/>
    <path d="M23.5 14.6c0-4.2 2.4-7 6.4-7 0 4.1-2.4 7-6.4 7Z" fill={`url(#${g('feuille')})`}/>
    <path d="M23.5 14.6l3.8-4.4M23.5 18.6l-3.5-3.6" stroke="#0F7A3A" strokeOpacity=".45" strokeWidth=".7" strokeLinecap="round"/>
   </>}
  </svg>
 </span>;
}
