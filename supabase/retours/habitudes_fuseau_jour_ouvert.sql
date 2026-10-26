CREATE OR REPLACE FUNCTION seneve.tg_progress_jour_ouvert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_debut date; v_jour int;
begin
  select e.date_debut, c.jour into v_debut, v_jour
    from seneve.enrollments e
    join seneve.activities a on a.activity_id = new.activity_id
    join seneve.contents c on c.content_id = a.content_id
   where e.enrollment_id = new.enrollment_id;
  if v_jour > ((now() at time zone 'Africa/Kinshasa')::date - v_debut) + 1 then
    raise exception 'Ce jour n''est pas encore ouvert.' using errcode = '42501';
  end if;
  return new;
end $function$;
