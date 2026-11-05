import type {ReactNode} from 'react';

/** Icônes du style iPhone validé par Dr Justin le 04/11/2026 (dessins originaux SÉNEVÉ). Décoratives : aria-hidden. */
const ONGLETS:Record<'aujourdhui'|'parcours'|'bibliotheque'|'bible'|'journal',{trait:ReactNode;plein:ReactNode}>={
 aujourdhui:{trait:<><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
  plein:<><circle cx="12" cy="12" r="5"/><path d="M12 1.6v2.8M12 19.6v2.8M1.6 12h2.8M19.6 12h2.8M4.6 4.6l2 2M17.4 17.4l2 2M4.6 19.4l2-2M17.4 6.6l2-2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></>},
 parcours:{trait:<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.4 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.6"/></g>,
  plein:<><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M8.4 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></>},
 bibliotheque:{trait:<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3.5" y="3.5" width="4.5" height="17" rx="1.2"/><rect x="9.8" y="3.5" width="4.5" height="17" rx="1.2"/><path d="m16.2 5 3.9-1 2.4 15.6-3.9 1z"/></g>,
  plein:<><rect x="3.5" y="3.5" width="4.5" height="17" rx="1.2"/><rect x="9.8" y="3.5" width="4.5" height="17" rx="1.2"/><path d="m16.2 5 3.9-1 2.4 15.6-3.9 1z"/></>},
 bible:{trait:<path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 6v13.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>,
  plein:<><path d="M2.5 5.2c3-1.6 6.2-1.6 8.8.3v14.6c-2.7-1.8-5.8-1.8-8.8-.3z"/><path d="M21.5 5.2c-3-1.6-6.2-1.6-8.8.3v14.6c2.7-1.8 5.8-1.8 8.8-.3z"/></>},
 journal:{trait:<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 20h6"/></g>,
  plein:<><path d="M3.5 20.5h4.6L19.6 9l-4.6-4.6L3.5 15.9z"/><path d="M14 20.5h6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></>},
};
export function IconeOnglet({cle,actif}:{cle:keyof typeof ONGLETS;actif:boolean}){
 return <svg className="ios-onglet-icone" viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true">{actif?ONGLETS[cle].plein:ONGLETS[cle].trait}</svg>;
}

/** Tuile colorée de chaque habitude, comme dans l'app Réglages. */
const SOLEIL=<><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>;
const MAINS=<path d="M12 3c1.2 2.6 3.3 4.1 3.3 7.2 0 1.6-.7 2.9-1.8 3.7L15 21h-2l-1-5-1 5H9l1.5-7.1A4.5 4.5 0 0 1 8.7 10.2C8.7 7.1 10.8 5.6 12 3z"/>;
const LIVRE=<path d="M2.5 5.2c3-1.6 6.2-1.6 8.8.3v14.6c-2.7-1.8-5.8-1.8-8.8-.3zM21.5 5.2c-3-1.6-6.2-1.6-8.8.3v14.6c2.7-1.8 5.8-1.8 8.8-.3z"/>;
const TUILES:Record<string,{teinte:string;dessin:ReactNode}>={
 reveil:{teinte:'orange',dessin:SOLEIL},
 coucher:{teinte:'nuit',dessin:<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>},
 gratitude:{teinte:'rose',dessin:<path d="M12 20.5s-7.3-4.5-9-9C1.8 8.2 3.9 5 7.1 5c1.9 0 3.3 1 4.9 2.9C13.6 6 15 5 16.9 5c3.2 0 5.3 3.2 4.1 6.5-1.7 4.5-9 9-9 9z"/>},
 priere:{teinte:'indigo',dessin:MAINS},
 bible:{teinte:'bleu',dessin:LIVRE},
 lecture:{teinte:'teal',dessin:<><rect x="4" y="3" width="13" height="18" rx="2"/><path d="M19 6v15H7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>},
 culte:{teinte:'violet',dessin:<path d="M12 2.5l1.6 1.6V7h3l1.4 3.5V21h-5v-4.5a1 1 0 0 0-2 0V21H6V10.5L7.4 7h3V4.1z"/>},
 exercice:{teinte:'vert',dessin:<><circle cx="14.5" cy="4.5" r="2.2"/><path d="M10.5 8.5l3.2-.8 2.4 3.2 3 1.2-.6 1.6-3.6-1.3-1.3-1.6-.9 3.6 2.6 2.4V22h-1.9v-4.2l-2.7-2.2-1.4 3.2-4 2.1-.8-1.7 3.4-1.8 2.5-6.1-1.6.5-1.2 2.6-1.7-.7z"/></>},
 autre:{teinte:'ardoise',dessin:<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>},
 dime:{teinte:'vert',dessin:<><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/><path d="M14.6 9.2c-.4-.9-1.4-1.4-2.6-1.4-1.6 0-2.6.8-2.6 1.9 0 2.6 5.3 1.4 5.3 4.1 0 1.1-1.1 2-2.7 2-1.3 0-2.3-.5-2.8-1.5M12 6.5v1.3M12 15.8v1.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></>},
};
export const familleHabitude=(cle:string=''):string=>cle.startsWith('priere')?'priere':cle.startsWith('gratitude')?'gratitude':cle.startsWith('bible')?'bible':cle.startsWith('lecture')?'lecture':cle.startsWith('culte')?'culte':cle in TUILES?cle:'autre';
export function TuileHabitude({habitKey}:{habitKey?:string|null}){
 const t=TUILES[familleHabitude(habitKey??'')]!;
 return <span className={`ios-tuile ios-tuile-${t.teinte}`} aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">{t.dessin}</svg></span>;
}
