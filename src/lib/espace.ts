export const TOTAL_DAYS = 7;

function kinshasaDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function toUtcDay(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86400000;
}

export function rawDay(dateDebut: string, now: Date): number {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(dateDebut) ? dateDebut : kinshasaDate(new Date(dateDebut));
  return toUtcDay(kinshasaDate(now)) - toUtcDay(start) + 1;
}

/**
 * Jour du parcours (fuseau Africa/Kinshasa) : jours calendaires depuis date_debut + 1.
 * notStarted : la date de début n'est pas encore arrivée (aucun jour n'est ouvert).
 */
export function dayInfo(dateDebut: string, now: Date = new Date(), total: number = TOTAL_DAYS): { day: number; finished: boolean; notStarted: boolean } {
  const raw = rawDay(dateDebut, now);
  return { day: Math.min(total, Math.max(1, raw)), finished: raw > total, notStarted: raw < 1 };
}

type Pickable = { date_debut: string; duree: number };

/**
 * Parcours affiché par défaut quand le compte en a plusieurs :
 * 1) un parcours en cours (le plus récemment commencé) ; 2) sinon le prochain à commencer ;
 * 3) sinon le dernier terminé.
 */
export function pickDefault<T extends Pickable>(list: T[], now: Date = new Date()): T | null {
  const withRaw = list.map(e => ({ e, raw: rawDay(e.date_debut, now) }));
  const running = withRaw.filter(x => x.raw >= 1 && x.raw <= x.e.duree).sort((a, b) => a.raw - b.raw);
  if (running[0]) return running[0].e;
  const future = withRaw.filter(x => x.raw < 1).sort((a, b) => b.raw - a.raw);
  if (future[0]) return future[0].e;
  const done = withRaw.sort((a, b) => a.raw - b.raw);
  return done[0]?.e ?? null;
}

export function fillPrenom(text: string, prenom: string | null | undefined): string {
  return text.split('{prenom}').join((prenom ?? '').trim()).replace(/ {2,}/g, ' ').replace(/ ([,.])/g, '$1');
}

/**
 * Texte affiché sur le web : même contenu que le message d'origine, sans l'invitation
 * « Tu peux répondre ici… » qui ne vaut que pour WhatsApp (pas de champ de réponse sur le web).
 */
export function webText(text: string, prenom: string | null | undefined): string {
  return fillPrenom(text, prenom)
    .replace(/\s*Tu peux répondre ici[^.!?]*[.!?]/g, '')
    .replace(/\s*(You can reply here|If you have any trouble accessing it, let us know here)[^.!?]*[.!?]/g, '')
    .trim();
}

/** Identifiant d'événement : réutilise celui du clic en attente, sinon en génère un nouveau. */
export function eventIdFor(pending: string | null | undefined, generate: () => string = () => crypto.randomUUID()): string {
  return pending ?? generate();
}
