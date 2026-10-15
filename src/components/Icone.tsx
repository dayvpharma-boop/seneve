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
} as const;

export type NomIcone = keyof typeof TRACES;

export function Icone({ nom, taille = 24, className }: { nom: NomIcone; taille?: number; className?: string }) {
  return <svg className={className} width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{TRACES[nom]}</svg>;
}
