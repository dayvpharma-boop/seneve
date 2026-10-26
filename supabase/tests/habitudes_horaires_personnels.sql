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
create temporary table hd_schedule_baseline as select (select count(*)from seneve.progress_events)evenements,(select count(*)from seneve.payment_events)paiements,(select count(*)from seneve.hd_activity_reminders)rappels;
insert into seneve.hd_habit_schedules(participant_id,module_id,version,langue,habit_key,creneau_id,heure_locale,fuseau,jours_iso,valide_du)
select pa,'HABITUDES_DEFIS',1,'fr','culte_semaine','ancien','18:30','Africa/Kinshasa',array[3,5]::smallint[],(now()at time zone 'Africa/Kinshasa')::date-7 from hd_integration_ids;
select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;j date;r jsonb;s jsonb;slots jsonb:='[{"creneau_id":"premier","heure_locale":"17:45","jours_iso":[2]},{"creneau_id":"second","heure_locale":"18:15","jours_iso":[6]}]';begin
 select * into i from hd_integration_ids;j:=(now()at time zone 'Africa/Kinshasa')::date;
 s:=seneve.hd_schedule_settings(i.ea);
 if jsonb_array_length(s->'modeles')<>15 or jsonb_array_length(s->'horaires')<>1 then raise exception 'Lecture configuration incorrecte';end if;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine',slots,j,null,i.event1);raise exception 'Passé ou journée courante modifié';exception when invalid_parameter_value then null;end;
 r:=seneve.hd_save_schedule(i.ea,'culte_semaine',slots,j+1,null,i.event1);
 if(r->>'revision')::uuid<>i.event1 or(r->>'repetition')::boolean then raise exception 'Premier enregistrement incorrect';end if;
 r:=seneve.hd_save_schedule(i.ea,'culte_semaine',slots,j+1,null,i.event1);
 if not(r->>'repetition')::boolean then raise exception 'Rejeu non reconnu';end if;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine',jsonb_set(slots,'{0,heure_locale}','"16:00"'),j+1,null,i.event1);raise exception 'Identifiant réutilisé accepté';exception when invalid_parameter_value then null;end;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine',slots,j+1,null,i.event2);raise exception 'Ancienne révision écrasée';exception when serialization_failure then null;end;
 r:=seneve.hd_save_schedule(i.ea,'culte_semaine',jsonb_set(slots,'{0,heure_locale}','"16:00"'),j+1,i.event1,i.event2);
 s:=seneve.hd_schedule_settings(i.ea);
 if jsonb_array_length(s->'horaires')<>3 then raise exception 'Ancien planning supprimé ou futur dupliqué';end if;
 if not exists(select 1 from jsonb_array_elements(s->'horaires')x where x->>'creneau_id'='ancien'and(x->>'valide_au')::date=j and x->>'heure_locale'='18:30:00')then raise exception 'Historique altéré';end if;
 if not exists(select 1 from jsonb_array_elements(s->'horaires')x where x->>'creneau_id'='premier'and x->>'heure_locale'='16:00:00')then raise exception 'Horaire personnel absent';end if;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine','[{"creneau_id":"x","heure_locale":"25:00","jours_iso":[2,6]}]',j+1,i.event2,i.event3);raise exception 'Heure invalide acceptée';exception when invalid_parameter_value then null;end;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine','[{"creneau_id":"x","heure_locale":"18:00","jours_iso":[2,2]}]',j+1,i.event2,i.event3);raise exception 'Jour répété accepté';exception when invalid_parameter_value then null;end;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine','[{"creneau_id":"x","heure_locale":"18:00","jours_iso":[2]}]',j+1,i.event2,i.event3);raise exception 'Fréquence modifiée';exception when invalid_parameter_value then null;end;
 begin update seneve.hd_habit_schedules set heure_locale='01:00'where participant_id=i.pa;raise exception 'Écriture directe autorisée';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_schedule_settings(i.eb);raise exception 'Planning B lisible par A';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select ub::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 if exists(select 1 from seneve.hd_habit_schedules where participant_id=i.pa)then raise exception 'Horaires A lisibles par B';end if;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine','[]',current_date+1,null,i.event4);raise exception 'Planning A modifiable par B';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
update seneve.entitlements set etat='revoque'where participant_id in(select pa from hd_integration_ids);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 begin perform seneve.hd_schedule_settings(i.ea);raise exception 'Configuration ouverte après révocation';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_save_schedule(i.ea,'culte_semaine','[]',current_date+1,null,i.event4);raise exception 'Écriture sans droit acceptée';exception when insufficient_privilege then null;end;
 if(select count(*)from seneve.hd_habit_schedules where participant_id=i.pa)<>3 then raise exception 'Historique personnel inaccessible après révocation';end if;
end$$;
reset role;
do $$begin
 if(select count(*)from seneve.progress_events)<>(select evenements from hd_schedule_baseline)or(select count(*)from seneve.payment_events)<>(select paiements from hd_schedule_baseline)or(select count(*)from seneve.hd_activity_reminders)<>(select rappels from hd_schedule_baseline)then raise exception 'Écriture hors planning';end if;
 if has_function_privilege('anon','seneve.hd_save_schedule(uuid,text,jsonb,date,uuid,uuid)','EXECUTE')then raise exception 'RPC publique';end if;
end$$;
rollback;
