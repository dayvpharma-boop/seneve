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

create temporary table hd_cultes_ids as select gen_random_uuid() utilisateur,gen_random_uuid() participant;
insert into auth.users(id)select utilisateur from hd_cultes_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)select participant,utilisateur,'RECETTE_CULTES_FICTIVE','Africa/Kinshasa'from hd_cultes_ids;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_cultes_ids to authenticated;
select set_config('request.jwt.claim.sub',(select utilisateur::text from hd_cultes_ids),true);
set local role authenticated;
do $$declare c jsonb;o jsonb;h jsonb;r jsonb;eid uuid;a1 uuid;a2 uuid;a_dim uuid;a_futur uuid;ev uuid:=gen_random_uuid();j int:=extract(isodow from now()at time zone 'Africa/Kinshasa');begin
 c:=seneve.hd_free_catalogue('fr');
 select value into o from jsonb_array_elements(c->'offres')where value->>'offre_id'='HD_RECETTE_INSCRIPTION_FR_20261026_30J';
 select jsonb_agg(jsonb_build_object('habit_key',x->'habit_key','creneaux',case when x->>'habit_key'='culte_semaine' then
 jsonb_build_array(jsonb_build_object('creneau_id','culte_a','heure_locale','17:00','jours_iso',jsonb_build_array(j)),jsonb_build_object('creneau_id','culte_b','heure_locale','19:00','jours_iso',jsonb_build_array(j)))
 when x->>'habit_key'='culte_dimanche' then jsonb_build_array(jsonb_build_object('creneau_id','dim','heure_locale','09:00','jours_iso',jsonb_build_array(j%7+1)))else x->'creneaux'end))into h from jsonb_array_elements(o->'planning')x;
 r:=seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,true);
 select enrollment_id into eid from seneve.enrollments where participant_id=seneve.current_participant_id()and programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
 select a.activity_id into a1 from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and c.jour=1 and a.note_source='RECETTE_HD_CULTE_V1:culte_semaine:1';
 select a.activity_id into a2 from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and c.jour=1 and a.note_source='RECETTE_HD_CULTE_V1:culte_semaine:2';
 select a.activity_id into a_dim from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and c.jour=1 and a.note_source='RECETTE_HD_CULTE_V1:culte_dimanche:1';
 select a.activity_id into a_futur from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and c.jour=2 and a.note_source='RECETTE_HD_CULTE_V1:culte_semaine:1';
 if a1 is null or a2 is null or a1=a2 then raise exception 'Deux identités distinctes attendues';end if;
 r:=seneve.record_progress(eid,a1,ev,'realisee','web');
 if r->>'etat'<>'realisee'then raise exception 'Premier culte non confirmé';end if;
 r:=seneve.record_progress(eid,a1,ev,'realisee','web');
 if r->>'repetition'<>'true'then raise exception 'Rejeu du culte non idempotent';end if;
 r:=seneve.record_progress(eid,a2,gen_random_uuid(),'partielle','web');
 if r->>'etat'<>'partielle'then raise exception 'Second culte non indépendant';end if;
 if(select count(*)from seneve.activity_state where enrollment_id=eid)<>2 then raise exception 'Déclarations fusionnées ou dupliquées';end if;
 begin perform seneve.record_progress(eid,a_dim,gen_random_uuid(),'realisee','web');raise exception 'Culte hors planning accepté';exception when insufficient_privilege then null;end;
 begin perform seneve.record_progress(eid,a_futur,gen_random_uuid(),'realisee','web');raise exception 'Culte futur accepté';exception when insufficient_privilege then null;end;
end$$;
reset role;
update seneve.entitlements set etat='revoque'where participant_id in(select participant from hd_cultes_ids);
set local role authenticated;
do $$declare eid uuid;aid uuid;begin
 select enrollment_id into eid from seneve.enrollments where participant_id=seneve.current_participant_id()and programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
 select a.activity_id into aid from seneve.activities a join seneve.contents c using(content_id)where c.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026'and c.jour=1 and a.note_source='RECETTE_HD_CULTE_V1:culte_semaine:1';
 begin perform seneve.record_progress(eid,aid,gen_random_uuid(),'realisee','web');raise exception 'Droit révoqué accepté';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Deux cultes indépendants, rejeu, refus hors planning/futur/révocation : OK. Données fictives annulées.' as resultat;
rollback;
