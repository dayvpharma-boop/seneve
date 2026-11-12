import type { ReactNode } from 'react';
import { LogoSeneve } from '@/components/LogoSeneve';

/** Barre du haut des pages de l'espace (maquettes validées le 19/10/2026) : logo graine, SÉNEVÉ,
 *  salutation facultative, et à droite un élément au choix (pastille de l'initiale, lien de langue). */
export function BarreEspace({ salut, droite }: { salut?: string; droite?: ReactNode }) {
  return <div className="barre-haut barre-espace">
    <p className="brand logo-marque"><LogoSeneve taille={20} />SÉNEVÉ{salut && <span className="barre-salut">· {salut}</span>}</p>
    {droite}
  </div>;
}
