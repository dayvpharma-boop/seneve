import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/** Remonte les écrans privés quand le compte change, y compris dans un autre onglet. */
export function ComptePrive({ enfants }: { enfants: (userId: string) => ReactNode }) {
  const [compte, setCompte] = useState<string | null | undefined>(undefined);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  const revision = useRef(0);
  const location = useLocation();
  const en = new URLSearchParams(location.search).get('lang') === 'en';
  useEffect(() => {
    let actif = true;
    const abonnement = supabase.auth.onAuthStateChange?.((_event, session) => {
      revision.current++;
      if (actif) { setErreur(false); setCompte(session?.user.id ?? null); }
    });
    const auDepart = revision.current;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!actif || revision.current !== auDepart) return;
      if (error) { setErreur(true); return; }
      setCompte(data.session?.user.id ?? null);
    }).catch(() => { if (actif && revision.current === auDepart) setErreur(true); });
    return () => { actif = false; abonnement?.data.subscription.unsubscribe(); };
  }, [essai]);
  if (erreur) return <main className="wrap" lang={en ? 'en' : 'fr'}><p role="alert">{en ? 'Unable to check your connection.' : 'Impossible de vérifier ta connexion.'}</p><button className="btn" onClick={() => { setErreur(false); setEssai(n => n + 1); }}>{en ? 'Try again' : 'Réessayer'}</button></main>;
  if (compte === undefined) return <main className="wrap" lang={en ? 'en' : 'fr'}><p role="status">{en ? 'Loading…' : 'Chargement…'}</p></main>;
  // Une page privée ouverte en anglais (?lang=en) mène à la page de connexion anglaise.
  if (!compte) return <Navigate to={en ? '/connexion?lang=en' : '/connexion'} replace state={location.pathname === '/journal' ? { retourJournal: location.pathname + location.search, citationBiblique: location.state?.citationBiblique } : null} />;
  return <div key={compte} style={{ display: 'contents' }}>{enfants(compte)}</div>;
}
