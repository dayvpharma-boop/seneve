/** File locale des actions du jour notées sans réseau (cahier des charges n° 12, §7 ; décision du 29/10/2026).
 * - Une entrée par action du jour, rangée par compte : un autre participant ne voit ni n'envoie jamais la file d'un autre.
 * - L'identifiant d'événement est créé une fois et réutilisé à chaque envoi : le serveur ne compte jamais deux fois.
 * - Le serveur décide seul : heure du serveur, inscription active, activité autorisée. Un refus est affiché, jamais effacé en silence.
 * - Aucun texte privé : seulement des identifiants, le choix et la date de l'appareil. */
import { useEffect, useState } from 'react';

export type ChoixHorsLigne = 'realisee' | 'partielle' | 'preparee';
export type StatutEntree = 'appareil' | 'attente' | 'envoi' | 'refuse';
export type EntreeFile = { id: string; enrollmentId: string; activityId: string; choix: ChoixHorsLigne; cree_le: string; statut: StatutEntree };
export type ReponseServeur = { etat?: string; aide_demandee?: boolean };
type ErreurRpc = { code?: string; message?: string } | null;
export type TransportFile = { rpc: (nom: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: ErreurRpc }> };

const PREFIXE = 'seneve:file-actions:v1:';
/** Refus définitifs du serveur (inscription inactive, activité non autorisée, identifiant déjà utilisé, valeur invalide). */
const REFUS = new Set(['42501', '22023', '23505']);

type Evenement = { userId: string; entree: EntreeFile; resultat?: ReponseServeur };
const abonnes = new Set<(e: Evenement) => void>();
const emettre = (e: Evenement) => { for (const f of abonnes) f(e); };

function lire(userId: string): EntreeFile[] {
  try { const v = JSON.parse(localStorage.getItem(PREFIXE + userId) ?? '[]'); return Array.isArray(v) ? v as EntreeFile[] : []; } catch { return []; }
}
function ecrire(userId: string, liste: EntreeFile[]): boolean {
  try {
    if (liste.length) localStorage.setItem(PREFIXE + userId, JSON.stringify(liste)); else localStorage.removeItem(PREFIXE + userId);
    return JSON.stringify(lire(userId)) === JSON.stringify(liste);
  } catch { return false; }
}

export const entreesFile = (userId: string) => lire(userId);
export const entreeDe = (userId: string, enrollmentId: string, activityId: string) => lire(userId).find(e => e.enrollmentId === enrollmentId && e.activityId === activityId) ?? null;

/** Garde l'action sur l'appareil. Renvoie null si le stockage refuse : rien n'est alors annoncé comme gardé. */
export function garderAction(userId: string, enrollmentId: string, activityId: string, choix: ChoixHorsLigne, maintenant = new Date(), genererId: () => string = () => crypto.randomUUID()): EntreeFile | null {
  const liste = lire(userId);
  const ancienne = liste.find(e => e.enrollmentId === enrollmentId && e.activityId === activityId);
  // Une entrée déjà en cours d'envoi garde son identifiant : sa réponse peut encore arriver.
  if (ancienne?.statut === 'envoi') return null;
  const entree: EntreeFile = { id: genererId(), enrollmentId, activityId, choix, cree_le: maintenant.toISOString(), statut: 'appareil' };
  const suivante = [...liste.filter(e => e !== ancienne), entree];
  if (!ecrire(userId, suivante)) return null;
  emettre({ userId, entree });
  return entree;
}

function maj(userId: string, id: string, statut: StatutEntree): EntreeFile | null {
  const liste = lire(userId), i = liste.findIndex(e => e.id === id);
  if (i < 0) return null;
  const e = { ...liste[i]!, statut };
  liste[i] = e; ecrire(userId, liste);
  return e;
}

/** La réponse confirme le choix (un état déjà plus avancé compte aussi). */
export function reponseConfirme(choix: string, r: ReponseServeur | null): boolean {
  if (!r) return false;
  return choix === 'aide_demandee' ? r.aide_demandee === true
    : choix === 'realisee' ? r.etat === 'realisee'
    : choix === 'partielle' ? (r.etat === 'partielle' || r.etat === 'realisee')
    : (r.etat === 'preparee' || r.etat === 'partielle' || r.etat === 'realisee');
}

let envoiEnCours: Promise<void> | null = null;
/** Envoie les entrées en attente, une par une, avec leur identifiant d'origine. Sans réseau ou session, elles restent en attente. */
export function envoyerFile(userId: string, transport: TransportFile, aussiRefusees = false): Promise<void> {
  if (envoiEnCours) return envoiEnCours;
  envoiEnCours = (async () => {
    for (const depart of lire(userId)) {
      if (depart.statut === 'refuse' && !aussiRefusees) continue;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
      const e = maj(userId, depart.id, 'envoi'); if (!e) continue;
      emettre({ userId, entree: e });
      let data: unknown = null, error: ErreurRpc = null;
      try { ({ data, error } = await transport.rpc('record_progress', { p_enrollment_id: e.enrollmentId, p_activity_id: e.activityId, p_client_event_id: e.id, p_etat: e.choix, p_canal: 'web' })); }
      catch { error = { message: 'network' }; }
      const r = data as ReponseServeur | null;
      if (!error && reponseConfirme(e.choix, r)) {
        ecrire(userId, lire(userId).filter(x => x.id !== e.id));
        emettre({ userId, entree: { ...e, statut: 'envoi' }, resultat: r! });
        continue;
      }
      const refus = Boolean(error?.code && REFUS.has(error.code)) || (!error && !reponseConfirme(e.choix, r));
      const suivante = maj(userId, e.id, refus ? 'refuse' : 'attente');
      if (suivante) emettre({ userId, entree: suivante });
      if (!refus) break; // panne réseau ou session : inutile d'insister sur les suivantes
    }
  })().finally(() => { envoiEnCours = null; });
  return envoiEnCours;
}

/** Suit l'entrée d'une action. `resultat` arrive une seule fois, quand le serveur a accepté l'action. */
export function useEntreeFile(userId: string | undefined, enrollmentId: string, activityId: string) {
  const [entree, setEntree] = useState<EntreeFile | null>(() => userId ? entreeDe(userId, enrollmentId, activityId) : null);
  const [resultat, setResultat] = useState<ReponseServeur | null>(null);
  useEffect(() => {
    if (!userId) return;
    setEntree(entreeDe(userId, enrollmentId, activityId));
    const f = (ev: Evenement) => {
      if (ev.userId !== userId || ev.entree.enrollmentId !== enrollmentId || ev.entree.activityId !== activityId) return;
      if (ev.resultat) { setEntree(null); setResultat(ev.resultat); } else setEntree(ev.entree);
    };
    abonnes.add(f);
    return () => { abonnes.delete(f); };
  }, [userId, enrollmentId, activityId]);
  return { entree, resultat };
}
