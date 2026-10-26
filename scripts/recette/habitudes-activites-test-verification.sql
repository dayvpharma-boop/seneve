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

create temporary table hd_tracking_ids as select gen_random_uuid() utilisateur,gen_random_uuid() participant,gen_random_uuid() evenement,gen_random_uuid() autre;
insert into auth.users(id)select utilisateur from hd_tracking_ids union all select autre from hd_tracking_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)select participant,utilisateur,'RECETTE_SUIVI_FICTIF','Africa/Kinshasa' from hd_tracking_ids;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_tracking_ids to authenticated;
select set_config('request.jwt.claim.sub',(select utilisateur::text from hd_tracking_ids),true);
set local role authenticated;
do $$declare c jsonb;o jsonb;h jsonb;r jsonb;rep jsonb;eid uuid;aid uuid;futur uuid;ev uuid;begin
 c:=seneve.hd_free_catalogue('fr');
 select value into o from jsonb_array_elements(c->'offres') where value->>'offre_id'='HD_RECETTE_INSCRIPTION_FR_20261026_30J';
 select jsonb_agg(jsonb_build_object('habit_key',x->'habit_key','creneaux',x->'creneaux'))into h from jsonb_array_elements(o->'planning')x;
 r:=seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,true);
 select enrollment_id into eid from seneve.enrollments where participant_id=seneve.current_participant_id() and programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
 select a.activity_id into aid from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and c.jour=1 limit 1;
 select a.activity_id into futur from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and c.jour=2 limit 1;
 if (select count(*)from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026' and c.jour=1)<>13 then raise exception '13 activités attendues';end if;
 select evenement into ev from hd_tracking_ids;
 r:=seneve.record_progress(eid,aid,ev,'partielle','web');
 rep:=seneve.record_progress(eid,aid,ev,'partielle','web');
 if r->>'etat'<>'partielle' or rep->>'repetition'<>'true' or r->>'event_id'<>rep->>'event_id' then raise exception 'État ou rejeu incorrect';end if;
 r:=seneve.record_progress(eid,aid,gen_random_uuid(),'realisee','web');
 if r->>'etat'<>'realisee' then raise exception 'Réalisation absente';end if;
 if not exists(select 1 from seneve.activity_state where enrollment_id=eid and activity_id=aid and etat='realisee')then raise exception 'Relecture absente';end if;
 begin perform seneve.record_progress(eid,futur,gen_random_uuid(),'realisee','web');raise exception 'Jour futur accepté';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',(select autre::text from hd_tracking_ids),true);
 begin perform seneve.record_progress(eid,aid,gen_random_uuid(),'realisee','web');raise exception 'Autre compte accepté';exception when sqlstate '28000' then null;when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',(select utilisateur::text from hd_tracking_ids),true);
 if jsonb_array_length(seneve.coach_eligible_enrollments())<>0 then raise exception 'Coach gratuit proposé';end if;
end$$;
reset role;
select 'Déclaration, relecture, rejeu, refus futur et autre compte : OK. Toutes les données sont annulées.' as resultat;
rollback;
