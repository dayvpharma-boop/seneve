import {supabase} from './supabase';
import {chargerHorairesHabitudes} from './habitudes-horaires-api';
import type {EtatOccurrence,OccurrenceHabitude} from './habitudes';
export const PERIODES_DEFIS=[{du:1,au:7},{du:8,au:14},{du:15,au:21},{du:22,au:28},{du:29,au:30}] as const;
const PROGRAMMES=['HABITUDES_DEFIS_30J_FR_V1','HD_RECETTE_INSCRIPTION_FR_20261026'];
export type DefiSuivi={du:number;au:number;titre:string;critere:string|null;occurrence:OccurrenceHabitude;etat?:EtatOccurrence;ouvert:boolean};
export type SuiviDefis={userId:string;jour:number;defis:DefiSuivi[]};
/** Lecture distincte des habitudes. Aucun nouveau droit ni état déduit d'une lecture. */
export async function chargerDefisHabitudes(enrollmentId:string,participantId:string,dateLocale:string):Promise<SuiviDefis>{
 const [session,e,h]=await Promise.all([supabase.auth.getSession(),supabase.from('enrollments').select('programme_id,participant_id,version,langue,date_debut,etat').eq('enrollment_id',enrollmentId).single(),chargerHorairesHabitudes(enrollmentId)]);
 if(session.error||!session.data.session||e.error||!e.data||h.date_locale!==dateLocale)throw Error('Accès non vérifiable');
 const enr=e.data;
 if(!PROGRAMMES.includes(enr.programme_id)||enr.participant_id!==participantId||enr.version!==1||enr.langue!=='fr'||enr.etat!=='active')throw Error('Inscription non autorisée');
 const jour=(Date.parse(dateLocale+'T00:00:00Z')-Date.parse(enr.date_debut+'T00:00:00Z'))/86400000+1;
 if(!Number.isInteger(jour)||jour<1||jour>30)throw Error('Défis du premier mois uniquement');
 const c=await supabase.from('contents').select('content_id,jour').eq('programme_id',enr.programme_id).eq('version',1).eq('langue','fr').in('jour',PERIODES_DEFIS.map(p=>p.du));
 if(c.error||c.data?.length!==5||new Set(c.data.map(x=>x.jour)).size!==5)throw Error('Périodes non publiées');
 const a=await supabase.from('activities').select('activity_id,content_id,consigne,critere_realisation,obligatoire,note_source').in('content_id',c.data.map(x=>x.content_id)).eq('type_activite','engagement');
 if(a.error)throw Error('Défis indisponibles');
 const lignes=(a.data??[]).filter(x=>x.note_source?.startsWith('DEFI_HD_30J_V1:'));
 if(lignes.length!==5)throw Error('Défis incomplets');
 const s=await supabase.from('activity_state').select('activity_id,etat,aide_demandee').eq('enrollment_id',enrollmentId).in('activity_id',lignes.map(x=>x.activity_id));
 if(s.error)throw Error('Progression indisponible');
 const defis=PERIODES_DEFIS.map(p=>{
  const contenu=c.data!.find(x=>x.jour===p.du);
  const rows=lignes.filter(x=>x.content_id===contenu?.content_id&&x.note_source===`DEFI_HD_30J_V1:${p.du}`);
  if(rows.length!==1||rows[0]!.obligatoire!==false)throw Error('Défi non facultatif ou ambigu');
  const row=rows[0]!,date=new Date(enr.date_debut+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+p.du-1);
  const occurrence={occurrence_id:row.activity_id,enrollment_id:enrollmentId,version:1,date_locale:date.toISOString().slice(0,10),requise:false};
  const st=s.data?.find(x=>x.activity_id===row.activity_id);
  if(st&&!['non_commencee','preparee','partielle','realisee'].includes(st.etat))throw Error('État inconnu');
  return {...p,titre:row.consigne,critere:row.critere_realisation,occurrence,ouvert:jour>=p.du,etat:st?{...occurrence,etat:st.etat,aide_demandee:st.aide_demandee,synchronisation:'synchronise'} as EtatOccurrence:undefined};
 });
 return {userId:session.data.session.user.id,jour,defis};
}
