-- TEST : conserver le calendrier historique des parcours non HD.
create or replace function seneve.tg_progress_jour_ouvert() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_debut date;v_jour int;v_fuseau text:='Africa/Kinshasa';v_hd boolean;
begin
 select e.date_debut,c.jour,exists(select 1 from seneve.hd_programme_links l
  where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue)
 into v_debut,v_jour,v_hd
 from seneve.enrollments e join seneve.activities a on a.activity_id=new.activity_id
 join seneve.contents c on c.content_id=a.content_id where e.enrollment_id=new.enrollment_id;
 if v_hd then
  select coalesce(p.preferences#>>'{rappels,fuseau}',p.fuseau)into v_fuseau
   from seneve.enrollments e join seneve.participants p on p.participant_id=e.participant_id
   where e.enrollment_id=new.enrollment_id;
  if v_fuseau is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=v_fuseau)then
   raise exception 'Fuseau Habitudes et Défis absent ou invalide.' using errcode='42501';end if;
 end if;
 if v_jour>((now()at time zone v_fuseau)::date-v_debut)+1 then
  raise exception 'Ce jour n''est pas encore ouvert.' using errcode='42501';end if;
 return new;
end$$;
