-- Recette du choix des rappels d'habitudes sur seneve-test, comptes fictifs A et B, aucun envoi.
-- A est inscrit au programme réel depuis aujourd'hui ; tout est annulé, l'exception finale porte le résultat.
begin;
update seneve_private.hd_push_dispatch_config set relances_30min_actives=true where id;
create temporary table rc_ids as select gen_random_uuid() ua,gen_random_uuid() ub,gen_random_uuid() pa,gen_random_uuid() pb,gen_random_uuid() ea,
 (now()at time zone 'Africa/Kinshasa')::date jour;
insert into auth.users(id)select ua from rc_ids union all select ub from rc_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau)
 select pa,ua,'RECETTE_RAPPELS_A','Africa/Kinshasa' from rc_ids union all select pb,ub,'RECETTE_RAPPELS_B','Africa/Kinshasa' from rc_ids;
update seneve.hd_programme_links set actif=true where programme_id='HABITUDES_DEFIS_30J_FR_V1';
insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
 select pa,'HABITUDES_DEFIS_30J_FR_V1_GRATUIT_30J','gratuit','actif',jour::timestamp at time zone 'Africa/Kinshasa',(jour::timestamp at time zone 'Africa/Kinshasa')+interval '720 hours' from rc_ids;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat,entitlement_id)
 select i.ea,i.pa,'HABITUDES_DEFIS_30J_FR_V1',1,'fr',i.jour,i.jour+29,'active',d.entitlement_id from rc_ids i join seneve.entitlements d on d.participant_id=i.pa;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
 select i.ea,i.pa,1,d.entitlement_id,d.debut,d.fin from rc_ids i join seneve.entitlements d on d.participant_id=i.pa;
update seneve_private.hd_push_dispatch_config set participant_pilote=(select pa from rc_ids) where id;
do $$begin execute format('grant usage on schema %I to authenticated,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on rc_ids to authenticated,anon;


insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)select pa,'https://example.invalid/'||pa,repeat('x',30),repeat('x',15) from rc_ids;
insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)select pa,'push','rappels','accorde','RECETTE','FICTIVE' from rc_ids;
insert into seneve.hd_delivery_preferences(participant_id,actif,fuseau,canaux,max_retard_minutes)select pa,true,'Africa/Kinshasa',array['push'],30 from rc_ids;
do $$declare i record;n int;n2 int;a uuid;begin
 select *into i from rc_ids;
 perform seneve_private.hd_prepare_push_day(i.ea,i.jour+1);
 select count(*)into n from seneve.hd_activity_reminders where enrollment_id=i.ea;
 if n<30 then raise exception 'Relances absentes : %',n;end if;
 perform seneve_private.hd_prepare_push_day(i.ea,i.jour+1);
 select count(*)into n2 from seneve.hd_activity_reminders where enrollment_id=i.ea;
 if n<>n2 then raise exception 'Doublons';end if;
 if exists(select 1 from(select creneau-lag(creneau)over(partition by activity_id order by creneau)ecart from seneve.hd_activity_reminders where enrollment_id=i.ea)x where ecart<>interval '30 minutes')then raise exception 'Intervalle incorrect';end if;
 if exists(select 1 from seneve.hd_activity_reminders where enrollment_id=i.ea and(creneau at time zone 'Africa/Kinshasa')::date<>i.jour+1)then raise exception 'Débordement du jour';end if;
end$$;
select set_config('request.jwt.claim.sub',(select ua::text from rc_ids),true);
set local role authenticated;
do $$declare i record;a uuid;begin
 select *into i from rc_ids;
 select x.activity_id into a from seneve.activities x join seneve.contents c using(content_id)where c.programme_id='HABITUDES_DEFIS_30J_FR_V1'and c.jour=1 and c.langue='fr'and x.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_matin';
 if not seneve.hd_ignore_reminder(i.ea,a) or not seneve.hd_ignore_reminder(i.ea,a)then raise exception 'Ignorer non idempotent';end if;
 if(select count(*)from seneve.hd_reminder_skips where enrollment_id=i.ea)<>1 then raise exception 'Choix ignoré absent';end if;
end$$;
reset role;
do $$declare i record;begin
 select *into i from rc_ids;
 if exists(select 1 from seneve.activity_state where enrollment_id=i.ea)then raise exception 'Ignorer a validé une activité';end if;
 if exists(select 1 from seneve_private.hd_expected_push_slots(i.ea,i.jour)x join seneve.hd_reminder_skips sk on sk.activity_id=x.activity_id and sk.enrollment_id=i.ea)then raise exception 'Activité ignorée encore rappelée';end if;
 if not exists(select 1 from seneve_private.hd_expected_push_slots(i.ea,i.jour+1))then raise exception 'Ignorer aujourd’hui coupe demain';end if;
end$$;
-- Une déclaration explicite de réalisation arrête toutes les relances de cette tâche.
select set_config('request.jwt.claim.sub',(select ua::text from rc_ids),true);
set local role authenticated;
do $$declare i record;a uuid;r jsonb;begin
 select *into i from rc_ids;
 select x.activity_id into a from seneve.activities x join seneve.contents c using(content_id)where c.programme_id='HABITUDES_DEFIS_30J_FR_V1'and c.jour=1 and c.langue='fr'and x.note_source='RECETTE_HD_QUOTIDIEN_V1:bible_matin';
 r:=seneve.record_progress(i.ea,a,gen_random_uuid(),'realisee','web');
 if r->>'etat'<>'realisee' then raise exception 'Réalisation non confirmée';end if;
end$$;
reset role;
do $$declare i record;begin
 select *into i from rc_ids;
 if exists(select 1 from seneve_private.hd_expected_push_slots(i.ea,i.jour)x join seneve.activity_state st on st.activity_id=x.activity_id and st.enrollment_id=i.ea where st.etat='realisee')then raise exception 'Activité faite encore rappelée';end if;
end$$;
select set_config('request.jwt.claim.sub',(select ub::text from rc_ids),true);
set local role authenticated;
do $$declare i record;a uuid;begin
 select *into i from rc_ids;
 if exists(select 1 from seneve.hd_reminder_skips)then raise exception 'Fuite compte B';end if;
 select x.activity_id into a from seneve.activities x join seneve.contents c using(content_id)where c.programme_id='HABITUDES_DEFIS_30J_FR_V1'and c.jour=1 and c.langue='fr'and x.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_matin';
 begin perform seneve.hd_ignore_reminder(i.ea,a);raise exception 'Compte étranger accepté';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
