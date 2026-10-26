-- Essai de l'API EXISTANTE sur seneve-test, données fictives exclusivement.
-- Tout est annulé par rollback ; aucun contenu approuvé ni compte réel conservé.
begin;
create temporary table hd_payment_baseline as select count(*) n from seneve.payment_events;


create temporary table hd_integration_ids as select
 gen_random_uuid() ua,gen_random_uuid() ub,gen_random_uuid() pa,gen_random_uuid() pb,
 gen_random_uuid() ea,gen_random_uuid() eb,
 gen_random_uuid() c1,gen_random_uuid() c2,gen_random_uuid() c3,gen_random_uuid() c4,
 gen_random_uuid() a1,gen_random_uuid() a2,gen_random_uuid() a3,gen_random_uuid() a4,
 gen_random_uuid() event1,gen_random_uuid() event2,gen_random_uuid() event3,
 gen_random_uuid() event4,gen_random_uuid() event5,
 'HD_RECETTE_'||replace(gen_random_uuid()::text,'-','') programme;
insert into auth.users(id)select ua from hd_integration_ids union all select ub from hd_integration_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom)
 select pa,ua,'RECETTE_FICTIVE_A' from hd_integration_ids union all select pb,ub,'RECETTE_FICTIVE_B' from hd_integration_ids;
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour)
 select programme,'Recette fictive — ne pas publier','recette','fr',2,3 from hd_integration_ids;
-- Version de fixture uniquement, jamais conservée ni rendue accessible à un vrai compte.
insert into seneve.programme_versions(programme_id,version,etat)
 select programme,1,'archivee' from hd_integration_ids;
insert into seneve.contents(content_id,programme_id,version,langue,jour,numero_message,theme,texte_officiel,type_texte)
 select c1,programme,1,'fr',1,1,'RECETTE MATIN','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c2,programme,1,'fr',1,2,'RECETTE MIDI','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c3,programme,1,'fr',1,3,'RECETTE SOIR','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids union all
 select c4,programme,1,'fr',2,1,'RECETTE DEMAIN','Fixture fictive sans contenu spirituel','explication' from hd_integration_ids;
insert into seneve.activities(activity_id,content_id,type_activite,consigne,obligatoire)
 select a1,c1,'action','RECETTE : prière matin',true from hd_integration_ids union all
 select a2,c2,'action','RECETTE : prière midi',true from hd_integration_ids union all
 select a3,c3,'action','RECETTE : prière soir',true from hd_integration_ids union all
 select a4,c4,'action','RECETTE : action future',true from hd_integration_ids;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)
 select ea,pa,programme,1,'fr',(now()at time zone 'Africa/Kinshasa')::date,(now()at time zone 'Africa/Kinshasa')::date+1,'active' from hd_integration_ids union all
 select eb,pb,programme,1,'fr',(now()at time zone 'Africa/Kinshasa')::date,(now()at time zone 'Africa/Kinshasa')::date+1,'active' from hd_integration_ids;

insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)
select programme,1,'fr','HABITUDES_DEFIS',1,true from hd_integration_ids;
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,actif)
select programme||'_FREE','Fixture fictive','recette','fr',programme,true from hd_integration_ids;
insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
select pa,programme||'_FREE','gratuit','actif',now()-interval '1 hour',now()+interval '1 hour' from hd_integration_ids;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
select i.ea,i.pa,1,d.entitlement_id,d.debut,d.fin from hd_integration_ids i join seneve.entitlements d on d.participant_id=i.pa;


do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_integration_ids to authenticated;

create temporary table hd_inscription_baseline as select(select count(*)from seneve.progress_events)progressions,(select count(*)from seneve.hd_activity_reminders)rappels;
create temporary table hd_initial_plan as select jsonb_agg(jsonb_build_object('habit_key',habit_key,'creneaux',case when habit_key='culte_semaine'then '[{"creneau_id":"premier","heure_locale":"17:45","jours_iso":[2]},{"creneau_id":"second","heure_locale":"18:15","jours_iso":[6]}]'::jsonb else jsonb_build_array(jsonb_build_object('creneau_id','principal','heure_locale',to_char(heure_proposee,'HH24:MI'),'jours_iso',jours_iso))end))horaires from seneve.hd_habit_templates where module_id='HABITUDES_DEFIS'and version=1 and langue='fr';
grant select on hd_initial_plan to authenticated;
delete from seneve.hd_access_periods where participant_id in(select pa from hd_integration_ids);
delete from seneve.entitlements where participant_id in(select pa from hd_integration_ids);
delete from seneve.enrollments where enrollment_id in(select ea from hd_integration_ids union all select eb from hd_integration_ids);
update seneve.programmes set duree_jours=45 where programme_id in(select programme from hd_integration_ids);
select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;h jsonb;begin select * into i from hd_integration_ids;select horaires into h from hd_initial_plan;
 begin perform seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,false);raise exception 'Confirmation absente acceptée';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);raise exception 'Programme archivé accepté pour nouveau départ';exception when insufficient_privilege then null;end;
end$$;
reset role;
update seneve.programme_versions set etat='publiee',valide_par='RECETTE_FICTIVE_ROLLBACK',date_validation=now()where programme_id in(select programme from hd_integration_ids);
set local role authenticated;
do $$declare i record;h jsonb;begin select * into i from hd_integration_ids;select horaires into h from hd_initial_plan;
 begin perform seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);raise exception 'Offre non configurée acceptée';exception when insufficient_privilege then null;end;
end$$;
reset role;
update seneve.offers set type_offre='habitudes_defis_gratuit',prix=0,duree_acces_jours=30,chariow_product_id=null,lien_achat=null where programme_id in(select programme from hd_integration_ids);
set local role authenticated;
do $$declare i record;h jsonb;r jsonb;r2 jsonb;begin select * into i from hd_integration_ids;select horaires into h from hd_initial_plan;
 begin perform seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE','[]',true);raise exception 'Planning incomplet accepté';exception when invalid_parameter_value then null;end;
 r:=seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);
 if not(r->>'cree')::boolean or not(r->>'horaires_appliques')::boolean or(r->>'fin_exclue')::timestamptz-(r->>'debut')::timestamptz<>interval '720 hours'then raise exception 'Inscription incorrecte';end if;
 r2:=seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);
 if(r2->>'cree')::boolean or not(r2->>'existant')::boolean or(r2->>'horaires_appliques')::boolean or r2->>'enrollment_id'<>r->>'enrollment_id'or r2->>'fin_exclue'<>r->>'fin_exclue'then raise exception 'Rejeu non stable';end if;
 r2:=seneve.hd_start_free(i.programme,2,'fr',i.programme||'_FREE',h,true);
 if r2->>'motif'<>'gratuite_deja_utilisee'then raise exception 'Seconde gratuité acceptée';end if;
 if(select count(*)from seneve.hd_habit_schedules where participant_id=i.pa)<>16 then raise exception 'Créneaux initiaux incorrects';end if;
 if not exists(select 1 from seneve.hd_habit_schedules where participant_id=i.pa and habit_key='culte_semaine'and heure_locale='17:45'and valide_du=(now()at time zone 'Africa/Kinshasa')::date)then raise exception 'Horaire choisi non conservé aujourd’hui';end if;
end$$;
reset role;
do $$declare i record;j date;begin select * into i from hd_integration_ids;j:=(now()at time zone 'Africa/Kinshasa')::date;
 if(select count(*)from seneve.enrollments where participant_id=i.pa and programme_id=i.programme)<>1 or(select count(*)from seneve.hd_access_periods where participant_id=i.pa)<>1 then raise exception 'Inscription ou période dupliquée';end if;
 if not exists(select 1 from seneve.enrollments where participant_id=i.pa and date_fin_prevue=j+44 and entitlement_id is not null)then raise exception 'Calendrier publié non respecté';end if;
 update seneve.enrollments set etat='en_pause'where participant_id=i.pa and programme_id=i.programme;
 update seneve.entitlements set etat='revoque'where participant_id=i.pa;
 -- Erreur forcée après création du droit pour vérifier l’atomicité intégrale sur B.
 execute format('alter table seneve_private.hd_schedule_heads add constraint hd_recette_atomicite check(participant_id<>%L::uuid)not valid',i.pb);
end$$;
set local role authenticated;
do $$declare i record;h jsonb;r jsonb;begin select * into i from hd_integration_ids;select horaires into h from hd_initial_plan;
 r:=seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);
 if r->>'etat'<>'revoque'or(r->>'cree')::boolean then raise exception 'Droit révoqué rouvert';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select ub::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;h jsonb;begin select * into i from hd_integration_ids;select horaires into h from hd_initial_plan;
 begin perform seneve.hd_start_free(i.programme,1,'fr',i.programme||'_FREE',h,true);raise exception 'Erreur forcée non observée';exception when check_violation then null;end;
end$$;
reset role;
do $$declare i record;begin select * into i from hd_integration_ids;
 if exists(select 1 from seneve.enrollments where participant_id=i.pb and programme_id=i.programme)or exists(select 1 from seneve.entitlements where participant_id=i.pb)or exists(select 1 from seneve.hd_habit_schedules where participant_id=i.pb)or exists(select 1 from seneve_private.hd_schedule_heads where participant_id=i.pb)then raise exception 'Échec a conservé une inscription partielle';end if;
 if not exists(select 1 from seneve.enrollments where participant_id=i.pa and etat='en_pause')then raise exception 'Pause annulée par rejeu';end if;
 if(select count(*)from seneve.payment_events)<>(select n from hd_payment_baseline)then raise exception 'Paiement créé';end if;
 if(select count(*)from seneve.progress_events)<>(select progressions from hd_inscription_baseline)or(select count(*)from seneve.hd_activity_reminders)<>(select rappels from hd_inscription_baseline)then raise exception 'Progression ou rappel créé';end if;
 if has_function_privilege('anon','seneve.hd_start_free(text,integer,text,text,jsonb,boolean)','EXECUTE')then raise exception 'Inscription anonyme ouverte';end if;
end$$;
rollback;
