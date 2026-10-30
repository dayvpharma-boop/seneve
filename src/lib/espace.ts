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

const SALUTATION = /^(?:(?:Bonjour|Bonsoir|Hello|Hi|Good morning|Good evening)\s+)?\{prenom\}[\s,!]*(?:[\p{Extended_Pictographic}️‍]+\s*)*/u;
const REPERE_JOUR = /^(?:(?:Jour|Day)\s+\d+(?:\s*\/\s*\d+)?|Continuité|Continuity|(?:Mois|Month)\s+\d+,\s*(?:jour|day)\s+\d+)\s*[—–-]\s*/iu;
const sansPonctuation = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Début du vrai message d'un moment, affiché sur sa carte quand le contenu n'a pas d'explication
 * (décision du 23/10/2026) : sans salutation, sans « Jour 11/30 — », sans la phrase qui répète le titre.
 */
export function apercuMoment(texte: string, theme: string, prenom: string | null | undefined, max = 150): string {
  let t = texte.trim().replace(SALUTATION, '');
  while (REPERE_JOUR.test(t)) t = t.replace(REPERE_JOUR, '');
  const premiere = /^([^.!?]+)[.!?]\s+/.exec(t);
  if (premiere && sansPonctuation(premiere[1] ?? '') === sansPonctuation(theme)) t = t.slice(premiere[0].length);
  t = webText(t, prenom);
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(' ') > max * 0.6 ? coupe.lastIndexOf(' ') : max).replace(/[\s,;:.!?—–-]+$/, '')}…`;
}

/**
 * Texte affiché sur le web : même contenu que le message d'origine, sans l'en-tête de salutation
 * ni l'invitation « Tu peux répondre ici… » qui ne valent que pour WhatsApp.
 */
export function webText(text: string, prenom: string | null | undefined): string {
  return fillPrenom(text.replace(ENTETE_MESSAGE, ''), prenom)
    .replace(/\s*Tu peux répondre ici[^.!?]*[.!?]/g, '')
    .replace(/\s*Si tu as un souci d[’']accès, dis-le-nous ici[^.!?]*[.!?]/g, '')
    .replace(/\s*(You can reply here|If you have any trouble accessing it, let us know here)[^.!?]*[.!?]/g, '')
    // Consigne WhatsApp de la Découverte anglaise (7 contenus) : PAUSE et STOP ne se répondent pas sur le site.
    .replace(/\s*To pause this journey, reply PAUSE[^.!?]*[.!?]/g, '')
    .trim();
}

/** Lien interne qui reste en anglais : ajoute ?lang=en (ou &lang=en) pour un parcours anglais. */
export function avecLangue(chemin: string, langue: string | null | undefined): string {
  return langue === 'en' ? `${chemin}${chemin.includes('?') ? '&' : '?'}lang=en` : chemin;
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

/** Période d'un moment selon son heure (« 08:00 » → matin, « 13:00 » → midi, « 19:00 » → soir) ; sans heure, selon son rang. */
export function periodeMoment(heure: string | null | undefined, rang: number): 'matin' | 'midi' | 'soir' {
  const m = heure ? /^(\d{1,2}):\d{2}$/.exec(heure) : null;
  if (m) { const h = Number(m[1]); return h < 11 ? 'matin' : h < 17 ? 'midi' : 'soir'; }
  return rang <= 1 ? 'matin' : rang === 2 ? 'midi' : 'soir';
}

/** Date (AAAA-MM-JJ) du jour n d'un parcours commencé à dateDebut, au fuseau de Kinshasa. */
export function dateDuJour(dateDebut: string, n: number): Date {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(dateDebut) ? dateDebut : kinshasaDate(new Date(dateDebut));
  const [y, m, d] = start.split('-').map(Number);
  // Midi UTC = 13 h à Kinshasa : la date affichée ne change pas selon le fuseau.
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n - 1, 12));
}

/** Identifiant d'événement : réutilise celui du clic en attente, sinon en génère un nouveau. */
export function eventIdFor(pending: string | null | undefined, generate: () => string = () => crypto.randomUUID()): string {
  return pending ?? generate();
}

/** Onglets des parcours sur une ligne : à l'ouverture, l'onglet choisi est ramené en vue (sans faire défiler la page).
 *  Aujourd'hui (demande de Dr Justin du 30/10/2026) : l'onglet touché glisse jusqu'à la première place, en laissant voir
 *  le bord de l'onglet précédent pour pouvoir revenir en arrière d'un simple toucher. */
export const MARGE_ONGLET_AUJOURDHUI = 44;
let glissement: { depart: number; quand: number } | null = null;
const positionOnglet = (liste: HTMLElement, onglet: HTMLElement, marge: number) =>
  Math.max(0, onglet.getBoundingClientRect().left - liste.getBoundingClientRect().left + liste.scrollLeft - marge);
const animationsPermises = () => { try { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; } };
const defiler = (liste: HTMLElement, left: number, doux: boolean) => {
  if (typeof liste.scrollTo === 'function') liste.scrollTo({ left, behavior: doux && animationsPermises() ? 'smooth' : 'auto' });
  else liste.scrollLeft = left;
};
const apresAffichage = (f: () => void) => { if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(f)); else setTimeout(f, 0); };

/** Onglet touché : il glisse doucement vers la première place de la rangée. */
export function amenerOngletAuDebut(onglet: HTMLElement, marge = MARGE_ONGLET_AUJOURDHUI): void {
  const liste = onglet.parentElement;
  if (!liste) return;
  // Si la page reconstruit la rangée (parcours terminé ou à venir), la nouvelle rangée repart d'ici et glisse à son tour.
  glissement = { depart: liste.scrollLeft, quand: Date.now() };
  defiler(liste, positionOnglet(liste, onglet, marge), true);
}

export function placerOngletActif(liste: HTMLElement | null, marge = 16): void {
  if (!liste) return;
  const cible = () => {
    const actif = liste.querySelector<HTMLElement>('[aria-selected="true"]');
    return actif ? positionOnglet(liste, actif, marge) : 0;
  };
  const recent = glissement && Date.now() - glissement.quand < 2000 ? glissement : null;
  glissement = null;
  if (recent) {
    liste.scrollLeft = recent.depart;
    apresAffichage(() => defiler(liste, cible(), true));
    return;
  }
  liste.scrollLeft = cible();
  // Certains téléphones ignorent la position donnée avant le premier affichage : on la redonne juste après.
  apresAffichage(() => { liste.scrollLeft = cible(); });
  // Les polices du site arrivent parfois après l'affichage et changent la largeur des onglets : on recale une fois.
  try { void document.fonts?.ready.then(() => { liste.scrollLeft = cible(); }); } catch { /* navigateur sans cette information */ }
}
/** Version d'Aujourd'hui (référence stable pour React). */
export const placerOngletAujourdhui = (liste: HTMLElement | null): void => placerOngletActif(liste, MARGE_ONGLET_AUJOURDHUI);
