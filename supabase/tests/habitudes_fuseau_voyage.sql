-- Recette du changement de fuseau en voyage sur seneve-test, comptes fictifs A et B, aucun envoi.
-- A (Kinshasa, prière du matin à 06:00) passe à l'heure de New York : 06:00 reste 06:00, heure de New York.
begin;
create temporary table fv_ids as select gen_random_uuid() ua,gen_random_uuid() ub,gen_random_uuid() pa,gen_random_uuid() pb,gen_random_uuid() ea,
 (now()at time zone 'Africa/Kinshasa')::date jour;
insert into auth.users(id)select ua from fv_ids union all select ub from fv_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)
 select pa,ua,'RECETTE_FUSEAU_A','Africa/Kinshasa' from fv_ids union all select pb,ub,'RECETTE_FUSEAU_B','Africa/Kinshasa' from fv_ids;
update seneve.hd_programme_links set actif=true where programme_id='HABITUDES_DEFIS_30J_FR_V1';
insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
 select pa,'HABITUDES_DEFIS_30J_FR_V1_GRATUIT_30J','gratuit','actif',(jour-1)::timestamp at time zone 'Africa/Kinshasa',((jour-1)::timestamp at time zone 'Africa/Kinshasa')+interval '720 hours' from fv_ids;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat,entitlement_id)
 select i.ea,i.pa,'HABITUDES_DEFIS_30J_FR_V1',1,'fr',i.jour-1,i.jour+28,'active',d.entitlement_id from fv_ids i join seneve.entitlements d on d.participant_id=i.pa;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
 select i.ea,i.pa,1,d.entitlement_id,d.debut,d.fin from fv_ids i join seneve.entitlements d on d.participant_id=i.pa;
insert into seneve.hd_habit_schedules(participant_id,module_id,version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,valide_du)
 select pa,'HABITUDES_DEFIS',1,'fr','priere_matin','principal','06:00','Africa/Kinshasa',array[1,2,3,4,5,6,7]::smallint[],jour-1 from fv_ids;
insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)select pa,'https://example.invalid/'||pa,repeat('x',30),repeat('x',15) from fv_ids;
insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)select pa,'push','rappels','accorde','RECETTE','FICTIVE' from fv_ids;
update seneve_private.hd_push_dispatch_config set participant_pilote=(select pa from fv_ids) where id;
do $$begin execute format('grant usage on schema %I to authenticated,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on fv_ids to authenticated,anon;

select set_config('request.jwt.claim.sub',(select ua::text from fv_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.hd_rappels_regler(true,'{}');
 if r->>'fuseau'<>'Africa/Kinshasa' then raise exception 'Fuseau initial incorrect : %',r->>'fuseau';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
-- Avant le voyage : demain, prière du matin à 06:00 heure de Kinshasa ; le rappel est préparé.
do $$declare i record;begin select * into i from fv_ids;perform seneve_private.hd_prepare_push_day(i.ea,i.jour+1);end$$;
create temporary table fv_avant as
 select r.reminder_id,r.creneau from fv_ids i join seneve.hd_activity_reminders r on r.enrollment_id=i.ea join seneve.activities a using(activity_id)
 where a.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_matin'and r.etat='planifie';
do $$declare a record;begin
 select * into a from fv_avant;
 if a.reminder_id is null or to_char(a.creneau at time zone 'Africa/Kinshasa','HH24:MI')<>'06:00'then raise exception 'Rappel avant voyage incorrect';end if;
end$$;

-- A choisit l'heure de New York ; un fuseau inventé est refusé.
select set_config('request.jwt.claim.sub',(select ua::text from fv_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 begin perform seneve.hd_changer_fuseau('Mars/Olympus');raise exception 'Fuseau inventé accepté';exception when invalid_parameter_value then null;end;
 r:=seneve.hd_changer_fuseau('America/New_York');
 if r->>'fuseau'<>'America/New_York' or not(r->>'actif')::boolean then raise exception 'Changement incorrect : %',r;end if;
 r:=seneve.hd_changer_fuseau('America/New_York');
 if r->>'fuseau'<>'America/New_York' then raise exception 'Répétition incorrecte';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
do $$declare i record;a record;demain date;n int;h text;begin
 select * into i from fv_ids;select * into a from fv_avant;
 if exists(select 1 from seneve.hd_habit_schedules where participant_id=i.pa and fuseau<>'America/New_York')then raise exception 'Horaires restés à l’ancien fuseau';end if;
 if (select heure_locale from seneve.hd_habit_schedules where participant_id=i.pa and habit_key='priere_matin')<>'06:00'then raise exception 'Heure modifiée';end if;
 if (select preferences#>>'{rappels,fuseau}' from seneve.participants where participant_id=i.pa)<>'America/New_York'
  or (select fuseau from seneve.hd_delivery_preferences where participant_id=i.pa)<>'America/New_York' then raise exception 'Préférences restées à l’ancien fuseau';end if;
 -- L'ancien rappel (06:00 Kinshasa) ne part plus ; demain, 06:00 heure de New York est attendu.
 if seneve_private.hd_push_slot_expected(a.reminder_id)then raise exception 'Ancien rappel encore envoyable';end if;
 demain:=(now()at time zone 'America/New_York')::date+1;
 select to_char(x.creneau at time zone 'America/New_York','HH24:MI')into h from seneve_private.hd_expected_push_slots(i.ea,demain)x join seneve.activities ac using(activity_id)where ac.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_matin';
 if h is distinct from '06:00' then raise exception 'Prière du matin à New York : %',coalesce(h,'absente');end if;
 select count(*)into n from seneve_private.hd_expected_push_slots(i.ea,demain);
 if n<13 then raise exception 'Rappels manquants après le voyage : %',n;end if;
end$$;

-- B sans inscription HD ; un visiteur n'accède à rien.
select set_config('request.jwt.claim.sub',(select ub::text from fv_ids),true);
set local role authenticated;
do $$begin
 begin perform seneve.hd_changer_fuseau('Europe/Paris');raise exception 'B change un fuseau HD';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform seneve.hd_changer_fuseau('Europe/Paris');raise exception 'Visiteur : changement possible';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin raise exception 'RECETTE_FUSEAU_VOYAGE_OK';end$$;
rollback;
