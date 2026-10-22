import {IconeRayonnage} from './IconeRayonnage';
import { Link, useLocation } from 'react-router-dom';
import { Icone, type NomIcone } from '@/components/Icone';
import { IconeMaquette } from '@/components/IconeMaquette';
import { IconeAide } from '@/components/IconeAide';
import { IconeBible } from '@/components/IconeBible';
import { IconeJournal } from '@/components/IconeJournal';
import { IconeJournee } from '@/components/IconeJournee';

/** Barre du bas de l'espace participant : Aujourd'hui, Parcours, Bibliothèque, Bible, Journal (maquettes Bible du 22/10/2026 ;
 *  l'aide reste accessible depuis le profil et les pages). */
const NAV = {
  fr: { nom: 'Navigation principale', aujourdhui: 'Aujourd’hui', parcours: 'Parcours', bibliotheque: 'Bibliothèque', bible: 'Bible', journal: 'Journal' },
  en: { nom: 'Main navigation', aujourdhui: 'Today', parcours: 'Journey', bibliotheque: 'Library', bible: 'Bible', journal: 'Journal' },
} as const;

type Entree = { cle: 'aujourdhui' | 'parcours' | 'bibliotheque' | 'bible' | 'journal'; vers: string; icone: NomIcone; chemin: string };
const ENTREES: Entree[] = [
  { cle: 'aujourdhui', vers: '/espace', icone: 'soleil', chemin: '/espace' },
  { cle: 'parcours', vers: '/progres', icone: 'livre', chemin: '/progres' },
  { cle: 'bibliotheque', vers: '/bibliotheque', icone: 'livre', chemin: '/bibliotheque' },
  { cle: 'bible', vers: '/bible', icone: 'livre', chemin: '/bible' },
  { cle: 'journal', vers: '/journal', icone: 'journal', chemin: '/journal' },
];

const SYMBOLES = { aujourdhui: 'wb_twilight', parcours: 'alt_route', journal: 'history_edu' } as const;

const SYMBOLES_JOURNEE = { aujourdhui: 'light_mode', parcours: 'route', journal: 'edit_note' } as const;
export function BarreNav({ langue, maquette = false, iconesJournee = false, iconesJournal = false, iconesAide = false, varianteJournee = false }: { langue?: string | null; maquette?: boolean; iconesJournee?: boolean; iconesJournal?: boolean; iconesAide?: boolean;varianteJournee?:boolean }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  return <nav className="barre-nav" aria-label={T.nom}>
    <ul>
      {ENTREES.map(e => {
        const actif = (pathname === e.chemin || (e.cle === 'bibliotheque' && (pathname === '/livre' || pathname.startsWith('/livre/'))) || (e.cle === 'bible' && pathname.startsWith('/bible/'))) && !(e.cle === 'journal' && ecriture);
        const cle = e.cle;
        return <li key={cle}>
          <Link to={e.vers} className={cle === 'bibliotheque' ? 'nav-ecrire' : undefined} aria-current={actif ? 'page' : undefined}>
            {cle === 'bibliotheque' ? <span className="nav-plus"><IconeRayonnage taille={24}/></span> : cle === 'bible' ? <IconeBible nom="menu_book" taille={22} /> : iconesAide ? <IconeAide nom={({aujourdhui:"wb_sunny",parcours:"route",journal:"edit_note"} as const)[cle]} taille={22} /> : iconesJournal ? <IconeJournal nom={({aujourdhui:"light_mode",parcours:"route",journal:"stylus_note"} as const)[cle]} taille={24} /> : varianteJournee ? <IconeJournee nom={({aujourdhui:"wb_sunny",parcours:"explore",journal:"edit_note"} as const)[cle]} taille={22}/> : iconesJournee ? <IconeJournee nom={SYMBOLES_JOURNEE[cle]} taille={22} /> : maquette ? <IconeMaquette nom={SYMBOLES[cle]} taille={22} /> : <Icone nom={e.icone} />}
            <span>{T[cle]}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
