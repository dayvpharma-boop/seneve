import {rendezVousCalendrier} from './habitudes-calendrier-export';
import type {ConfigurationHoraires} from './habitudes-horaires-api';

export const PREMIER_ID_LOCAL = 1_600_000_000;
export const MAX_RAPPELS_LOCAUX = 60;
export const estIdRappelLocal = (id:number) =>
  Number.isInteger(id) && id >= PREMIER_ID_LOCAL && id < PREMIER_ID_LOCAL + MAX_RAPPELS_LOCAUX;
export type RappelLocal = {id:number;instant:number;titre:string};
export type PlanLocal = {rappels:RappelLocal[];limiteAtteinte:boolean;fin:number;langue:string};

/** Sept dates civiles, bornées par le droit déjà vérifié. Jamais de répétition infinie. */
export function preparerRappelsLocaux(
  config:ConfigurationHoraires, participantId:string, date:string,
  cles:readonly string[], finAcces:string, now=new Date(),
):PlanLocal {
  const fin=Date.parse(finAcces);
  if(!Number.isFinite(fin)||fin<=+now)throw Error('Accès à actualiser');
  const rdv=rendezVousCalendrier(config,participantId,date,cles,now)
    .filter(r=>r.instant<fin).sort((a,b)=>a.instant-b.instant);
  const groupes=new Map<number,string[]>();
  for(const r of rdv)groupes.set(r.instant,[...new Set([...(groupes.get(r.instant)??[]),r.titre])]);
  const tous=[...groupes].map(([instant,titres],i)=>({
    id:PREMIER_ID_LOCAL+i, instant, titre:('SÉNEVÉ — '+titres.join(' · ')).slice(0,180),
  }));
  return {rappels:tous.slice(0,MAX_RAPPELS_LOCAUX),limiteAtteinte:tous.length>MAX_RAPPELS_LOCAUX,fin,langue:config.modeles[0]?.langue??'fr'};
}

