-- Extension de TEST : ne concerne que les programmes explicitement enregistrés HD.
-- Registre de métadonnées lisible pour refuser aussi les programmes HD inactifs.
create policy hd_registry_read on seneve.hd_programme_links for select to authenticated using(true);
create function seneve.hd_content_allowed(p_programme_id text,p_version integer,p_langue text)
returns boolean language sql stable security invoker set search_path='' as $$
 select not exists(select 1 from seneve.hd_programme_links l where l.programme_id=p_programme_id and l.version=p_version and l.langue=p_langue)
 or exists(select 1 from seneve.enrollments e where e.programme_id=p_programme_id and e.version=p_version and e.langue=p_langue
   and e.participant_id=(select seneve.current_participant_id()) and seneve.hd_has_current_right(e.enrollment_id));
$$;
revoke all on function seneve.hd_content_allowed(text,integer,text) from public,anon;
grant execute on function seneve.hd_content_allowed(text,integer,text) to authenticated;
-- RESTRICTIVE : même un ancien chemin permissif doit respecter le droit HD.
create policy hd_contents_access_guard on seneve.contents as restrictive for select to authenticated
 using(seneve.hd_content_allowed(programme_id,version,langue));
create function seneve.hd_progress_access_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare e seneve.enrollments%rowtype;
begin
 select * into e from seneve.enrollments where enrollment_id=new.enrollment_id;
 if exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue)
    and not seneve.hd_has_current_right(new.enrollment_id) then
  raise exception 'Droit Habitudes et Défis absent, expiré ou révoqué.' using errcode='42501';
 end if;
 return new;
end$$;
revoke all on function seneve.hd_progress_access_guard() from public,anon,authenticated;
create trigger hd_progress_access_check before insert on seneve.progress_events for each row execute function seneve.hd_progress_access_guard();
