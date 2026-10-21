import { Link } from 'react-router-dom';
import { Icone } from './Icone';
import { IconeConnexion } from './IconeConnexion';

export function lienConnexion(langue: 'fr' | 'en') {
  return `/connexion?mode=signin${langue === 'en' ? '&lang=en' : ''}`;
}

export function EnteteRecuperation({ langue, nouveau = false }: { langue: 'fr' | 'en'; nouveau?: boolean }) {
  const chemin = nouveau ? '/nouveau-mot-de-passe' : '/mot-de-passe-oublie';
  return <header className="recup-header">
    <Link className="auth-back" to={lienConnexion(langue)} aria-label={langue === 'en' ? 'Back to sign in' : 'Retour à la connexion'}><IconeConnexion nom="arrow_back" taille={22} /></Link>
    <div className="recup-marque"><span className="auth-brand"><Icone nom="graine" taille={22} /><strong>SÉNEVÉ</strong></span><small>{nouveau ? (langue === 'en' ? 'New password' : 'Nouveau mot de passe') : (langue === 'en' ? 'Forgot password' : 'Mot de passe oublié')}</small></div>
    <Link className="recup-langue" to={`${chemin}${langue === 'fr' ? '?lang=en' : ''}`}>{langue === 'en' ? 'Français' : 'English'}</Link>
  </header>;
}
