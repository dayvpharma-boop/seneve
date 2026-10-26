begin;
create temporary table hd_pc as select gen_random_uuid()u,gen_random_uuid()p,gen_random_uuid()e,gen_random_uuid()pay,gen_random_uuid()d,'HD_PC_'||replace(gen_random_uuid()::text,'-','')pr;
insert into auth.users(id)select u from hd_pc;
insert into seneve.participants(participant_id,auth_user_id,prenom)select p,u,'RECETTE_PC'from hd_pc;
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour,quota_coach_jour)select pr,'RECETTE_PC','recette','fr',2,3,17 from hd_pc;
insert into seneve.programme_versions(programme_id,version,etat)select pr,1,'archivee'from hd_pc;
insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)select pr,1,'fr','HABITUDES_DEFIS',1,true from hd_pc;
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,actif)select pr,'RECETTE_PC','recette','fr',pr,true from hd_pc;
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)select e,p,pr,1,'fr',current_date,current_date+1,'active'from hd_pc;
do $$begin execute format('grant usage on schema %I to authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_pc to authenticated;
select set_config('request.jwt.claim.sub',(select u::text from hd_pc),true);
do $$begin if not seneve_private.hd_coach_excluded((select e from hd_pc))then raise exception 'Sans droit payant accepté';end if;end$$;
set local role authenticated;
do $$begin
 if seneve.coach_eligible_enrollments()<>'[]'::jsonb then raise exception 'Sans droit payant proposé';end if;
 begin perform seneve.coach_ask(gen_random_uuid(),(select e from hd_pc),'RECETTE_PC_GRATUIT');raise exception 'Coach gratuit autorisé';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into seneve.payment_events(payment_event_id,fournisseur,id_evenement,type_evenement,signature_verifiee,participant_id,offre_id,brut,statut_traitement)select pay,'recette',pay::text,'payment.confirmed',true,p,pr,'{}','acces_ouvert'from hd_pc;
insert into seneve.entitlements(entitlement_id,participant_id,offre_id,origine,etat,payment_event_id,debut,fin)select d,p,pr,'achat','actif',pay,now()-interval '1 hour',now()+interval '1 hour'from hd_pc;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)select e,p,2,d,now()-interval '1 hour',now()+interval '1 hour'from hd_pc;
set local role authenticated;
do $$declare r jsonb;begin
 if not(seneve.coach_eligible_enrollments()@>jsonb_build_array((select e from hd_pc)))then raise exception 'Payant absent du catalogue';end if;
 r:=seneve.coach_ask(gen_random_uuid(),(select e from hd_pc),'RECETTE_PC_SANS_ENVOI');if r->>'message_id'is null then raise exception 'Payant refusé';end if;
end$$;
reset role;
update seneve.payment_events set statut_traitement='revoque'where payment_event_id in(select pay from hd_pc);
do $$begin if not seneve_private.hd_coach_excluded((select e from hd_pc))then raise exception 'Paiement révoqué accepté';end if;end$$;
do $$begin
 if exists(select 1 from seneve.claim_coach_jobs(20)c where c.message_id in(select message_id from seneve.coach_messages where participant_id in(select p from hd_pc)))then raise exception 'Tâche refusée transmise';end if;
 if exists(select 1 from seneve.jobs j join seneve.coach_messages m on m.message_id=(j.charge->>'message_id')::uuid where j.type='coach_repondre'and m.participant_id in(select p from hd_pc)and j.etat<>'en_attente')then raise exception 'Tâche refusée réservée';end if;
end$$;
update seneve.payment_events set statut_traitement='acces_ouvert'where payment_event_id in(select pay from hd_pc);
update seneve.entitlements set fin=now()where entitlement_id in(select d from hd_pc);
do $$begin if not seneve_private.hd_coach_excluded((select e from hd_pc))then raise exception 'Expiration acceptée';end if;end$$;
do $$begin
 if exists(select 1 from seneve.claim_coach_jobs(20)c where c.message_id in(select message_id from seneve.coach_messages where participant_id in(select p from hd_pc)))then raise exception 'Tâche refusée transmise';end if;
 if exists(select 1 from seneve.jobs j join seneve.coach_messages m on m.message_id=(j.charge->>'message_id')::uuid where j.type='coach_repondre'and m.participant_id in(select p from hd_pc)and j.etat<>'en_attente')then raise exception 'Tâche refusée réservée';end if;
end$$;
-- Le droit rétabli permet de réserver cette tâche, toujours sans appeler de service externe.
update seneve.entitlements set fin=now()+interval '1 hour'where entitlement_id in(select d from hd_pc);
update seneve.jobs j set cree_le='1900-01-01'where j.type='coach_repondre'and exists(select 1 from seneve.coach_messages m where m.message_id=(j.charge->>'message_id')::uuid and m.participant_id in(select p from hd_pc));
do $$begin
 if(select count(*)from seneve.claim_coach_jobs(1)c where c.message_id in(select message_id from seneve.coach_messages where participant_id in(select p from hd_pc)))<>1 then raise exception 'Tâche payante active non réservée';end if;
end$$;
rollback;
