import {supabase} from './supabase';
import {chargerHorairesHabitudes} from './habitudes-horaires-api';
import {planningHabitudesPourDate} from './habitudes-planning';
import type {EtatOccurrence,OccurrenceHabitude} from './habitudes';
export type ActiviteJourRecette={occurrence:OccurrenceHabitude;consigne:string;critere:string|null;heure:string;etat?:EtatOccurrence};
export type JourRecette={userId:string;date:string;jour:number;activites:ActiviteJourRecette[]};
const PROGRAMME='HD_RECETTE_INSCRIPTION_FR_20261026',PREFIXE='RECETTE_HD_QUOTIDIEN_V1:';
/** Uniquement les UUID techniques effectivement publiés ; aucune activité inventée depuis un horaire. */
export async function chargerJourRecette(enrollmentId:string,participantId:string,dateLocale:string):Promise<JourRecette>{
 const [session,e,horaires]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('enrollment_id,participant_id,programme_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error)throw Error('Session ou inscription indisponible');
 const enr=e.data;
 if(!enr||enr.participant_id!==participantId||enr.programme_id!==PROGRAMME||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active')throw Error('Inscription hors recette');
 // L'horloge du serveur fournit la journée courante ; le composant ne réutilise pas celle d'hier.
 if(horaires.date_locale!==dateLocale)throw Error('Journée à actualiser');
 const jourCivil=(Date.parse(dateLocale+'T00:00:00Z')-Date.parse(enr.date_debut+'T00:00:00Z'))/86400000+1;
 if(!Number.isInteger(jourCivil)||jourCivil<1||jourCivil>30)throw Error('Jour hors parcours');
 const c=await supabase.from('contents').select('content_id').eq('programme_id',PROGRAMME).eq('version',1).eq('langue','fr').eq('jour',jourCivil);
 if(c.error||c.data?.length!==1)throw Error('Journée non publiée');
 const [a,s]=await Promise.all([supabase.from('activities').select('activity_id,consigne,critere_realisation,note_source,obligatoire').eq('content_id',c.data[0]!.content_id).eq('type_activite','action'),supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId)]);
 if(a.error||s.error)throw Error('Lecture indisponible');
 const modele=horaires.modeles[0];if(!modele)throw Error('Planning absent');
 const planning=planningHabitudesPourDate({participant_id:participantId,module_id:modele.module_id,version:modele.version,langue:modele.langue,date_locale:dateLocale,fuseau:horaires.fuseau},horaires.modeles,horaires.horaires);
 const quotidien=horaires.modeles.filter(m=>m.jours_iso.length===7).map(m=>m.habit_key);
 if(quotidien.length!==13||!a.data)throw Error('Catalogue quotidien incomplet');
 const vus=new Set<string>();
 const lignes=a.data??[];
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
  const st=s.data?.find(x=>x.activity_id===row.activity_id);
  if(st&&!['non_commencee','preparee','partielle','realisee'].includes(st.etat))throw Error('État invalide');
  return [{occurrence,consigne:culte?`${row.consigne}${rdv.length>1?' — '+rang:''}`:row.consigne,critere:row.critere_realisation,heure:rendezVous.heure_locale,etat:st?{...occurrence,etat:st.etat,aide_demandee:st.aide_demandee,synchronisation:'synchronise'} as EtatOccurrence:undefined}];
 }).sort((a,b)=>a.heure.localeCompare(b.heure)||a.consigne.localeCompare(b.consigne));
 return {userId:session.data.session.user.id,date:dateLocale,jour:jourCivil,activites};
}
