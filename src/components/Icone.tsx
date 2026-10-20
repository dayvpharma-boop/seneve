/** Icônes au trait du système de design SÉNEVÉ (validé le 15/10/2026). Décoratives : le texte voisin porte le sens. */
const TRACES = {
  soleil: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  livre: <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  journal: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 13h4" /></>,
  aide: <><path d="M12 7.5c-1-1.6-3.6-1.7-4.4.2-.6 1.5.4 2.9 4.4 5.8 4-2.9 5-4.3 4.4-5.8-.8-1.9-3.4-1.8-4.4-.2z" /><path d="M3 17l3-2h5l3 1 4-2 3 2-6 4H8l-5-1" /></>,
  coche: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  cadenas: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  lever: <path d="M3 18h18M6 14a6 6 0 0 1 12 0M12 4v3M4.9 8.9l1.4 1.4M19.1 8.9l-1.4 1.4" />,
  midi: <><circle cx="12" cy="10" r="4" /><path d="M12 2v2M4 10H2M22 10h-2M5.6 4.6l1.4 1.4M18.4 4.6L17 6M3 20h18" /></>,
  lune: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  fleche: <path d="M5 12h14M13 6l6 6-6 6" />,
  retour: <path d="M15 18l-6-6 6-6" />,
  crayon: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>,
  coach: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  // Icônes ajoutées avec la direction visuelle validée le 19/10/2026 (maquettes Stitch corrigées).
  graine: <g transform="translate(2 0) scale(.085)" stroke="none">
    <ellipse cx="110" cy="205" rx="36" ry="25" fill="var(--foreground)" transform="rotate(-15 110 205)" />
    <path d="M92 220C85 240 70 252 56 262" fill="none" stroke="var(--or)" strokeWidth="6" />
    <path d="M110 185C110 120 135 80 160 50C165 90 145 135 128 165" fill="var(--or)" />
    <path d="M112 135C88 118 72 90 78 72C104 76 114 105 112 135" fill="var(--foreground)" />
    <circle cx="160" cy="36" r="9" fill="var(--or)" />
  </g>,
  bouclier: <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z" />,
  liste: <><path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 5.5l1 .5v3M4 12h2l-2 2.5h2M4 17h2v2H4.5M4 19h2v2H4" /></>,
  annuler: <><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  citation: <path d="M5 11h4v6H4v-4c0-3 1-5 4-6M15 11h4v6h-5v-4c0-3 1-5 4-6" />,
  horloge: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  personne: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  fleche_gauche: <path d="M19 12H5M11 6l-6 6 6 6" />,
  fleche_haut: <path d="M12 19V5M6 11l6-6 6 6" />,
  sablier: <path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9" />,
  valide: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  verifie: <><path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9L3.3 15.2l1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  souvenir: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
} as const;

export type NomIcone = keyof typeof TRACES;

export function Icone({ nom, taille = 24, className }: { nom: NomIcone; taille?: number; className?: string }) {
  return <svg className={className} width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{TRACES[nom]}</svg>;
}
