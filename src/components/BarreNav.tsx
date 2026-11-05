import {IconeOnglet} from './IconesIphone';
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


export function BarreNav({ langue }: { langue?: string | null; maquette?: boolean; iconesJournee?: boolean; iconesJournal?: boolean; iconesAide?: boolean;varianteJournee?:boolean }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  return <nav className="barre-nav" aria-label={T.nom}>
    <ul>
      {ENTREES.map(e => {
        const actif = (pathname === e.chemin || (e.cle === 'bibliotheque' && (pathname === '/livre' || pathname.startsWith('/livre/'))) || (e.cle === 'bible' && pathname.startsWith('/bible/'))) && !(e.cle === 'journal' && ecriture);
        const cle = e.cle;
        return <li key={cle}>
          <Link to={langue === 'en' ? `${e.vers}?lang=en` : e.vers} className="ios-onglet" aria-current={actif ? 'page' : undefined}>
            {/* Style iPhone validé le 04/11/2026 : mêmes icônes partout, pleines sur l’onglet actif. */}
            <IconeOnglet cle={cle} actif={actif}/>
            <span>{T[cle]}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
