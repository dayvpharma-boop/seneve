import { Link } from 'react-router-dom';
import { IconeNotification } from '@/components/IconeNotification';
import { useNonLues } from '@/lib/notifications';

/** Cloche de l'en-tête (demande de Dr Justin du 29/10/2026) : ouvre la page Notifications ; la pastille compte
 *  les annonces et les réponses de l'équipe non vues. Sans réseau, aucune pastille n'est inventée. */
export function ClocheNotifications({ langue, className = '' }: { langue: string; className?: string }) {
  const en = langue === 'en';
  const n = useNonLues();
  const libelle = n && n > 0 ? (en ? `Notifications, ${n} new` : `Notifications, ${n} ${n > 1 ? 'nouvelles' : 'nouvelle'}`) : 'Notifications';
  return <Link className={`cloche-notifications ${className}`} to={en ? '/notifications?lang=en' : '/notifications'} aria-label={libelle}>
    <IconeNotification nom="notifications" taille={24} />
    {n !== null && n > 0 && <span className="cloche-pastille" aria-hidden="true">{n > 9 ? '9+' : n}</span>}
  </Link>;
}
