/** Consultation hors connexion de l'espace : dernière copie des journées déjà chargées, sur cet appareil. */
import { useEffect, useState } from 'react';

const PREFIXE = 'seneve:espace:v1:';

export function enregistrerEspace(userId: string, donnees: unknown): void {
  try { localStorage.setItem(PREFIXE + userId, JSON.stringify({ le: new Date().toISOString(), donnees })); } catch { /* stockage indisponible : on continue sans copie */ }
}

export function lireEspace<T>(userId: string): { le: string; donnees: T } | null {
  try {
    const brut = localStorage.getItem(PREFIXE + userId);
    return brut ? (JSON.parse(brut) as { le: string; donnees: T }) : null;
  } catch { return null; }
}

/** À la déconnexion : aucune copie ne reste sur l'appareil. */
export function effacerEspaces(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXE)) localStorage.removeItem(k);
    }
  } catch { /* rien */ }
}

export function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const on = () => setEnLigne(true), off = () => setEnLigne(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return enLigne;
}

export function enregistrerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const base = import.meta.env.BASE_URL;
  window.addEventListener('load', () => { void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined); });
}
