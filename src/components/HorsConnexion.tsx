import { Link } from 'react-router-dom';
import { IconeJournee } from '@/components/IconeJournee';

/** Langue d'une page dont les données n'ont pas pu être chargées (hors connexion) : ?lang=, puis la langue de la page. */
export function langueSansDonnees(params: URLSearchParams): 'en' | 'fr' {
  const l = params.get('lang');
  if (l === 'en' || l === 'fr') return l;
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'fr';
}

/** Maquette Stitch n° 2 (28/10/2026) : page qui demande une connexion. Seule la phrase du milieu change d'une page à l'autre. */
export function CarteHorsConnexion({ langue, texte, reessayer }: { langue: string; texte: string; reessayer: () => void }) {
  const en = langue === 'en';
  return <section className="hc-zone" aria-labelledby="hc-titre">
    <div className="hc-carte">
      <span className="hc-icone" aria-hidden="true"><IconeJournee nom="wifi_off" taille={30} /></span>
      <h2 id="hc-titre">{en ? 'You are offline' : 'Tu es hors connexion'}</h2>
      <p role="status">{texte}</p>
      <button type="button" className="hc-bouton" onClick={reessayer}>{en ? 'Try again' : 'Réessayer'}</button>
      <Link className="hc-lien" to="/espace">{en ? 'Reread my day' : 'Relire ma journée'}</Link>
    </div>
    <p className="hc-note">{en ? 'Days you have already opened stay readable without a network.' : 'Les journées déjà ouvertes restent lisibles sans réseau.'}</p>
  </section>;
}
