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

/** En-tête des messages WhatsApp (« Bonjour {prenom} 🌱 Jour 3/14 — ») : sur le web, la page affiche déjà
 *  la salutation et le jour, on le retire (décision du 15/10/2026 ; 730 contenus sur 1 026 concernés). */
const ENTETE_MESSAGE = /^(?:Bonjour|Bonsoir|Hello|Hi|Good morning|Good evening)\s+\{prenom\}\s*\S*\s*(?:Jour|Day)\s+\d+\s*\/\s*\d+\s*[—–-]\s*/u;

/**
 * Texte affiché sur le web : même contenu que le message d'origine, sans l'en-tête de salutation
 * ni l'invitation « Tu peux répondre ici… » qui ne valent que pour WhatsApp.
 */
export function webText(text: string, prenom: string | null | undefined): string {
  return fillPrenom(text.replace(ENTETE_MESSAGE, ''), prenom)
    .replace(/\s*Tu peux répondre ici[^.!?]*[.!?]/g, '')
    .replace(/\s*(You can reply here|If you have any trouble accessing it, let us know here)[^.!?]*[.!?]/g, '')
    .trim();
}

/** Heure actuelle à Kinshasa, au format HH:MM (même fuseau que le calcul des jours). */
export function heureKinshasa(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kinshasa', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

/**
 * Un moment de la journée (message 2 ou 3) est-il visible ?
 * Les jours passés et les parcours terminés montrent tous leurs moments. Le jour en cours suit les horaires
 * du programme, comme les messages WhatsApp. Sans horaire valide, le moment est visible dès l'ouverture du jour.
 */
export function momentVisible(heure: string | null | undefined, jourAffiche: number, jourEnCours: number, termine: boolean, now: Date = new Date()): boolean {
  if (termine || jourAffiche < jourEnCours) return true;
  if (!heure || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) return true;
  return heureKinshasa(now) >= heure;
}

/** Identifiant d'événement : réutilise celui du clic en attente, sinon en génère un nouveau. */
export function eventIdFor(pending: string | null | undefined, generate: () => string = () => crypto.randomUUID()): string {
  return pending ?? generate();
}
