export const TOTAL_DAYS = 7;

function kinshasaDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function toUtcDay(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86400000;
}

/** Jour du parcours (fuseau Africa/Kinshasa) : jours calendaires depuis date_debut + 1. */
export function dayInfo(dateDebut: string, now: Date = new Date()): { day: number; finished: boolean } {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(dateDebut) ? dateDebut : kinshasaDate(new Date(dateDebut));
  const raw = toUtcDay(kinshasaDate(now)) - toUtcDay(start) + 1;
  return { day: Math.min(TOTAL_DAYS, Math.max(1, raw)), finished: raw > TOTAL_DAYS };
}

export function fillPrenom(text: string, prenom: string | null | undefined): string {
  return text.split('{prenom}').join((prenom ?? '').trim()).replace(/ {2,}/g, ' ').replace(/ ([,.])/g, '$1');
}

/**
 * Texte affiché sur le web : même contenu que le message d'origine, sans l'invitation
 * « Tu peux répondre ici… » qui ne vaut que pour WhatsApp (pas de champ de réponse sur le web).
 */
export function webText(text: string, prenom: string | null | undefined): string {
  return fillPrenom(text, prenom).replace(/\s*Tu peux répondre ici[^.!?]*[.!?]/g, '').trim();
}

/** Identifiant d'événement : réutilise celui du clic en attente, sinon en génère un nouveau. */
export function eventIdFor(pending: string | null | undefined, generate: () => string = () => crypto.randomUUID()): string {
  return pending ?? generate();
}
