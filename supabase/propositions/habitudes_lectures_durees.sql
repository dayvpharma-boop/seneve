-- Complément privé des déclarations de lecture. Aucun ancien événement n'est modifié.
create table seneve.hd_reading_logs (
 reading_id bigint generated always as identity primary key,
 client_event_id uuid not null unique references seneve.progress_events(client_event_id) on delete cascade,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 activity_id uuid not null references seneve.activities(activity_id) on delete cascade,
 minutes integer not null check(minutes between 1 and 1440),
 titre text check(titre is null or (char_length(titre) between 1 and 160 and titre=btrim(titre))),
 cree_le timestamptz not null default now()
);
create index hd_reading_logs_latest_idx on seneve.hd_reading_logs(enrollment_id,activity_id,reading_id desc);
create index hd_reading_logs_activity_idx on seneve.hd_reading_logs(activity_id);
alter table seneve.hd_reading_logs enable row level security;
revoke all on seneve.hd_reading_logs from public,anon,authenticated;
grant select on seneve.hd_reading_logs to authenticated;
create policy lit_ses_lectures on seneve.hd_reading_logs for select to authenticated
 using(enrollment_id in(select e.enrollment_id from seneve.enrollments e where e.participant_id=(select seneve.current_participant_id())));

create function seneve.hd_record_reading(p_enrollment_id uuid,p_activity_id uuid,p_client_event_id uuid,p_etat text,p_minutes integer,p_titre text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid:=seneve.current_participant_id();e seneve.enrollments%rowtype;
 t text:=nullif(btrim(p_titre),'');r jsonb;ancien seneve.hd_reading_logs%rowtype;dernier seneve.hd_reading_logs%rowtype;
 j date;z text;
begin
 if pid is null then raise exception 'Session requise' using errcode='28000';end if;
 if p_client_event_id is null or p_etat is null or p_etat not in('partielle','realisee') or p_minutes is null or p_minutes not between 1 and 1440 or char_length(t)>160 then
  raise exception 'Durée, titre ou déclaration invalide' using errcode='22023';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=pid for update;
 if not found or e.etat<>'active' or e.programme_id not in('HD_RECETTE_INSCRIPTION_FR_20261026','HABITUDES_DEFIS_30J_FR_V1') or not coalesce(seneve.hd_has_current_right(e.enrollment_id),false)then
  raise exception 'Accès lecture indisponible' using errcode='42501';end if;
 select seneve.hd_date_du_jour(e.enrollment_id,c.jour) into j from seneve.activities a join seneve.contents c using(content_id)
  where a.activity_id=p_activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue
  and a.type_activite='action' and a.note_source in('RECETTE_HD_QUOTIDIEN_V1:bible_matin','RECETTE_HD_QUOTIDIEN_V1:lecture_pro','RECETTE_HD_QUOTIDIEN_V1:predication','RECETTE_HD_QUOTIDIEN_V1:lecture_personnelle','RECETTE_HD_QUOTIDIEN_V1:bible_soir');
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=pid;
 if j is null or z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then
  raise exception 'Journée ou fuseau indisponible' using errcode='42501';end if;
 if j>(now()at time zone z)::date then raise exception 'Journée non ouverte' using errcode='42501';end if;
 -- Même transaction et mêmes garde-fous/droits/rappels que les autres déclarations.
 r:=seneve.record_progress(p_enrollment_id,p_activity_id,p_client_event_id,p_etat,'web');
 select * into ancien from seneve.hd_reading_logs where client_event_id=p_client_event_id;
 if (r->>'repetition')::boolean then
  if ancien.client_event_id is null or ancien.enrollment_id<>p_enrollment_id or ancien.activity_id<>p_activity_id or ancien.minutes<>p_minutes or ancien.titre is distinct from t then
   raise exception 'Cet événement correspond à une autre saisie' using errcode='23505';end if;
 else
  insert into seneve.hd_reading_logs(client_event_id,enrollment_id,activity_id,minutes,titre)
   values(p_client_event_id,p_enrollment_id,p_activity_id,p_minutes,t);
 end if;
 select * into dernier from seneve.hd_reading_logs where enrollment_id=p_enrollment_id and activity_id=p_activity_id order by reading_id desc limit 1;
 return r||jsonb_build_object('reading',jsonb_build_object('activity_id',dernier.activity_id,'minutes',dernier.minutes,'titre',dernier.titre));
end $$;
revoke all on function seneve.hd_record_reading(uuid,uuid,uuid,text,integer,text) from public,anon;
grant execute on function seneve.hd_record_reading(uuid,uuid,uuid,text,integer,text) to authenticated;

create function seneve.hd_reading_details(p_enrollment_id uuid,p_activity_ids text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare ids uuid[];r jsonb;
begin
 if p_activity_ids is null or char_length(p_activity_ids)>184 then raise exception 'Lectures invalides' using errcode='22023';end if;
 ids:=string_to_array(p_activity_ids,',')::uuid[];
 if cardinality(ids)not between 1 and 5 then raise exception 'Lectures invalides' using errcode='22023';end if;
 if not exists(select 1 from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=seneve.current_participant_id())then
  raise exception 'Inscription indisponible' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('activity_id',x.activity_id,'minutes',x.minutes,'titre',x.titre)),'[]'::jsonb)into r
  from(select distinct on(activity_id)activity_id,minutes,titre from seneve.hd_reading_logs
       where enrollment_id=p_enrollment_id and activity_id=any(ids)order by activity_id,reading_id desc)x;
 return r;
end $$;
revoke all on function seneve.hd_reading_details(uuid,text) from public,anon;
grant execute on function seneve.hd_reading_details(uuid,text) to authenticated;
notify pgrst,'reload schema';
