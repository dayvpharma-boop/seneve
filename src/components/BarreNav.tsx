import {IconeOnglet} from './IconesIphone';
import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

/** Barre du bas de l'espace participant : Aujourd'hui, Parcours, Bibliothèque, Bible, Journal (maquettes Bible du 22/10/2026 ;
 *  l'aide reste accessible depuis le profil et les pages). */
const NAV = {
  fr: { nom: 'Navigation principale', aujourdhui: 'Aujourd’hui', parcours: 'Parcours', bibliotheque: 'Bibliothèque', bible: 'Bible', journal: 'Journal' },
  en: { nom: 'Main navigation', aujourdhui: 'Today', parcours: 'Journey', bibliotheque: 'Library', bible: 'Bible', journal: 'Journal' },
} as const;

type Entree = { cle: 'aujourdhui' | 'parcours' | 'bibliotheque' | 'bible' | 'journal'; vers: string; chemin: string };
const ENTREES: Entree[] = [
  { cle: 'aujourdhui', vers: '/espace', chemin: '/espace' },
  { cle: 'parcours', vers: '/progres', chemin: '/progres' },
  { cle: 'bibliotheque', vers: '/bibliotheque', chemin: '/bibliotheque' },
  { cle: 'bible', vers: '/bible', chemin: '/bible' },
  { cle: 'journal', vers: '/journal', chemin: '/journal' },
];

/** Chaque page monte sa propre barre : on garde ici la dernière position de la pastille de verre
 *  pour qu'elle glisse de l'ancien onglet vers le nouveau (demande de Dr Justin du 08/11/2026). */
let derniereCase: number | null = null;

export function BarreNav({ langue }: { langue?: string | null; maquette?: boolean; iconesJournee?: boolean; iconesJournal?: boolean; iconesAide?: boolean;varianteJournee?:boolean }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  const estActif = (e: Entree) => (pathname === e.chemin || (e.cle === 'bibliotheque' && (pathname === '/livre' || pathname.startsWith('/livre/'))) || (e.cle === 'bible' && pathname.startsWith('/bible/'))) && !(e.cle === 'journal' && ecriture);
  const caseActive = ENTREES.findIndex(estActif);
  const pastille = useRef<HTMLSpanElement>(null);
  /** Place la pastille sur une case (fraction possible), avec ou sans glissement. */
  const placer = (i: number, glisser: boolean) => {
    const el = pastille.current; if (!el) return;
    const position = `translateX(${i * 100}%)`;
    if (!glisser) { el.style.transition = 'none'; el.style.transform = position; void el.offsetWidth; el.style.transition = ''; return; }
    el.style.transform = position;
  };
  useLayoutEffect(() => {
    if (caseActive < 0) return;
    const depart = derniereCase;
    if (depart !== null && depart !== caseActive) {
      placer(depart, false);
      const r = requestAnimationFrame(() => placer(caseActive, true));
      return () => cancelAnimationFrame(r);
    }
    placer(caseActive, false);
  }, [caseActive]); // eslint-disable-line react-hooks/exhaustive-deps
  // En quittant la page, on retient où la pastille se trouve à cet instant (même au milieu d'un glissement).
  useLayoutEffect(() => {
    const el = pastille.current;
    return () => { if (el && el.offsetWidth && typeof DOMMatrix !== 'undefined') derniereCase = new DOMMatrix(getComputedStyle(el).transform).m41 / el.offsetWidth; };
  }, []);
  return <nav className="barre-nav" aria-label={T.nom}>
    <span ref={pastille} className="barre-nav-pastille" aria-hidden="true" style={caseActive < 0 ? { opacity: 0 } : undefined}/>
    <ul>
      {ENTREES.map((e, i) => {
        const actif = estActif(e);
        const cle = e.cle;
        return <li key={cle}>
          <Link to={langue === 'en' ? `${e.vers}?lang=en` : e.vers} className="ios-onglet" aria-current={actif ? 'page' : undefined}
            onPointerDown={() => placer(i, true)}>
            {/* Style iPhone validé le 04/11/2026 : mêmes icônes partout, pleines sur l’onglet actif. */}
            <IconeOnglet cle={cle} actif={actif}/>
            <span>{T[cle]}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
