-- Retour arrière de habitudes_mois_2_6_reprise.sql : retire les jours 31 à 181 (et leurs rendez-vous, par cascade).
-- Refuse si un participant a déjà déclaré, rappelé ou écrit quelque chose sur ces jours : rien n'est effacé en silence.
do $$
begin
  if exists(select 1 from seneve.activities a join seneve.contents c using(content_id)
             where c.programme_id='HABITUDES_DEFIS_30J_FR_V1' and c.version=1 and c.jour>30
               and (exists(select 1 from seneve.activity_state s where s.activity_id=a.activity_id)
                 or exists(select 1 from seneve.progress_events p where p.activity_id=a.activity_id)
                 or exists(select 1 from seneve.journal_entries j where j.activity_id=a.activity_id)
                 or exists(select 1 from seneve.hd_activity_reminders r where r.activity_id=a.activity_id)))
  or exists(select 1 from seneve.communications m join seneve.contents c using(content_id)
             where c.programme_id='HABITUDES_DEFIS_30J_FR_V1' and c.version=1 and c.jour>30) then
    raise exception 'Des données de participants existent sur les jours 31+ : retour arrière à décider au cas par cas';
  end if;
  delete from seneve.contents where programme_id='HABITUDES_DEFIS_30J_FR_V1' and version=1 and jour between 31 and 181;
  insert into seneve.audit_events(acteur,action,objet,resultat,details)
  values('administration','hd_mois_2_6_reprise_retire','programme:HABITUDES_DEFIS_30J_FR_V1:1','ok','{}'::jsonb);
end $$;
