-- Recette du choix des rappels d'habitudes sur seneve-test, comptes fictifs A et B, aucun envoi.
-- A est inscrit au programme réel depuis aujourd'hui ; tout est annulé, l'exception finale porte le résultat.
begin;
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

-- A sans notifications : état lisible, activation refusée.
select set_config('request.jwt.claim.sub',(select ua::text from rc_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.hd_rappels_etat();
 if not(r->>'inscrit')::boolean or (r->>'push_pret')::boolean or (r->>'actif')::boolean or jsonb_array_length(r->'habitudes')<>15
  or exists(select 1 from jsonb_array_elements(r->'habitudes')h where not(h->>'recu')::boolean)then raise exception 'État initial incorrect : %',r;end if;
 begin perform seneve.hd_rappels_regler(true,'{}');raise exception 'Activation sans notifications acceptée';exception when invalid_parameter_value then null;end;
end$$;
reset role;
insert into seneve.push_appareils(participant_id,endpoint,p256dh,auth)select pa,'https://example.invalid/'||pa,repeat('x',30),repeat('x',15) from rc_ids;
insert into seneve.consents(participant_id,canal,finalite,etat,version_texte,preuve)select pa,'push','rappels','accorde','RECETTE','FICTIVE' from rc_ids;

-- A avec notifications : toutes les habitudes par défaut, puis coupe la prière de midi et le culte en semaine.
select set_config('request.jwt.claim.sub',(select ua::text from rc_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.hd_rappels_regler(true,'{}');
 if not(r->>'actif')::boolean or not(r->>'push_pret')::boolean then raise exception 'Activation incorrecte : %',r;end if;
 begin perform seneve.hd_rappels_regler(true,array['inconnue']);raise exception 'Habitude inconnue acceptée';exception when invalid_parameter_value then null;end;end$$;
reset role;
do $$declare i record;n int;attendu int;begin
 select * into i from rc_ids;
 attendu:=13+case when extract(isodow from i.jour+1)in(3,5,7)then 1 else 0 end;
 perform seneve_private.hd_prepare_push_day(i.ea,i.jour+1);
 select count(*)into n from seneve.hd_activity_reminders where enrollment_id=i.ea and etat='planifie'and(creneau at time zone 'Africa/Kinshasa')::date=i.jour+1;
 if n<>attendu then raise exception 'Toutes les habitudes : % rappels au lieu de %',n,attendu;end if;
end$$;
select set_config('request.jwt.claim.sub',(select ua::text from rc_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.hd_rappels_regler(true,array['priere_midi','culte_semaine','priere_midi']);
 if (select count(*)from jsonb_array_elements(r->'habitudes')h where not(h->>'recu')::boolean)<>2 then raise exception 'Habitudes coupées incorrectes : %',r;end if;
end$$;
reset role;
do $$declare i record;n int;attendu int;midi uuid;begin
 select * into i from rc_ids;
 attendu:=12;
 -- Avant toute nouvelle préparation, le rappel déjà planifié de la prière de midi n'est plus envoyable.
 select r.reminder_id into midi from seneve.hd_activity_reminders r join seneve.activities a using(activity_id)
  where r.enrollment_id=i.ea and r.etat='planifie'and a.note_source='RECETTE_HD_QUOTIDIEN_V1:priere_midi'and(r.creneau at time zone 'Africa/Kinshasa')::date=i.jour+1;
 if midi is null or seneve_private.hd_push_slot_expected(midi)then raise exception 'Rappel coupé encore attendu';end if;
 perform seneve_private.hd_prepare_push_day(i.ea,i.jour+1);
 select count(*)into n from seneve.hd_activity_reminders where enrollment_id=i.ea and etat='planifie'and(creneau at time zone 'Africa/Kinshasa')::date=i.jour+1;
 if n<>attendu then raise exception 'Après coupure : % rappels au lieu de %',n,attendu;end if;
 if exists(select 1 from seneve.hd_activity_reminders r join seneve.activities a using(activity_id)where r.enrollment_id=i.ea and r.etat='planifie'
  and(a.note_source like '%priere_midi' or a.note_source like '%culte_semaine%'))then raise exception 'Habitude coupée encore planifiée';end if;
 if seneve.hd_push_dispatch_enabled()then raise exception 'Envoi activé';end if;
end$$;

-- B sans inscription HD : rien à régler ; un visiteur n'accède à rien.
select set_config('request.jwt.claim.sub',(select ub::text from rc_ids),true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.hd_rappels_etat();
 if (r->>'inscrit')::boolean then raise exception 'B vu comme inscrit';end if;
 begin perform seneve.hd_rappels_regler(false,'{}');raise exception 'B règle des rappels HD';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform seneve.hd_rappels_etat();raise exception 'Visiteur : lecture possible';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Comme le robot d'envoi : aucune session de participant.
select set_config('request.jwt.claim.sub','',true);
do $$declare i record;begin
 select * into i from rc_ids;
 -- A désactive : plus aucun rappel attendu ; puis suppression du compte sans blocage.
 if (select count(*)from seneve_private.hd_expected_push_slots(i.ea,i.jour+1))<>12 then raise exception 'Créneaux attendus incorrects : %',(select count(*)from seneve_private.hd_expected_push_slots(i.ea,i.jour+1));end if;
 update seneve.hd_delivery_preferences set actif=false,canaux='{}' where participant_id=i.pa;
 if exists(select 1 from seneve_private.hd_expected_push_slots(i.ea,i.jour+1))then raise exception 'Rappels attendus après désactivation';end if;
 if pg_get_constraintdef((select oid from pg_constraint where conname='hd_delivery_preferences_participant_id_fkey'))not like '%ON DELETE CASCADE%'then raise exception 'Suppression de compte bloquée';end if;
 raise exception 'RECETTE_RAPPELS_CHOIX_OK';
end$$;
rollback;
