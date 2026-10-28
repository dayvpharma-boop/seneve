-- Annulation explicite d'une réalisation HD ; historique conservé.
create table seneve.hd_progress_corrections(
 client_event_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments,
 activity_id uuid not null references seneve.activities,
 confirmation text not null,
 reading_cutoff bigint not null,
 cree_le timestamptz not null default clock_timestamp()
);
create index hd_progress_corrections_activity on seneve.hd_progress_corrections(enrollment_id,activity_id,reading_cutoff);
alter table seneve.hd_progress_corrections enable row level security;
revoke all on seneve.hd_progress_corrections from public,anon,authenticated;
create policy hd_corrections_no_direct_access on seneve.hd_progress_corrections to authenticated using(false) with check(false);
-- Aucun accès direct : contrôle du titulaire dans la fonction ci-dessous.
create function seneve.hd_corriger_realisation(p_enrollment_id uuid,p_activity_id uuid,p_client_event_id uuid default null,p_confirmation text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 pid uuid:=seneve.current_participant_id(); e seneve.enrollments%rowtype;
 s seneve.activity_state%rowtype; ancienne seneve.hd_progress_corrections%rowtype;
 j date;z text;cutoff bigint;jeton text;
begin
 if pid is null then raise exception 'Session requise' using errcode='28000';end if;
 if (p_client_event_id is null)<>(p_confirmation is null) then raise exception 'Confirmation invalide' using errcode='22023';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=pid for update;
 if not found or e.programme_id not in('HD_RECETTE_INSCRIPTION_FR_20261026','HABITUDES_DEFIS_30J_FR_V1') then
  raise exception 'Inscription indisponible' using errcode='42501';end if;
 select * into s from seneve.activity_state where enrollment_id=p_enrollment_id and activity_id=p_activity_id for update;
 -- Rejeu : retourne l'état courant, sans annuler une nouvelle déclaration.
 select * into ancienne from seneve.hd_progress_corrections where client_event_id=p_client_event_id;
 if found then
  if ancienne.enrollment_id<>p_enrollment_id or ancienne.activity_id<>p_activity_id or ancienne.confirmation<>p_confirmation then
   raise exception 'Identifiant déjà utilisé' using errcode='23505';end if;
  return jsonb_build_object('etat',s.etat,'aide_demandee',s.aide_demandee,'repetition',true,'event_id',ancienne.client_event_id);
 end if;
 if e.etat<>'active' or not coalesce(seneve.hd_has_current_right(e.enrollment_id),false) then
  raise exception 'Accès indisponible' using errcode='42501';end if;
 select seneve.hd_date_du_jour(e.enrollment_id,c.jour) into j from seneve.activities a join seneve.contents c using(content_id)
 where a.activity_id=p_activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and a.type_activite='action';
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau) into z from seneve.participants where participant_id=pid;
 if j is null or z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then
  raise exception 'Journée indisponible' using errcode='42501';end if;
 if j>(now()at time zone z)::date then raise exception 'Journée non ouverte' using errcode='42501';end if;
 if s.etat is distinct from 'realisee' then raise exception 'Actualise cette activité avant de la corriger' using errcode='40001';end if;
 select coalesce(max(reading_id),0) into cutoff from seneve.hd_reading_logs where enrollment_id=p_enrollment_id and activity_id=p_activity_id;
 jeton:=md5(p_enrollment_id::text||'|'||p_activity_id::text||'|'||s.modifie_le::text||'|'||cutoff::text);
 if p_client_event_id is null then return jsonb_build_object('confirmation',jeton);end if;
 if p_confirmation<>jeton then raise exception 'Cette activité a changé. Actualise avant de corriger' using errcode='40001';end if;
 insert into seneve.hd_progress_corrections(client_event_id,enrollment_id,activity_id,confirmation,reading_cutoff)
 values(p_client_event_id,p_enrollment_id,p_activity_id,jeton,cutoff);
 update seneve.activity_state set etat='non_commencee',realisee_le=null,modifie_le=clock_timestamp()
 where enrollment_id=p_enrollment_id and activity_id=p_activity_id returning * into s;
 insert into seneve.jobs(type,cle_logique,charge)values('reevaluer_rappels','correction:'||p_client_event_id::text,
 jsonb_build_object('enrollment_id',p_enrollment_id,'activity_id',p_activity_id));
 return jsonb_build_object('etat',s.etat,'aide_demandee',s.aide_demandee,'repetition',false,'event_id',p_client_event_id);
end $$;
revoke all on function seneve.hd_corriger_realisation(uuid,uuid,uuid,text) from public,anon;
grant execute on function seneve.hd_corriger_realisation(uuid,uuid,uuid,text) to authenticated;
-- Conserver les saisies anciennes sans les additionner aux bilans après correction.
create or replace function seneve.hd_reading_details(p_enrollment_id uuid,p_activity_ids text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ids uuid[];r jsonb;
begin
 if p_activity_ids is null or char_length(p_activity_ids)>184 then raise exception 'Lectures invalides' using errcode='22023';end if;
 ids:=string_to_array(p_activity_ids,',')::uuid[];
 if cardinality(ids)not between 1 and 5 then raise exception 'Lectures invalides' using errcode='22023';end if;
 if not exists(select 1 from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=seneve.current_participant_id())then
  raise exception 'Inscription indisponible' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('activity_id',x.activity_id,'minutes',x.minutes,'titre',x.titre)),'[]'::jsonb)into r
 from(select distinct on(l.activity_id)l.activity_id,l.minutes,l.titre from seneve.hd_reading_logs l
 where l.enrollment_id=p_enrollment_id and l.activity_id=any(ids)
 and l.reading_id>coalesce((select max(c.reading_cutoff)from seneve.hd_progress_corrections c where c.enrollment_id=l.enrollment_id and c.activity_id=l.activity_id),0)
 order by l.activity_id,l.reading_id desc)x;
 return r;
end $$;
revoke all on function seneve.hd_reading_details(uuid,text) from public,anon;
grant execute on function seneve.hd_reading_details(uuid,text) to authenticated;
notify pgrst,'reload schema';
