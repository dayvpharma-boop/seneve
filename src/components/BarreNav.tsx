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

/** La barre est remontée à chaque changement de page : on conserve la géométrie visible
 *  de la pastille pour poursuivre son mouvement sur le nouvel écran. */
let derniereForme: { left: number; width: number } | null = null;

export function BarreNav({ langue }: { langue?: string | null; maquette?: boolean; iconesJournee?: boolean; iconesJournal?: boolean; iconesAide?: boolean;varianteJournee?:boolean }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  const estActif = (e: Entree) => (pathname === e.chemin || (e.cle === 'bibliotheque' && (pathname === '/livre' || pathname.startsWith('/livre/'))) || (e.cle === 'bible' && pathname.startsWith('/bible/'))) && !(e.cle === 'journal' && ecriture);
  const caseActive = ENTREES.findIndex(estActif);
  const navRef = useRef<HTMLElement>(null);
  const pastille = useRef<HTMLSpanElement>(null);
  const liens = useRef<(HTMLAnchorElement | null)[]>([]);

  /** Mesure le texte et l'icône pour ajuster la largeur de la pastille à l'onglet. */
  const positionCible = (i: number) => {
    const nav = navRef.current, link = liens.current[i], pill = pastille.current;
    const contenu = link?.querySelector<HTMLElement>('.ios-onglet-contenu');
    if (!nav || !link || !contenu || !pill) return null;
    const nr = nav.getBoundingClientRect(), cr = contenu.getBoundingClientRect();
    const cellule = link.parentElement?.getBoundingClientRect();
    const celluleLargeur = cellule?.width ?? nr.width;
    const largeurMax = Math.max(40, Math.min(nr.width - 12, celluleLargeur - 8));
    const width = Math.min(largeurMax, Math.max(52, Math.ceil(cr.width + 12)));
    const centre = cellule ? cellule.left - nr.left + cellule.width / 2 : cr.left - nr.left + cr.width / 2;
    const left = Math.max(6, Math.min(nr.width - width - 6, centre - width / 2));
    return { left, width };
  };

  /** Étire la vitre jusqu'à l'onglet suivant, puis la laisse se reposer. */
  const placer = (i: number, glisser: boolean) => {
    const el = pastille.current, cible = positionCible(i);
    if (!el || !cible) return;
    const courant = getComputedStyle(el);
    const fromLeft = Number.parseFloat(courant.left) || 6;
    const fromWidth = Number.parseFloat(courant.width) || cible.width;
    if (typeof el.getAnimations === 'function') el.getAnimations().forEach(animation => animation.cancel());

    const installer = () => {
      el.style.left = String(cible.left) + 'px';
      el.style.width = String(cible.width) + 'px';
      el.style.transform = '';
    };
    const reduit = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!glisser || reduit || typeof el.animate !== 'function' ||
        (Math.abs(fromLeft - cible.left) < 1 && Math.abs(fromWidth - cible.width) < 1)) { installer(); return; }

    const unionRight = Math.max(fromLeft + fromWidth, cible.left + cible.width);
    const etire = Math.min(unionRight - Math.min(fromLeft, cible.left), Math.max(fromWidth, cible.width) * 1.15);
    const etireGauche = cible.left < fromLeft ? Math.max(6, unionRight - etire) : fromLeft;
    const animation = el.animate([
      { left: String(fromLeft) + 'px', width: String(fromWidth) + 'px', transform: 'scaleY(1)', offset: 0, easing: 'cubic-bezier(.2,.7,.25,1)' },
      { left: String(etireGauche) + 'px', width: String(etire) + 'px', transform: 'scaleY(.94)', offset: .38, easing: 'cubic-bezier(.16,1,.3,1)' },
      { left: String(cible.left) + 'px', width: String(cible.width * 1.02) + 'px', transform: 'scaleY(1.01)', offset: .78, easing: 'cubic-bezier(.34,1.2,.64,1)' },
      { left: String(cible.left) + 'px', width: String(cible.width) + 'px', transform: 'scaleY(1)', offset: 1 },
    ], { duration: 650, easing: 'cubic-bezier(.22,.8,.3,1)' });
    animation.onfinish = installer;
  };

  useLayoutEffect(() => {
    if (caseActive < 0) return;
    const depart = derniereForme;
    const cible = positionCible(caseActive);
    const el = pastille.current;
    if (!el || !cible) return;
    if (depart && (Math.abs(depart.left - cible.left) > 1 || Math.abs(depart.width - cible.width) > 1)) {
      el.style.left = String(depart.left) + 'px';
      el.style.width = String(depart.width) + 'px';
      const r = requestAnimationFrame(() => placer(caseActive, true));
      return () => cancelAnimationFrame(r);
    }
    placer(caseActive, false);
  }, [caseActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Garde la position effectivement visible quand la page se démonte au milieu du mouvement.
  useLayoutEffect(() => {
    const el = pastille.current;
    return () => {
      if (!el) return;
      const style = getComputedStyle(el);
      const left = Number.parseFloat(style.left), width = Number.parseFloat(style.width);
      if (Number.isFinite(left) && Number.isFinite(width)) derniereForme = { left, width };
    };
  }, []);
  return <nav ref={navRef} className="barre-nav" aria-label={T.nom}>
    <span ref={pastille} className="barre-nav-pastille" aria-hidden="true" style={caseActive < 0 ? { opacity: 0 } : undefined}/>
    <ul>
      {ENTREES.map((e, i) => {
        const actif = estActif(e);
        const cle = e.cle;
        return <li key={cle}>
          <Link ref={el => { liens.current[i] = el; }} to={langue === 'en' ? `${e.vers}?lang=en` : e.vers} className="ios-onglet" aria-current={actif ? 'page' : undefined}
            onPointerDown={() => placer(i, true)}>
            {/* Style iPhone validé le 04/11/2026 : mêmes icônes partout, pleines sur l’onglet actif. */}
            <span className="ios-onglet-contenu">
              <IconeOnglet cle={cle} actif={actif}/>
              <span className="ios-onglet-label">{T[cle]}</span>
            </span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
