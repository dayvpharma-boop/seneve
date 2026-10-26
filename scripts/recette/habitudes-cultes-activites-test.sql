-- TEST uniquement. Ajoute trois identifiants possibles par jour ; seuls les créneaux personnels seront affichés.
begin;
select pg_advisory_xact_lock(hashtextextended('HD_RECETTE_INSCRIPTION_FR_20261026',0));
do $$begin
 if (select count(*)from seneve.contents where programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and version=1 and langue='fr')<>30 then raise exception '30 journées de test requises';end if;
 if exists(select 1 from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and a.note_source like 'RECETTE_HD_CULTE_V1:%')then raise exception 'Cultes déjà présents : ne pas remplacer';end if;
end$$;
insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire,critere_realisation,note_source)
select md5('HD_RECETTE_CULTE_V1:J'||c.jour||':'||h.habit||':'||h.rang)::uuid,c.content_id,'action',case when h.habit='culte_semaine' then 'Culte en semaine'else 'Culte du dimanche'end,true,'Déclare seulement ta participation réelle au rendez-vous prévu.','RECETTE_HD_CULTE_V1:'||h.habit||':'||h.rang
from seneve.contents c cross join(values('culte_semaine',1),('culte_semaine',2),('culte_dimanche',1))h(habit,rang)
where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and c.version=1 and c.langue='fr' and c.jour between 1 and 30;
commit;
