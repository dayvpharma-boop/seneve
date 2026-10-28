-- Retour arrière de habitudes_programme_anglais.sql : seulement si aucune inscription anglaise n'existe.
do $$begin if exists(select 1 from seneve.enrollments where programme_id='HABITUDES_DEFIS_30J_EN_V1') then raise exception 'Des inscriptions anglaises existent'; end if; end$$;
do $$declare d text; begin
 for d in select distinct on (objet) definition from seneve_private.sauvegardes_definitions where motif='avant habitudes_programme_anglais' order by objet, sauvegarde_le desc
 loop execute d; end loop; end$$;
delete from seneve.hd_offres_mensuelles where langue='en' and module_id='HABITUDES_DEFIS';
delete from seneve.hd_programme_links where programme_id='HABITUDES_DEFIS_30J_EN_V1';
delete from seneve.offers where offre_id='HABITUDES_DEFIS_30J_EN_V1_GRATUIT_30J';
delete from seneve.activities where content_id in (select content_id from seneve.contents where programme_id='HABITUDES_DEFIS_30J_EN_V1');
delete from seneve.contents where programme_id='HABITUDES_DEFIS_30J_EN_V1';
delete from seneve.programme_versions where programme_id='HABITUDES_DEFIS_30J_EN_V1';
delete from seneve.programmes where programme_id='HABITUDES_DEFIS_30J_EN_V1';
delete from seneve.hd_habit_templates where module_id='HABITUDES_DEFIS' and langue='en';
delete from seneve.hd_modules where module_id='HABITUDES_DEFIS' and langue='en';
