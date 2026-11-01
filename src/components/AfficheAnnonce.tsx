import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { lienImageAnnonce } from '@/lib/annonces-medias';
import { langueDeLAdresse } from './GarderLangue';
import './AfficheAnnonce.css';

/** Affiche à l'ouverture de SÉNEVÉ (décision de Dr Justin du 01/11/2026, seneve_054).
 *  Une annonce de l'équipe marquée « afficher à l'ouverture » apparaît une seule fois, en grand, à la première
 *  page participant ouverte. La personne la ferme quand elle veut (✕, « Plus tard », touche Échap) : rien d'autre
 *  ne change (ni parcours, ni droits, ni progression). Jamais sur l'accueil public, la connexion, l'administration,
 *  ni pendant la lecture d'un chapitre de la Bible. Une seule vérification par ouverture de l'application. */
export type Affiche = { id: string; titre: string; texte: string; langue: string; image: string | null; bouton_texte: string | null; bouton_lien: string | null; fin: string | null };

const PAGES_EXCLUES = /^\/(|p|en|connexion|admin|mot-de-passe-oublie|nouveau-mot-de-passe|confidentialite|bible\/[^/]+\/\d+)$/;
const CLE_SESSION = 'seneve:affiche-verifiee';

export function pageAutorisee(chemin: string): boolean {
  return !PAGES_EXCLUES.test(chemin.replace(/\/$/, '') || '/') && chemin !== '/';
}

export function lienInterne(lien: string): boolean { return lien.startsWith('/') && !lien.startsWith('//'); }

async function marquer(id: string, action: 'vue' | 'fermee' | 'plus_tard' | 'bouton') {
  try { await supabase.rpc('affiche_marquer', { p_annonce_id: id, p_action: action }); } catch { /* hors ligne : l'affiche peut revenir une fois */ }
}

export function AfficheAnnonce() {
  const location = useLocation();
  const navigate = useNavigate();
  const [affiche, setAffiche] = useState<Affiche | null>(null);
  const dialogue = useRef<HTMLDialogElement | null>(null);
  const verifiee = useRef(false);
  const autorisee = pageAutorisee(location.pathname);
  const en = (langueDeLAdresse(location.pathname, location.search) ?? document.documentElement.lang?.slice(0, 2)) === 'en';

  useEffect(() => {
    if (!autorisee || verifiee.current) return;
    try { if (sessionStorage.getItem(CLE_SESSION)) { verifiee.current = true; return; } } catch { /* stockage indisponible */ }
    let annule = false;
    const minuterie = window.setTimeout(async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session || annule) return;
        verifiee.current = true;
        try { sessionStorage.setItem(CLE_SESSION, '1'); } catch { /* sans stockage */ }
        const { data, error } = await supabase.rpc('mon_affiche', { p_langue: en ? 'en' : 'fr' });
        if (annule || error || !data || typeof data !== 'object') return;
        const a = data as Affiche;
        if (typeof a.id !== 'string' || typeof a.titre !== 'string') return;
        // Une autre fenêtre est déjà ouverte (prière, durée…) : on ne la recouvre pas.
        if (document.querySelector('dialog[open]')) return;
        setAffiche(a);
        void marquer(a.id, 'vue');
      } catch { /* réseau : on réessaiera à la prochaine ouverture */ }
    }, 1200);
    return () => { annule = true; window.clearTimeout(minuterie); };
  }, [autorisee, en]);

  useEffect(() => {
    const d = dialogue.current;
    if (affiche && d && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
  }, [affiche]);

  // La page change pendant que l'affiche est ouverte (lecture de la Bible, connexion…) : elle se referme sans rien noter de plus.
  useEffect(() => { if (affiche && !autorisee) { dialogue.current?.close(); setAffiche(null); } }, [affiche, autorisee]);

  if (!affiche) return null;
  const a = affiche;
  function fermer(action: 'fermee' | 'plus_tard') { void marquer(a.id, action); dialogue.current?.close(); setAffiche(null); }
  function ouvrir() {
    void marquer(a.id, 'bouton'); dialogue.current?.close(); setAffiche(null);
    if (!a.bouton_lien) return;
    if (lienInterne(a.bouton_lien)) navigate(a.bouton_lien);
    else window.open(a.bouton_lien, '_blank', 'noopener,noreferrer');
  }
  const fin = a.fin ? new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' }).format(new Date(a.fin)) : null;
  return <dialog ref={dialogue} className="aa-affiche" aria-labelledby="aa-titre" onCancel={e => { e.preventDefault(); fermer('fermee'); }}
    onClick={e => { if (e.target === e.currentTarget) fermer('fermee'); }}>
    <div className="aa-carte">
      {a.image ? <div className="aa-image"><img src={lienImageAnnonce(a.image)} alt="" /></div> : <div className="aa-bandeau" aria-hidden="true" />}
      <button type="button" className="aa-fermer" aria-label={en ? 'Close' : 'Fermer'} onClick={() => fermer('fermee')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <div className={`aa-corps${a.image ? '' : ' sans-image'}`}>
        <p className="aa-etiquette">{en ? 'SÉNEVÉ ANNOUNCEMENT' : 'ANNONCE SÉNEVÉ'}</p>
        <h2 id="aa-titre" tabIndex={-1} autoFocus>{a.titre}</h2>
        <p className="aa-texte">{a.texte}</p>
        {a.bouton_texte && a.bouton_lien && <button type="button" className="aa-bouton" onClick={ouvrir}>{a.bouton_texte}</button>}
        <button type="button" className="aa-plus-tard" onClick={() => fermer('plus_tard')}>{en ? 'Later' : 'Plus tard'}</button>
        {fin && <p className="aa-periode">{en ? `Until ${fin}` : `Jusqu’au ${fin}`}</p>}
      </div>
    </div>
  </dialog>;
}
