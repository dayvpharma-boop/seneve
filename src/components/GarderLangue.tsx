import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Garde l'anglais d'une page à l'autre (signalé le 24/10/2026 : certains liens des pages anglaises
 * ouvraient la page suivante en français). Si la page précédente était en anglais (?lang=en ou /en)
 * et que la nouvelle adresse ne précise aucune langue, on ajoute ?lang=en. Un choix explicite
 * (?lang=fr, lien « Français ») reste respecté. L'administration n'est pas concernée.
 */
export function langueDeLAdresse(pathname: string, search: string): 'en' | 'fr' | null {
  const l = new URLSearchParams(search).get('lang');
  if (l === 'en' || l === 'fr') return l;
  return pathname === '/en' ? 'en' : null;
}

export function GarderLangue() {
  const location = useLocation();
  const navigate = useNavigate();
  const precedente = useRef<'en' | 'fr' | null>(null);
  useEffect(() => {
    const ici = langueDeLAdresse(location.pathname, location.search);
    if (ici) { precedente.current = ici; return; }
    if (precedente.current === 'en' && !location.pathname.startsWith('/admin')) {
      const params = new URLSearchParams(location.search);
      params.set('lang', 'en');
      navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true, state: location.state });
      return;
    }
    precedente.current = null;
  }, [location, navigate]);
  return null;
}
