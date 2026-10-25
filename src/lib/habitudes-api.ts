import type {ContexteJour, OccurrenceHabitude, EtatOccurrence} from './habitudes.ts';

/** Adaptateur pour les activités datées déjà publiées par SÉNEVÉ.
 * Ne permet ni création de droit ni création de contenu. Pas de simulation implicite.
 */
type ContexteProgramme = ContexteJour & {programme_id: string; langue: string; jour: number};
type Contenu = {content_id: string; programme_id: string; version: number; langue: string; jour: number};
type Activite = {activity_id: string; content_id: string; type_activite: string; obligatoire: boolean};
export type TransportProgression = {
  rpc(nom: string, params: Record<string,string>): PromiseLike<{data: unknown; error: unknown}>;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETATS=new Set(['non_commencee','preparee','partielle','realisee']);
export function occurrencesDepuisContenus(ctx: ContexteProgramme, contenus: readonly Contenu[], activites: readonly Activite[]): OccurrenceHabitude[] {
  if (!ctx.programme_id || !ctx.langue || !Number.isInteger(ctx.jour) || ctx.jour<1) throw new Error('Contexte programme invalide');
  const ids=new Set(contenus.filter(c=>c.programme_id===ctx.programme_id && c.version===ctx.version && c.langue===ctx.langue && c.jour===ctx.jour).map(c=>c.content_id));
  const out=new Map<string,OccurrenceHabitude>();
  for(const a of activites.filter(a=>a.type_activite==='action' && ids.has(a.content_id))){
    if(!UUID.test(a.activity_id) || typeof a.obligatoire!=='boolean') throw new Error('Activité publiée invalide');
    const o={occurrence_id:a.activity_id,enrollment_id:ctx.enrollment_id,version:ctx.version,date_locale:ctx.date_locale,requise:a.obligatoire};
    if(out.has(a.activity_id) && out.get(a.activity_id)?.requise!==o.requise) throw new Error('Activité contradictoire');
    out.set(a.activity_id,o);
  }
  return [...out.values()];
}
export type ActionHabitude='preparee'|'partielle'|'realisee'|'aide_demandee';
export async function enregistrerHabitude(transport: TransportProgression, occurrence: OccurrenceHabitude, eventId: string, action: ActionHabitude): Promise<{etat:EtatOccurrence; event_id:string; repetition:boolean}> {
  if(!UUID.test(eventId) || !UUID.test(occurrence.occurrence_id) || !UUID.test(occurrence.enrollment_id)) throw new Error('Identifiant invalide');
  if(!['preparee','partielle','realisee','aide_demandee'].includes(action)) throw new Error('Action invalide');
  // L'appelant garde eventId jusqu'à réception d'une réponse valide et le réutilise après erreur réseau.
  const {data,error}=await transport.rpc('record_progress',{
    p_enrollment_id:occurrence.enrollment_id,p_activity_id:occurrence.occurrence_id,
    p_client_event_id:eventId,p_etat:action,p_canal:'web',
  });
  if(error) throw error;
  if(!data || typeof data!=='object') throw new Error('Confirmation serveur absente');
  const r=data as Record<string,unknown>;
  if(typeof r.event_id!=='string' || !UUID.test(r.event_id) || typeof r.etat!=='string' || !ETATS.has(r.etat) || typeof r.aide_demandee!=='boolean' || typeof r.repetition!=='boolean') throw new Error('Confirmation serveur invalide');
  const rang:Record<string,number>={non_commencee:0,preparee:1,partielle:2,realisee:3};
  if(action==='aide_demandee' ? !r.aide_demandee : rang[r.etat]<rang[action]) throw new Error('Action non confirmée par le serveur');
  return {event_id:r.event_id,repetition:r.repetition,etat:{...occurrence,etat:r.etat as EtatOccurrence['etat'],aide_demandee:r.aide_demandee,synchronisation:'synchronise'}};
}
