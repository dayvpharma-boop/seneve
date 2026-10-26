import {supabase} from './supabase';
import type {ConfigurationHoraires} from './habitudes-horaires-api';
import {chargerHorairesHabitudes} from './habitudes-horaires-api';
import {planningHabitudesPourDate} from './habitudes-planning';
import type {EtatOccurrence,OccurrenceHabitude} from './habitudes';
export type ActiviteJourRecette={occurrence:OccurrenceHabitude;consigne:string;critere:string|null;heure:string;etat?:EtatOccurrence};
export type JourRecette={userId:string;date:string;jour:number;activites:ActiviteJourRecette[]};
/** Programmes HD publiés lus par cet écran : l'essai technique et le programme réel des 30 premiers jours. */
const PROGRAMMES=['HD_RECETTE_INSCRIPTION_FR_20261026','HABITUDES_DEFIS_30J_FR_V1'],PREFIXE='RECETTE_HD_QUOTIDIEN_V1:';
/** Uniquement les UUID techniques effectivement publiés ; aucune activité inventée depuis un horaire. */
export async function chargerJourRecette(enrollmentId:string,participantId:string,dateLocale:string):Promise<JourRecette>{
 const [session,e,horaires]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('enrollment_id,participant_id,programme_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error)throw Error('Session ou inscription indisponible');
 const enr=e.data;
 if(!enr||enr.participant_id!==participantId||!PROGRAMMES.includes(enr.programme_id)||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active')throw Error('Inscription hors recette');
 // L'horloge du serveur fournit la journée courante ; le composant ne réutilise pas celle d'hier.
 if(horaires.date_locale!==dateLocale)throw Error('Journée à actualiser');
 const jourCivil=(Date.parse(dateLocale+'T00:00:00Z')-Date.parse(enr.date_debut+'T00:00:00Z'))/86400000+1;
 if(!Number.isInteger(jourCivil)||jourCivil<1||jourCivil>30)throw Error('Jour hors parcours');
 const c=await supabase.from('contents').select('content_id').eq('programme_id',enr.programme_id).eq('version',1).eq('langue','fr').eq('jour',jourCivil);
 if(c.error||c.data?.length!==1)throw Error('Journée non publiée');
 const [a,s]=await Promise.all([supabase.from('activities').select('activity_id,consigne,critere_realisation,note_source,obligatoire').eq('content_id',c.data[0]!.content_id).eq('type_activite','action'),supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId)]);
 if(a.error||s.error)throw Error('Lecture indisponible');
 return assemblerJourRecette(enrollmentId,participantId,dateLocale,jourCivil,session.data.session.user.id,horaires,a.data??[],s.data??[]);
}
type ActivitePubliee={activity_id:string;consigne:string;critere_realisation:string|null;note_source:string|null;obligatoire:boolean};
type EtatPublie={activity_id:string;etat:string;aide_demandee:boolean};
/** Le même calcul daté pour la journée et son historique, notamment les cultes personnels. */
export function assemblerJourRecette(enrollmentId:string,participantId:string,dateLocale:string,jourCivil:number,userId:string,horaires:ConfigurationHoraires,lignes:ActivitePubliee[],etats:EtatPublie[]):JourRecette{
 const modele=horaires.modeles[0];if(!modele)throw Error('Planning absent');
 const planning=planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:dateLocale,fuseau:horaires.fuseau},horaires.modeles,horaires.horaires);
 const quotidien=horaires.modeles.filter(m=>m.jours_iso.length===7).map(m=>m.habit_key);
 if(quotidien.length!==13)throw Error('Catalogue quotidien incomplet');
 const vus=new Set<string>();
 const quotidiennes=lignes.filter(row=>row.note_source?.startsWith(PREFIXE));
 const cultes=lignes.filter(row=>row.note_source?.startsWith('RECETTE_HD_CULTE_V1:'));
 if(quotidiennes.length!==13||cultes.length!==3||lignes.length!==16)throw Error('Catalogue de cultes incomplet');
 const activites=lignes.flatMap(row=>{
  const source=row.note_source??'';
  const culte=/^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):([12])$/.exec(source);
  const habit=culte?culte[1]!:source.startsWith(PREFIXE)?source.slice(PREFIXE.length):'';
  if(!habit||(!culte&&!quotidien.includes(habit)))throw Error('Activité non identifiée');
  const rang=culte?Number(culte[2]):1;
  if(habit==='culte_dimanche'&&rang!==1)throw Error('Rang de culte invalide');
  const identite=`${habit}:${rang}`;if(vus.has(identite))throw Error('Correspondance horaire ambiguë');vus.add(identite);
  const rdv=planning.rendezVous.filter(r=>r.habit_key===habit);
  if(culte&&rdv.length>(habit==='culte_semaine'?2:1))throw Error('Trop de créneaux');
  if(!culte&&rdv.length!==1)throw Error('Correspondance horaire ambiguë');
  if(culte&&!rdv[rang-1])return [];
  const rendezVous=rdv[rang-1]!;
  const occurrence={occurrence_id:row.activity_id,enrollment_id:enrollmentId,version:1,date_locale:dateLocale,requise:row.obligatoire};
  const st=etats.find(x=>x.activity_id===row.activity_id);
  if(st&&!['non_commencee','preparee','partielle','realisee'].includes(st.etat))throw Error('État invalide');
  return [{occurrence,consigne:culte?`${row.consigne}${rdv.length>1?' — '+rang:''}`:row.consigne,critere:row.critere_realisation,heure:rendezVous.heure_locale,etat:st?{...occurrence,etat:st.etat,aide_demandee:st.aide_demandee,synchronisation:'synchronise'} as EtatOccurrence:undefined}];
 }).sort((a,b)=>a.heure.localeCompare(b.heure)||a.consigne.localeCompare(b.consigne));
 return {userId,date:dateLocale,jour:jourCivil,activites};
}

/** Lecture bornée à 30 jours ouverts. Aucun appel record_progress, aucune date future. */
export async function chargerHistoriqueRecette(enrollmentId:string,participantId:string,dateLocale:string):Promise<JourRecette[]>{
 const [session,e,horaires]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('enrollment_id,participant_id,programme_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error)throw Error('Session ou inscription indisponible');
 const enr=e.data;
 if(!enr||enr.participant_id!==participantId||!PROGRAMMES.includes(enr.programme_id)||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active'||horaires.date_locale!==dateLocale)throw Error('Historique non accessible');
 const raw=(Date.parse(dateLocale+'T00:00:00Z')-Date.parse(enr.date_debut+'T00:00:00Z'))/86400000+1;
 if(!Number.isInteger(raw)||raw<1)throw Error('Calendrier invalide');
 const ouverts=Math.min(30,raw);
 const c=await supabase.from('contents').select('content_id,jour').eq('programme_id',enr.programme_id).eq('version',1).eq('langue','fr').lte('jour',ouverts);
 if(c.error||c.data?.length!==ouverts||new Set(c.data.map(x=>x.jour)).size!==ouverts||c.data.some(x=>x.jour<1||x.jour>ouverts))throw Error('Historique incomplet');
 const [a,s]=await Promise.all([supabase.from('activities').select('activity_id,content_id,consigne,critere_realisation,note_source,obligatoire').in('content_id',c.data.map(x=>x.content_id)).eq('type_activite','action'),supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId)]);
 if(a.error||s.error)throw Error('Lecture indisponible');
 return [...c.data].sort((a,b)=>a.jour-b.jour).map(contenu=>{
  const date=new Date(enr.date_debut+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+contenu.jour-1);
  return assemblerJourRecette(enrollmentId,participantId,date.toISOString().slice(0,10),contenu.jour,session.data.session!.user.id,horaires,(a.data??[]).filter(x=>x.content_id===contenu.content_id),s.data??[]);
 });
}
