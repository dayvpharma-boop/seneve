import { Link, useLocation } from 'react-router-dom';
import { Icone, type NomIcone } from '@/components/Icone';

/** Barre du bas de l'espace participant (validée le 15/10/2026) : Aujourd'hui, Parcours, Écrire, Journal, Aide. */
const NAV = {
  fr: { nom: 'Navigation principale', aujourdhui: 'Aujourd’hui', parcours: 'Parcours', ecrire: 'Écrire', journal: 'Journal', aide: 'Aide' },
  en: { nom: 'Main navigation', aujourdhui: 'Today', parcours: 'Journey', ecrire: 'Write', journal: 'Journal', aide: 'Help' },
} as const;

type Entree = { cle: 'aujourdhui' | 'parcours' | 'ecrire' | 'journal' | 'aide'; vers: string; icone: NomIcone; chemin: string };
const ENTREES: Entree[] = [
  { cle: 'aujourdhui', vers: '/espace', icone: 'soleil', chemin: '/espace' },
  { cle: 'parcours', vers: '/progres', icone: 'livre', chemin: '/progres' },
  { cle: 'ecrire', vers: '/journal?ecrire=1', icone: 'plus', chemin: '' },
  { cle: 'journal', vers: '/journal', icone: 'journal', chemin: '/journal' },
  { cle: 'aide', vers: '/aide', icone: 'aide', chemin: '/aide' },
];

export function BarreNav({ langue }: { langue?: string | null }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  return <nav className="barre-nav" aria-label={T.nom}>
    <ul>
      {ENTREES.map(e => {
        const actif = e.cle === 'ecrire' ? false : pathname === e.chemin && !(e.cle === 'journal' && ecriture);
        return <li key={e.cle}>
          <Link to={e.vers} className={e.cle === 'ecrire' ? 'nav-ecrire' : undefined} aria-current={actif ? 'page' : undefined}>
            {e.cle === 'ecrire' ? <span className="nav-plus"><Icone nom="plus" /></span> : <Icone nom={e.icone} />}
            <span>{T[e.cle]}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
