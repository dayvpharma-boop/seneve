import {effacerReperesPriere} from './habitudes-priere-reprise';
import {retirerHabitudesDuCache} from './habitudes-cache';
import {effacerSaisiesHabitudes} from './habitudes-saisie';
/** Consultation hors connexion de l'espace : dernière copie des journées déjà chargées, sur cet appareil. */
import { useEffect, useState } from 'react';
import {effacerProfils} from './profil';
import {effacerCopiesProgres} from './progres-copie';
import {effacerCopiesJourHd} from './habitudes-copie-jour';

const PREFIXE = 'seneve:espace:v1:';

export function enregistrerEspace(userId: string, donnees: unknown): void {
  try {
    const copie=retirerHabitudesDuCache(donnees);
    // Supprimer une ancienne copie avant une nouvelle écriture pour un espace HD.
    if(copie!==donnees)localStorage.removeItem(PREFIXE+userId);
    if(copie!==null)localStorage.setItem(PREFIXE+userId,JSON.stringify({le:new Date().toISOString(),donnees:copie}));
  }catch{/* stockage indisponible : on continue sans copie */}
}

export function lireEspace<T>(userId: string): { le: string; donnees: T } | null {
  try {
    const brut = localStorage.getItem(PREFIXE + userId);
    if(!brut)return null;
    const copie=JSON.parse(brut) as {le:string;donnees:T};
    const nettoyee=retirerHabitudesDuCache(copie.donnees);
    if(nettoyee===null){localStorage.removeItem(PREFIXE+userId);return null;}
    if(nettoyee!==copie.donnees){
      // Garder la date réelle de la copie, sans la présenter comme actualisée.
      localStorage.removeItem(PREFIXE+userId);
      localStorage.setItem(PREFIXE+userId,JSON.stringify({...copie,donnees:nettoyee}));
    }
    return {...copie,donnees:nettoyee};
  } catch { return null; }
}

/** Retour dans l'espace (demande de Dr Justin du 30/10/2026) : pendant 30 minutes, la copie de l'appareil
 *  s'affiche sans recharger depuis le serveur. Au-delà, ou dès que la journée a changé, elle s'affiche
 *  quand même tout de suite et les vraies données sont relues en arrière-plan. */
export const FRAICHEUR_ESPACE_MS = 30 * 60 * 1000;

export function copieEncoreFraiche(le: string, maintenant = Date.now()): boolean {
  const t = Date.parse(le);
  if (!Number.isFinite(t)) return false;
  const age = maintenant - t;
  if (age < 0 || age >= FRAICHEUR_ESPACE_MS) return false;
  const jour = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  return jour(t) === jour(maintenant);
}

/** Met à jour la copie après une action notée à l'écran, sans changer sa date (la copie ne paraît pas plus récente). */
export function modifierEspace<T>(userId: string, modifier: (donnees: T) => T): void {
  const copie = lireEspace<T>(userId);
  if (!copie) return;
  try {
    const nouvelle = retirerHabitudesDuCache(modifier(copie.donnees));
    if (nouvelle === null) { localStorage.removeItem(PREFIXE + userId); return; }
    localStorage.setItem(PREFIXE + userId, JSON.stringify({ le: copie.le, donnees: nouvelle }));
  } catch { /* stockage indisponible : la copie sera remplacée au prochain chargement */ }
}

/** À la déconnexion : aucune copie ne reste sur l'appareil. */
export function effacerEspaces(): void {
  effacerProfils();
  effacerCopiesProgres();
  effacerCopiesJourHd();
  effacerSaisiesHabitudes();
  effacerReperesPriere();
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
  // Une copie ancienne du site peut demander le fichier d'une page qui n'existe plus depuis une publication :
  // on recharge une seule fois (au plus toutes les 30 s) pour obtenir la version à jour.
  window.addEventListener('vite:preloadError', e => {
    try {
      const dernier = Number(sessionStorage.getItem('seneve:rechargement') ?? 0);
      if (Date.now() - dernier < 30000) return;
      sessionStorage.setItem('seneve:rechargement', String(Date.now()));
    } catch { return; }
    e.preventDefault();
    window.location.reload();
  });
  window.addEventListener('load', () => { void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined); });
}

