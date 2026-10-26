-- Renforce la garde existante, TEST seulement. Les droits des autres parcours restent identiques.
create or replace function seneve.hd_progress_access_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;
 source text;j date;habit text;rang int;z text;n int;
begin
 select * into e from seneve.enrollments where enrollment_id=new.enrollment_id;
 if exists(select 1 from seneve.hd_programme_links x where x.programme_id=e.programme_id and x.version=e.version and x.langue=e.langue)
 and not seneve.hd_has_current_right(new.enrollment_id) then
  raise exception 'Droit Habitudes et Défis absent, expiré ou révoqué.' using errcode='42501';
 end if;
 if e.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' then
  select a.note_source,e.date_debut+c.jour-1 into source,j from seneve.activities a join seneve.contents c using(content_id)
  where a.activity_id=new.activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue;
  if source like 'RECETTE_HD_CULTE_V1:%' then
   if source!~'^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):[1-7]$' then raise exception 'Créneau de culte invalide'using errcode='42501';end if;
   habit:=split_part(source,':',2);rang:=split_part(source,':',3)::int;
   select * into strict l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
   select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
   if exists(select 1 from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.habit_key=habit and s.valide_du<=j and (s.valide_au is null or s.valide_au>=j))then
    select count(*)into n from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.habit_key=habit and s.valide_du<=j and (s.valide_au is null or s.valide_au>=j)and extract(isodow from j)::smallint=any(s.jours_iso)and s.fuseau=z;
   else
    select count(*)into n from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue and t.habit_key=habit and t.heure_proposee is not null and extract(isodow from j)::smallint=any(t.jours_iso);
   end if;
   if rang>n then raise exception 'Aucun culte personnel pour ce créneau et cette journée'using errcode='42501';end if;
  end if;
 end if;
 return new;
end$$;
