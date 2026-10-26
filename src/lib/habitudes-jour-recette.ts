import {supabase} from './supabase';
import type {ConfigurationHoraires} from './habitudes-horaires-api';
import {chargerHorairesHabitudes} from './habitudes-horaires-api';
import {planningHabitudesPourDate} from './habitudes-planning';
import type {EtatOccurrence,OccurrenceHabitude} from './habitudes';
import {lignesPaginees} from './lignes-paginees';
import {dateDuJourHabitudes,debutsMois,jourHabitudes,type DebutMois,type PeriodeHabitudes} from './habitudes-periodes';
export type ActiviteJourRecette={occurrence:OccurrenceHabitude;consigne:string;critere:string|null;heure:string;etat?:EtatOccurrence};
/** `mois` : mois d'accès en cours pour cette journée (le jour 31 d'un mois gratuit non renouvelé reste au mois 1). */
export type JourRecette={userId:string;date:string;jour:number;mois?:number;activites:ActiviteJourRecette[]};
/** Programmes HD publiés lus par cet écran : l'essai technique et le programme réel des 30 premiers jours. */
const PROGRAMMES=['HD_RECETTE_INSCRIPTION_FR_20261026','HABITUDES_DEFIS_30J_FR_V1'],PREFIXE='RECETTE_HD_QUOTIDIEN_V1:';
/** Six mois de 30 jours (le dernier finit le 181e jour civil). Au-delà, ou sans journée publiée : refus explicite. */
const JOURS_MAX=181;
/** Débuts locaux des mois de l'inscription (périodes d'accès lisibles par leur seul titulaire). */
async function debutsDe(enrollmentId:string,dateDebut:string,fuseau:string):Promise<DebutMois[]>{
 const r=await supabase.from('hd_access_periods').select('mois,debut,fin_exclue').eq('enrollment_id',enrollmentId);
 if(r.error)throw Error('Périodes indisponibles');
 return debutsMois(dateDebut,(r.data??[]) as PeriodeHabitudes[],fuseau);
}
/** Uniquement les UUID techniques effectivement publiés ; aucune activité inventée depuis un horaire. */
export async function chargerJourRecette(enrollmentId:string,participantId:string,dateLocale:string):Promise<JourRecette>{
 const [session,e,horaires]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('enrollment_id,participant_id,programme_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error)throw Error('Session ou inscription indisponible');
 const enr=e.data;
 if(!enr||enr.participant_id!==participantId||!PROGRAMMES.includes(enr.programme_id)||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active')throw Error('Inscription hors recette');
 // L'horloge du serveur fournit la journée courante ; le composant ne réutilise pas celle d'hier.
 if(horaires.date_locale!==dateLocale)throw Error('Journée à actualiser');
 // Jour du parcours d'après les périodes d'accès : identique au jour civil sans coupure, reprise après un retard.
 const debuts=await debutsDe(enrollmentId,enr.date_debut,horaires.fuseau);
 const jourCivil=jourHabitudes(enr.date_debut,debuts,dateLocale);
 const moisEnCours=[...debuts].sort((a,b)=>b.mois-a.mois).find(x=>x.debut<=dateLocale)?.mois;
 if(!Number.isInteger(jourCivil)||jourCivil<1||jourCivil>JOURS_MAX)throw Error('Jour hors parcours');
 const c=await supabase.from('contents').select('content_id').eq('programme_id',enr.programme_id).eq('version',1).eq('langue','fr').eq('jour',jourCivil);
 if(c.error||c.data?.length!==1)throw Error('Journée non publiée');
 const a=await supabase.from('activities').select('activity_id,consigne,critere_realisation,note_source,obligatoire').eq('content_id',c.data[0]!.content_id).eq('type_activite','action');
 if(a.error)throw Error('Lecture indisponible');
 // Seulement les états de cette journée : sur six mois, ceux de l'inscription dépassent la limite d'une réponse.
 const ids=(a.data??[]).map(x=>x.activity_id);
 const s=ids.length?await supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId).in('activity_id',ids):{data:[],error:null};
 if(s.error)throw Error('Lecture indisponible');
 return {...assemblerJourRecette(enrollmentId,participantId,dateLocale,jourCivil,session.data.session.user.id,horaires,a.data??[],s.data??[]),...(moisEnCours?{mois:moisEnCours}:{})};
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

/** Lecture bornée au mois en cours (30 jours au plus). Aucun appel record_progress, aucune date future. */
export async function chargerHistoriqueRecette(enrollmentId:string,participantId:string,dateLocale:string):Promise<JourRecette[]>{
 const [session,e,horaires]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('enrollment_id,participant_id,programme_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error)throw Error('Session ou inscription indisponible');
 const enr=e.data;
 if(!enr||enr.participant_id!==participantId||!PROGRAMMES.includes(enr.programme_id)||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active'||horaires.date_locale!==dateLocale)throw Error('Historique non accessible');
 const debuts=await debutsDe(enrollmentId,enr.date_debut,horaires.fuseau);
 const raw=jourHabitudes(enr.date_debut,debuts,dateLocale);
 if(!Number.isInteger(raw)||raw<1)throw Error('Calendrier invalide');
 const ouverts=Math.min(JOURS_MAX,raw),premier=Math.floor((ouverts-1)/30)*30+1,attendus=ouverts-premier+1;
 const c=await supabase.from('contents').select('content_id,jour').eq('programme_id',enr.programme_id).eq('version',1).eq('langue','fr').gte('jour',premier).lte('jour',ouverts);
 if(c.error||c.data?.length!==attendus||new Set(c.data.map(x=>x.jour)).size!==attendus||c.data.some(x=>x.jour<premier||x.jour>ouverts))throw Error('Historique incomplet');
 const [a,etats]=await Promise.all([supabase.from('activities').select('activity_id,content_id,consigne,critere_realisation,note_source,obligatoire').in('content_id',c.data.map(x=>x.content_id)).eq('type_activite','action'),
  lignesPaginees<EtatPublie>((de,fin)=>supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId).order('activity_id').range(de,fin)).then(data=>({data,error:null}),()=>({data:null,error:true}))]);
 if(a.error||etats.error)throw Error('Lecture indisponible');
 const s={data:etats.data};
 return [...c.data].sort((a,b)=>a.jour-b.jour).map(contenu=>{
  return assemblerJourRecette(enrollmentId,participantId,dateDuJourHabitudes(enr.date_debut,debuts,contenu.jour),contenu.jour,session.data.session!.user.id,horaires,(a.data??[]).filter(x=>x.content_id===contenu.content_id),s.data??[]);
 });
}
