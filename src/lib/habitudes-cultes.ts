import {planningHabitudesPourDate} from './habitudes-planning';
import type {ConfigurationHoraires} from './habitudes-horaires-api';

const CULTE=/^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):([12])$/;
export type FiltreCultes=(noteSource:string|null|undefined,dateLocale:string,declaree:boolean)=>boolean;

/** Cultes d'un jour passé ou du suivi : seuls ceux prévus ce jour-là dans le planning personnel sont affichés et comptés,
 * comme sur l'écran « Aujourd'hui » (assemblerJourRecette) et dans la règle du serveur (hd_progress_access_guard).
 * Les trois cultes sont publiés chaque jour ; sans ce tri, aucune journée ne pouvait être complète.
 * Sans planning lisible (accès arrêté, fuseau changé), on garde seulement les cultes déjà déclarés.
 * Un culte déclaré reste toujours visible : le serveur l'a accepté selon le planning de ce jour-là. */
export function filtreCultesPrevus(horaires:ConfigurationHoraires|null):FiltreCultes{
 const parDate=new Map<string,Map<string,number>|null>();
 const rendezVous=(dateLocale:string)=>{
  if(!parDate.has(dateLocale)){
   let compte:Map<string,number>|null=null;
   const modele=horaires?.modeles[0];
   if(horaires&&modele)try{
    // Le planning ne renvoie que les horaires du titulaire ; à défaut, les heures proposées s'appliquent.
    const participant=horaires.horaires[0]?.participant_id??'titulaire';
    const planning=planningHabitudesPourDate({participant_id:participant,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:dateLocale,fuseau:horaires.fuseau},horaires.modeles,horaires.horaires);
    compte=new Map();
    for(const r of planning.rendezVous)compte.set(r.habit_key,(compte.get(r.habit_key)??0)+1);
   }catch{compte=null;}
   parDate.set(dateLocale,compte);
  }
  return parDate.get(dateLocale)!;
 };
 return (noteSource,dateLocale,declaree)=>{
  const culte=CULTE.exec(noteSource??'');
  if(!culte||declaree)return true;
  const compte=rendezVous(dateLocale);
  return compte!==null&&Number(culte[2])<=(compte.get(culte[1]!)??0);
 };
}
