/** Icônes au trait du profil et des réglages (dessins originaux SÉNEVÉ, 31/10/2026). Décoratives : aria-hidden. */
const TRACES = {
  aide: <><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a3 3 0 0 1 5.6 1c0 2-3 2.6-3 4.3"/><path d="M12 17.6h.01"/></>,
  cloche: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></>,
  reglages: <><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
  photo: <><path d="M3 8.5A2 2 0 0 1 5 6.5h2.2L9 4h6l1.8 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/></>,
  graine: <><path d="M12 3c4 3.5 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6.5 6-10z"/><path d="M12 9v9"/></>,
  pousse: <><path d="M12 21v-9"/><path d="M12 12C12 7 8.5 5 4 5c0 4.5 3 7 8 7z"/><path d="M12 10c0-3.5 2.5-5.5 7-5.5 0 4-2.5 6.5-7 6.5"/></>,
  tige: <><path d="M12 22V6"/><path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 10c3 0 5-2 5-5-3 0-5 2-5 5z"/></>,
  arbre: <><path d="M12 22v-7"/><path d="M12 15c-4.5 0-7-2.3-7-5.5S8 3 12 3s7 3.3 7 6.5S16.5 15 12 15z"/><path d="M12 15l-3-3M12 13l3-3"/></>,
  envoyer: <><path d="M21.5 3 10 14"/><path d="M21.5 3 15 21l-5-7-7-5z"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  bas: <path d="m5 9 7 7 7-7"/>,
  retour: <path d="m15 5-7 7 7 7"/>,
  objectif: <><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></>,
  verset: <path d="m14.5 4.5 5 5L9 20H4v-5z"/>,
  note: <><rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/></>,
  parcours: <><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/></>,
  livre: <><path d="M3 5.5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z"/><path d="M12 6v13.5"/></>,
  arobase: <><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></>,
  cadenas: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  cle: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/></>,
  courriel: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/></>,
  message: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></>,
  calendrier: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></>,
  langue: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18"/></>,
  lune: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/></>,
  ticket: <><path d="M3 8V6h18v2a2.5 2.5 0 0 0 0 5v5H3v-5a2.5 2.5 0 0 0 0-5z"/><path d="M14 6v12"/></>,
  bouclier: <><path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/></>,
  telecharger: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>,
  equipe: <><path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/></>,
  journal: <><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 20h6"/></>,
} as const;
export type SymboleTrait = keyof typeof TRACES;
export function IconeTrait({ nom, taille = 22 }: { nom: SymboleTrait; taille?: number }) {
  return <svg className="icone-trait" width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{TRACES[nom]}</svg>;
}
