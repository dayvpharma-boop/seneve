-- Retour arrière de préparation TEST, refusé dès qu'un planning ou une révision est conservé.
begin;
do $$begin
 if exists(select 1 from seneve.hd_habit_schedules)or exists(select 1 from seneve_private.hd_schedule_heads)then
  raise exception 'Retour refusé : des horaires ou révisions doivent être préservés';
 end if;
end$$;
drop function seneve.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid);
drop function seneve.hd_schedule_settings(uuid);
drop function seneve_private.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid);
drop function seneve_private.hd_schedule_settings(uuid);
drop table seneve_private.hd_schedule_heads;
-- RESTRICT implicite : ne jamais supprimer d'autres objets qui auraient été ajoutés au schéma privé.
drop schema seneve_private;
alter table seneve.hd_habit_schedules drop constraint hd_schedule_slot_date_unique;
alter table seneve.hd_habit_schedules drop column creneau_id;
alter table seneve.hd_habit_schedules add constraint hd_habit_schedules_participant_id_module_id_version_langue__key
 unique(participant_id,module_id,version,langue,habit_key,valide_du);
commit;
