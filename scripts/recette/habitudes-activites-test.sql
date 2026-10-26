-- TEST rlojnuaajeubzlwofwhn uniquement. Déclarations techniques, sans corpus du livre.
begin;
select pg_advisory_xact_lock(hashtextextended('HD_RECETTE_INSCRIPTION_FR_20261026',0));
do $$begin
 if not exists(select 1 from seneve.programmes where programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and type_parcours='recette' and quota_coach_jour=0) then raise exception 'Catalogue technique attendu';end if;
 if exists(select 1 from seneve.contents where programme_id='HD_RECETTE_INSCRIPTION_FR_20261026') then raise exception 'Activités déjà présentes : ne pas remplacer';end if;
 if (select count(*)from seneve.hd_habit_templates where module_id='HABITUDES_DEFIS' and version=1 and langue='fr' and jours_iso=array[1,2,3,4,5,6,7]::smallint[])<>13 then raise exception '13 habitudes quotidiennes requises';end if;
end$$;
insert into seneve.contents(content_id,programme_id,version,langue,jour,numero_message,titre,texte_officiel,type_texte)
select md5('HD_RECETTE_QUOTIDIEN_V1:J'||j)::uuid,'HD_RECETTE_INSCRIPTION_FR_20261026',1,'fr',j,1,'Déclarations de test — jour '||j,'Support technique pour déclarer les habitudes quotidiennes. Aucun texte du livre ou de prière reproduit.','explication' from generate_series(1,30) j;
insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,critere_realisation,note_source)
select md5('HD_RECETTE_QUOTIDIEN_V1:J'||j||':'||h.habit_key)::uuid,md5('HD_RECETTE_QUOTIDIEN_V1:J'||j)::uuid,'action',h.libelle,true,'Déclare uniquement ce que tu as réellement préparé ou pratiqué, selon tes possibilités.','RECETTE_HD_QUOTIDIEN_V1:'||h.habit_key
from generate_series(1,30) j cross join seneve.hd_habit_templates h
where h.module_id='HABITUDES_DEFIS' and h.version=1 and h.langue='fr' and h.jours_iso=array[1,2,3,4,5,6,7]::smallint[];
commit;
