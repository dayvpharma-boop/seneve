import {IconeEdition} from './IconeEdition';
import { Link, useLocation } from 'react-router-dom';
import { Icone, type NomIcone } from '@/components/Icone';
import { IconeMaquette } from '@/components/IconeMaquette';
import { IconeAide } from '@/components/IconeAide';
import { IconeJournal } from '@/components/IconeJournal';
import { IconeJournee } from '@/components/IconeJournee';

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

const SYMBOLES = { aujourdhui: 'wb_twilight', parcours: 'alt_route', ecrire: 'add', journal: 'history_edu', aide: 'help' } as const;

const SYMBOLES_JOURNEE = { aujourdhui: 'light_mode', parcours: 'route', ecrire: 'edit_note', journal: 'menu_book', aide: 'help_outline' } as const;
export function BarreNav({ langue, maquette = false, iconesJournee = false, iconesJournal = false, iconesAide = false, varianteJournee = false }: { langue?: string | null; maquette?: boolean; iconesJournee?: boolean; iconesJournal?: boolean; iconesAide?: boolean;varianteJournee?:boolean }) {
  const T = NAV[langue === 'en' ? 'en' : 'fr'];
  const { pathname, search } = useLocation();
  const ecriture = new URLSearchParams(search).has('ecrire');
  return <nav className="barre-nav" aria-label={T.nom}>
    <ul>
      {ENTREES.map(e => {
        const actif = e.cle === 'ecrire' ? false : pathname === e.chemin && !(e.cle === 'journal' && ecriture);
        return <li key={e.cle}>
          <Link to={e.vers} className={e.cle === 'ecrire' ? 'nav-ecrire' : undefined} aria-current={actif ? 'page' : undefined}>
            {e.cle === 'ecrire' ? <span className="nav-plus">{varianteJournee ? <IconeMaquette nom="add"/> : iconesAide ? <IconeAide nom="edit_note" taille={22} /> : iconesJournal ? <IconeJournal nom="stylus_note" taille={24} /> : iconesJournee ? <IconeJournee nom="edit_note" taille={22} /> : maquette ? <IconeMaquette nom="add" /> : <Icone nom="plus" />}</span> : iconesAide ? <IconeAide nom={({aujourdhui:"wb_sunny",parcours:"route",journal:"menu_book",aide:"help"} as const)[e.cle]} taille={22} /> : iconesJournal ? <IconeJournal nom={({aujourdhui:"light_mode",parcours:"route",journal:"menu_book",aide:"help"} as const)[e.cle]} taille={24} /> : varianteJournee ? e.cle==='aide'?<IconeEdition nom="support" taille={22}/>:<IconeJournee nom={({aujourdhui:"wb_sunny",parcours:"explore",journal:"auto_stories"} as const)[e.cle]} taille={22}/> : iconesJournee ? <IconeJournee nom={SYMBOLES_JOURNEE[e.cle]} taille={22} /> : maquette ? <IconeMaquette nom={SYMBOLES[e.cle]} taille={22} /> : <Icone nom={e.icone} />}
            <span>{T[e.cle]}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}
