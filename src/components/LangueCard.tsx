import { useState } from 'react';
import type { Langue } from '@/lib/langue';

export const LANGUE_TEXTES = {
  fr: {
    titre: 'Langue',
    texte: 'Choisis la langue des menus de ton espace : journal, aide, progrès et coach.',
    parcours: 'Les textes de chaque parcours restent dans la langue du parcours.',
    erreur: 'Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.',
  },
  en: {
    titre: 'Language',
    texte: 'Choose the language of the menus in your space: journal, help, progress and coach.',
    parcours: 'The texts of each journey stay in the language of that journey.',
    erreur: 'Your choice was not saved. Check your connection and try again.',
  },
} as const;

const NOMS: Record<Langue, string> = { fr: 'Français', en: 'English' };

/** Choix de la langue des menus (réglages de l'espace). Chaque bouton est écrit dans sa propre langue. */
export function LangueCard({ vue, choix, avecParcours, onChange }: { vue: string; choix: Langue; avecParcours: boolean; onChange: (l: Langue) => Promise<void> }) {
  const T = LANGUE_TEXTES[vue === 'en' ? 'en' : 'fr'];
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState(false);

  async function choisir(l: Langue) {
    if (busy || l === choix) return;
    setBusy(true); setErreur(false);
    try { await onChange(l); } catch { setErreur(true); } finally { setBusy(false); }
  }

  return <div className="card">
    <p className="tag" id="titre-langue">{T.titre}</p>
    <p>{T.texte}</p>
    <div className="choix-double" role="group" aria-labelledby="titre-langue">
      {(['fr', 'en'] as Langue[]).map(l => <button key={l} type="button" lang={l} aria-pressed={choix === l} disabled={busy} onClick={() => void choisir(l)}>{NOMS[l]}</button>)}
    </div>
    {avecParcours && <p className="muted">{T.parcours}</p>}
    {erreur && <p className="error" role="alert">{T.erreur}</p>}
  </div>;
}
