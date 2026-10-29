/** Centre de notifications (décision de Dr Justin du 29/10/2026) : annonces de l'administration, réponses de l'équipe,
 * historique des rappels. Lecture par seneve.mes_notifications (seneve_049) : le participant ne voit que ce qui le concerne. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ElementNotification =
  | { type: 'annonce'; id: string; date: string; titre: string; texte: string; langue: string; image?: string | null; video?: string | null }
  | { type: 'reponse'; id: string; date: string; texte: string; request_id: string }
  | { type: 'rappel_moment'; id: string; date: string; moment: string }
  | { type: 'rappel_habitude'; id: string; date: string; activity_id: string; habit_key: string | null };
export type Notifications = { vu_jusqu_a: string | null; non_lues: number; elements: (ElementNotification & { nouveau?: boolean })[] };

const TYPES = new Set(['annonce', 'reponse', 'rappel_moment', 'rappel_habitude']);

export async function chargerNotifications(limite = 50): Promise<Notifications> {
  const { data, error } = await supabase.rpc('mes_notifications', { p_limite: limite });
  if (error || !data || typeof data !== 'object') throw error ?? new Error('Notifications indisponibles');
  const d = data as Partial<Notifications>;
  if (!Array.isArray(d.elements) || typeof d.non_lues !== 'number') throw new Error('Réponse invalide');
  return { vu_jusqu_a: typeof d.vu_jusqu_a === 'string' ? d.vu_jusqu_a : null, non_lues: d.non_lues, elements: d.elements.filter(e => e && TYPES.has((e as { type?: string }).type ?? '') && typeof e.id === 'string' && typeof e.date === 'string') };
}

const EVENEMENT = 'seneve:notifications-vues';
/** Tout ce qui est affiché est vu (heure du serveur) ; la cloche se met à jour aussitôt. */
export async function marquerNotificationsVues(): Promise<void> {
  const { error } = await supabase.rpc('marquer_notifications_vues');
  if (error) throw error;
  try { window.dispatchEvent(new Event(EVENEMENT)); } catch { /* sans fenêtre */ }
  await effacerNotificationsTelephone();
}

type NavigateurPastille = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
/** Chiffre sur l'icône de SÉNEVÉ (demande de Dr Justin du 29/10/2026). iPhone (écran d'accueil) et ordinateur :
 *  le site fixe le chiffre. Android : le chiffre vient des notifications présentes, retirées par effacerNotificationsTelephone.
 *  Sans prise en charge par le navigateur, rien ne se passe. */
export function afficherPastilleApplication(n: number): void {
  try {
    const nav = navigator as NavigateurPastille;
    if (n > 0) void nav.setAppBadge?.(n)?.catch(() => undefined);
    else void nav.clearAppBadge?.()?.catch(() => undefined);
  } catch { /* non pris en charge */ }
}

/** Tout est lu : les notifications SÉNEVÉ encore affichées sur le téléphone sont retirées, et le chiffre de l'icône aussi. */
export async function effacerNotificationsTelephone(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const liste = (await reg?.getNotifications?.()) ?? [];
    for (const x of liste) x.close();
  } catch { /* notifications non prises en charge */ }
  afficherPastilleApplication(0);
}

/** Nombre d'annonces, de réponses et de rappels non vus (seneve_050) ; null si inconnu (sans réseau, sans session) : aucune pastille alors. */
export function useNonLues(): number | null {
  const [n, setN] = useState<number | null>(null);
  const lire = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setN(null); return; }
    void chargerNotifications(1).then(r => { setN(r.non_lues); afficherPastilleApplication(r.non_lues); }, () => setN(null));
  }, []);
  useEffect(() => {
    lire();
    const vu = () => setN(0);
    const visible = () => { if (document.visibilityState === 'visible') lire(); };
    // Un rappel vient d'arriver sur ce téléphone : le serveur le note juste après l'envoi, on relit donc deux fois.
    const minuteurs: number[] = [];
    const signal = (ev: MessageEvent) => { if ((ev.data as { type?: string } | null)?.type === 'seneve-notification') { minuteurs.push(window.setTimeout(lire, 3000), window.setTimeout(lire, 15000)); } };
    const regulier = window.setInterval(() => { if (document.visibilityState === 'visible') lire(); }, 120000);
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    window.addEventListener(EVENEMENT, vu); window.addEventListener('focus', lire); window.addEventListener('online', lire);
    document.addEventListener('visibilitychange', visible); sw?.addEventListener?.('message', signal);
    return () => {
      window.removeEventListener(EVENEMENT, vu); window.removeEventListener('focus', lire); window.removeEventListener('online', lire);
      document.removeEventListener('visibilitychange', visible); sw?.removeEventListener?.('message', signal);
      window.clearInterval(regulier); minuteurs.forEach(t => window.clearTimeout(t));
    };
  }, [lire]);
  return n;
}

/** Libellés publics des rappels : les mêmes que ceux envoyés sur le téléphone (envoyer-rappels, envoyer-rappels-hd). */
export const NOMS_HABITUDES: Record<string, readonly [string, string]> = {
  reveil: ['Réveil', 'Wake up'], gratitude_matin: ['Gratitude du matin', 'Morning gratitude'],
  priere_matin: ['Prière du matin', 'Morning prayer'], bible_matin: ['Bible du matin', 'Morning Bible reading'],
  exercice: ['Exercice doux', 'Gentle exercise'], lecture_pro: ['Lecture professionnelle', 'Professional reading'],
  priere_midi: ['Prière de midi', 'Midday prayer'], predication: ['Écoute d’une prédication', 'Listen to a sermon'],
  lecture_personnelle: ['Développement personnel', 'Personal development reading'], bible_soir: ['Bible du soir', 'Evening Bible reading'],
  gratitude_soir: ['Gratitude du soir', 'Evening gratitude'], priere_soir: ['Prière du soir', 'Evening prayer'],
  coucher: ['Coucher', 'Bedtime'], culte_semaine: ['Culte en semaine', 'Weekday worship'], culte_dimanche: ['Culte du dimanche', 'Sunday worship'],
};
export const TEXTES_MOMENTS: Record<'fr' | 'en', Record<string, string>> = {
  fr: { matin: 'Ta graine du jour t’attend. Un enseignement, une action : quelques minutes suffisent.', midi: 'Où en est ton action du jour ? Même un petit pas compte.', soir: 'Avant de dormir, prends un instant pour noter ta journée.' },
  en: { matin: 'Today’s seed is waiting. One teaching, one action: a few minutes are enough.', midi: 'How is today’s action going? Even a small step counts.', soir: 'Before you sleep, take a moment to note your day.' },
};
