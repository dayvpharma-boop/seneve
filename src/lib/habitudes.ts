/** Bilan de lecture uniquement. Les droits et écritures restent contrôlés côté serveur.
 * Une occurrence est propre à une inscription, une version et une date locale.
 * Les états reçus doivent être des instantanés consolidés, pas un journal d'événements.
 */
export type EtatHabitude = 'non_commencee' | 'preparee' | 'partielle' | 'realisee';
export type OccurrenceHabitude = Readonly<{
  occurrence_id: string; enrollment_id: string; version: number;
  date_locale: string; requise: boolean;
}>;
export type EtatOccurrence = Readonly<{
  occurrence_id: string; enrollment_id: string; version: number; date_locale: string;
  etat: EtatHabitude; aide_demandee: boolean; synchronisation: 'local' | 'synchronise';
}>;
export type ContexteJour = Readonly<{ enrollment_id: string; version: number; date_locale: string }>;
export type BilanHabitudes = Readonly<{
  total: number; realisees: number; partielles: number; preparees: number;
  non_commencees: number; aides: number; en_attente: number;
  requises: number; requises_realisees: number;
  journee: 'non_evaluee' | 'non_commencee' | 'preparee' | 'partielle' | 'realisee';
}>;
const ETATS = new Set(['non_commencee', 'preparee', 'partielle', 'realisee']);
function dateValide(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + 'T00:00:00Z'))
    && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}
function memeContexte(ligne: ContexteJour, ctx: ContexteJour): boolean {
  return ligne.enrollment_id === ctx.enrollment_id && ligne.version === ctx.version && ligne.date_locale === ctx.date_locale;
}
export function bilanHabitudes(ctx: ContexteJour, occurrences: readonly OccurrenceHabitude[], etats: readonly EtatOccurrence[]): BilanHabitudes {
  if (!ctx.enrollment_id || !Number.isInteger(ctx.version) || ctx.version < 1 || !dateValide(ctx.date_locale)) {
    throw new Error('Contexte de journée invalide');
  }
  const plan = new Map<string, OccurrenceHabitude>();
  for (const o of occurrences.filter(o => memeContexte(o, ctx))) {
    if (!o.occurrence_id || typeof o.requise !== 'boolean') throw new Error('Occurrence invalide');
    const precedent = plan.get(o.occurrence_id);
    if (precedent && precedent.requise !== o.requise) throw new Error('Occurrence contradictoire');
    plan.set(o.occurrence_id, o);
  }
  const consolides = new Map<string, EtatOccurrence>();
  const locaux = new Set<string>();
  for (const e of etats.filter(e => memeContexte(e, ctx))) {
    if (!plan.has(e.occurrence_id)) throw new Error('État sans occurrence planifiée');
    if (!ETATS.has(e.etat) || typeof e.aide_demandee !== 'boolean' || !['local', 'synchronise'].includes(e.synchronisation)) {
      throw new Error('État invalide');
    }
    if (e.synchronisation === 'local') { locaux.add(e.occurrence_id); continue; }
    const precedent = consolides.get(e.occurrence_id);
    if (precedent && (precedent.etat !== e.etat || precedent.aide_demandee !== e.aide_demandee)) {
      throw new Error('Instantanés serveur contradictoires');
    }
    consolides.set(e.occurrence_id, e);
  }
  let realisees=0, partielles=0, preparees=0, non_commencees=0, aides=0, requises=0, requises_realisees=0;
  for (const [id,o] of plan) {
    const e=consolides.get(id); const etat=e?.etat ?? 'non_commencee';
    if (etat==='realisee') realisees++;
    else if (etat==='partielle') partielles++;
    else if (etat==='preparee') preparees++;
    else non_commencees++;
    if (e?.aide_demandee) aides++;
    if (o.requise) { requises++; if (etat==='realisee') requises_realisees++; }
  }
  // Une activité locale ne constitue jamais la preuve d'une réalisation synchronisée.
  // Aucun score de foi : « réalisée » décrit seulement les activités requises confirmées.
  const journee = requises===0 ? 'non_evaluee'
    : requises_realisees===requises ? 'realisee'
    : realisees>0 || partielles>0 ? 'partielle'
    : preparees>0 ? 'preparee' : 'non_commencee';
  return { total:plan.size, realisees, partielles, preparees, non_commencees, aides,
    en_attente:locaux.size, requises, requises_realisees, journee };
}
