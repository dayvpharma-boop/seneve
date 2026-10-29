import {Link} from 'react-router-dom';
import {Icone} from './Icone';

/** Liens de navigation uniquement : ne présument aucun droit ni achat. */
export function RaccourcisParcours({langue}:{langue:string}) {
  const en=langue==='en',suffixe=en?'?lang=en':'';
  return <nav className="raccourcis-parcours" aria-label={en?'Offers and access':'Offres et accès'}>
    <Link to={`/acces${suffixe}`}><Icone nom="livre"/><span>{en?'My purchases and access':'Mes achats et accès'}</span></Link>
    <Link to={`/offres${suffixe}`}><Icone nom="graine"/><span>{en?'Journeys & offers':'Parcours & offres'}</span></Link>
  </nav>;
}
