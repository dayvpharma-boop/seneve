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


create temporary table hd_coach_baseline as select (select count(*)from seneve.coach_messages where participant_id in(select pa from hd_integration_ids))m,(select count(*)from seneve.jobs)j;
grant select on hd_coach_baseline to authenticated;
select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;r jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.coach_quota();if(r->>'quota')::int<>0 then raise exception 'HD donne un quota coach';end if;
 begin perform seneve.coach_ask(gen_random_uuid(),i.ea,'RECETTE FICTIVE SANS ENVOI');raise exception 'Coach HD accepté';exception when insufficient_privilege then null;end;
 if(select count(*)from seneve.coach_messages)<>(select m from hd_coach_baseline)then raise exception 'Message créé';end if;
end$$;
reset role;
-- Héritage fictif : créer un message avant classification HD, puis rétablir le registre inactif.
create temporary table hd_ancien_coach(mid uuid,client_id uuid);
with retire as(delete from seneve.hd_programme_links where programme_id in(select programme from hd_integration_ids)returning *)select count(*)from retire;
with m as(insert into seneve.coach_messages(client_message_id,participant_id,enrollment_id,role,texte,etat)
 select gen_random_uuid(),pa,ea,'participant','RECETTE ANCIEN MESSAGE HD','en_attente'from hd_integration_ids returning message_id,client_message_id)
insert into hd_ancien_coach select * from m;
insert into seneve.jobs(type,cle_logique,charge)select 'coach_repondre','coach:'||mid::text,jsonb_build_object('message_id',mid)from hd_ancien_coach;
insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)select programme,1,'fr','HABITUDES_DEFIS',1,false from hd_integration_ids;
grant select on hd_ancien_coach to authenticated;
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 begin perform seneve.coach_ask(gen_random_uuid(),i.ea,'RECETTE HD INACTIF');raise exception 'Mapping inactif contourne exclusion';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Autre programme du même participant : son quota doit être conservé.
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour,quota_coach_jour)select programme||'_STD','RECETTE STANDARD','recette','fr',2,3,17 from hd_integration_ids;
insert into seneve.programme_versions(programme_id,version,etat)select programme||'_STD',1,'archivee'from hd_integration_ids;
create temporary table hd_coach_standard(eid uuid);
with e as(insert into seneve.enrollments(participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)select pa,programme||'_STD',1,'fr',current_date,current_date+1,'active'from hd_integration_ids returning enrollment_id)insert into hd_coach_standard select enrollment_id from e;
grant select on hd_coach_standard to authenticated;
set local role authenticated;
do $$declare r jsonb;begin
 r:=seneve.coach_quota();if(r->>'quota')::int<>17 then raise exception 'Quota autre programme altéré';end if;
 begin perform seneve.coach_ask((select client_id from hd_ancien_coach),(select eid from hd_coach_standard),'RECETTE REPRISE HD VIA STANDARD');raise exception 'Reprise HD autorisée';exception when insufficient_privilege then null;end;
 r:=seneve.coach_ask(gen_random_uuid(),(select eid from hd_coach_standard),'RECETTE STANDARD SANS APPEL IA');if r->>'message_id'is null then raise exception 'Autre programme bloqué';end if;
end$$;
reset role;
do $$begin
 begin insert into seneve.coach_messages(participant_id,enrollment_id,role,texte,etat)select pa,ea,'participant','RECETTE INSERT DIRECT','en_attente'from hd_integration_ids;raise exception 'Insertion privilégiée HD autorisée';exception when insufficient_privilege then null;end;
 if exists(select 1 from seneve.claim_coach_jobs(20)c where c.message_id in(select mid from hd_ancien_coach))then raise exception 'Tâche HD transmise';end if;
 if exists(select 1 from seneve.jobs j where(j.charge->>'message_id')::uuid in(select mid from hd_ancien_coach)and j.etat<>'en_attente')then raise exception 'Tâche HD réservée';end if;
end$$;
rollback;
