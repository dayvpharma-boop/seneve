begin;
create temporary table hd_plan_ids as select gen_random_uuid()u,gen_random_uuid()p;
insert into auth.users(id)select u from hd_plan_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)select p,u,'RECETTE_HD_PLANIFICATION','Africa/Kinshasa'from hd_plan_ids;
select set_config('request.jwt.claim.sub',(select u::text from hd_plan_ids),true);
do $$declare p uuid;eid uuid;cat jsonb;o jsonb;h jsonb;j jsonb;demain date:=(now()at time zone 'Africa/Kinshasa')::date+1;jour date:=demain-1;ancien uuid;aid uuid;rid uuid;bad uuid;badact uuid;lot jsonb;req uuid;reqbad uuid;rev uuid;slot timestamptz;heure text:=to_char(now()at time zone 'Africa/Kinshasa','HH24:MI');n int;begin
 select x.p into p from hd_plan_ids x;
 cat:=seneve.hd_free_catalogue('fr');select value into o from jsonb_array_elements(cat->'offres')where value->>'offre_id'='HD_RECETTE_INSCRIPTION_FR_20261026_30J';
 select jsonb_agg(jsonb_build_object('habit_key',x->'habit_key','creneaux',case when x->>'habit_key'='priere_midi'then jsonb_build_array(jsonb_build_object('creneau_id','midi','heure_locale',heure,'jours_iso',jsonb_build_array(1,2,3,4,5,6,7)))else x->'creneaux'end))into h from jsonb_array_elements(o->'planning')x;
 perform seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,true);
 select e.enrollment_id into eid from seneve.enrollments e where e.participant_id=p and e.programme_id='HD_RECETTE_INSCRIPTION_FR_20261026';
 -- Calendrier fictif depuis minuit, sans modifier le compte réel.
 update seneve.entitlements d set debut=jour::timestamp at time zone 'Africa/Kinshasa',fin=(jour::timestamp at time zone 'Africa/Kinshasa')+interval '720 hours'where d.participant_id=p;
 update seneve.hd_access_periods a set debut=jour::timestamp at time zone 'Africa/Kinshasa',fin_exclue=(jour::timestamp at time zone 'Africa/Kinshasa')+interval '720 hours'where a.participant_id=p;
 update seneve_private.hd_push_dispatch_config set participant_pilote=p where id;
 insert into seneve.hd_delivery_preferences(participant_id,actif,fuseau,canaux,max_retard_minutes)values(p,true,'Africa/Kinshasa',array['push'],10);
 insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)values(p,'https://example.invalid/'||p,repeat('x',30),repeat('x',15));
 insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)values(p,'push','rappels','accorde','RECETTE','FICTIVE');
 j:=seneve_private.hd_prepare_push_day(eid,demain);if(j->>'crees')::int<13 then raise exception 'Planning demain incomplet : %',j;end if;
 j:=seneve_private.hd_prepare_push_day(eid,demain);if(j->>'crees')::int<>0 then raise exception 'Planning dupliqué';end if;
 if seneve.hd_push_dispatch_enabled()then raise exception 'Envoi activé par le planning';end if;
 select r.reminder_id,r.activity_id into ancien,aid from seneve.hd_activity_reminders r join seneve.activities a using(activity_id)where r.enrollment_id=eid and a.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_matin';
 select revision into rev from seneve_private.hd_schedule_heads x where x.participant_id=p and x.habit_key='priere_matin'and x.module_id='HABITUDES_DEFIS'and x.version=1 and x.langue='fr';
 perform seneve.hd_save_schedule(eid,'priere_matin','[{"creneau_id":"nouveau","heure_locale":"07:17","jours_iso":[1,2,3,4,5,6,7]}]'::jsonb,demain,rev,gen_random_uuid());
 j:=seneve_private.hd_prepare_push_day(eid,demain);
 if(select etat from seneve.hd_activity_reminders where reminder_id=ancien)<>'annule'then raise exception 'Ancien horaire conservé';end if;
 if not exists(select 1 from seneve.hd_activity_reminders r where r.enrollment_id=eid and r.activity_id=aid and r.etat='planifie'and(r.creneau at time zone 'Africa/Kinshasa')::time='07:17')then raise exception 'Nouvel horaire absent';end if;

 select revision into rev from seneve_private.hd_schedule_heads x where x.participant_id=p and x.habit_key='culte_semaine'and x.module_id='HABITUDES_DEFIS'and x.version=1 and x.langue='fr';
 perform seneve.hd_save_schedule(eid,'culte_semaine',jsonb_build_array(
 jsonb_build_object('creneau_id','culte_a','heure_locale','08:05','jours_iso',jsonb_build_array(extract(isodow from demain)::int)),
 jsonb_build_object('creneau_id','culte_b','heure_locale','08:35','jours_iso',jsonb_build_array(extract(isodow from demain)::int))),demain,rev,gen_random_uuid());
 perform seneve_private.hd_prepare_push_day(eid,demain);
 if(select count(*)from seneve.hd_activity_reminders r join seneve.activities a using(activity_id)where r.enrollment_id=eid and r.etat='planifie'and(r.creneau at time zone 'Africa/Kinshasa')::date=demain and a.note_source like 'RECETTE_HD_CULTE_V1:culte_semaine:%')<>2 then raise exception 'Cultes personnels non indépendants';end if;

 begin perform seneve_private.hd_prepare_push_day(eid,jour-1);raise exception 'Rattrapage passé accepté';exception when invalid_parameter_value then null;end;
end$$;
select 'Créneaux futurs, changement d’heure et deux cultes personnels le même jour : OK. Envoi désactivé. Tout annulé.'resultat;
rollback;
