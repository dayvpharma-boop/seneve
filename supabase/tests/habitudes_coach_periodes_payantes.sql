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



select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
set local role authenticated;
do $$begin
 begin perform seneve.coach_ask(gen_random_uuid(),(select ea from hd_integration_ids),'RECETTE GRATUIT');raise exception 'Coach gratuit autorisé';exception when insufficient_privilege then null;end;
 if seneve.coach_eligible_enrollments()<>'[]'::jsonb then raise exception 'Gratuit proposé';end if;
end$$;
reset role;
delete from seneve.hd_access_periods where enrollment_id in(select ea from hd_integration_ids);
delete from seneve.entitlements where participant_id in(select pa from hd_integration_ids);
update seneve.programmes set quota_coach_jour=17 where programme_id in(select programme from hd_integration_ids);
create temporary table hd_paid_coach_ids as select gen_random_uuid()payment_id,gen_random_uuid()entitlement_id;
insert into seneve.payment_events(payment_event_id,fournisseur,id_evenement,type_evenement,signature_verifiee,participant_id,offre_id,brut,statut_traitement)
select p.payment_id,'recette',p.payment_id::text,'payment.confirmed',true,i.pa,i.programme||'_FREE','{}','acces_ouvert'from hd_paid_coach_ids p cross join hd_integration_ids i;
insert into seneve.entitlements(entitlement_id,participant_id,offre_id,origine,etat,payment_event_id,debut,fin)
select p.entitlement_id,i.pa,i.programme||'_FREE','achat','actif',p.payment_id,now()-interval '1 hour',now()+interval '1 hour'from hd_paid_coach_ids p cross join hd_integration_ids i;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
select i.ea,i.pa,2,p.entitlement_id,now()-interval '1 hour',now()+interval '1 hour'from hd_paid_coach_ids p cross join hd_integration_ids i;
grant select on hd_paid_coach_ids to authenticated;
set local role authenticated;
do $$declare r jsonb;begin
 if not(seneve.coach_eligible_enrollments()@>jsonb_build_array((select ea from hd_integration_ids)))then raise exception 'Payant non proposé';end if;
 r:=seneve.coach_quota();if(r->>'quota')::int<>17 then raise exception 'Quota configuré ignoré';end if;
 r:=seneve.coach_ask(gen_random_uuid(),(select ea from hd_integration_ids),'RECETTE COACH PAYANT SANS ENVOI');if r->>'message_id'is null then raise exception 'Payant refusé';end if;
end$$;
reset role;
-- Révocation du paiement : même un droit resté actif ne doit plus ouvrir le coach.
update seneve.payment_events set statut_traitement='revoque'where payment_event_id in(select payment_id from hd_paid_coach_ids);
set local role authenticated;
do $$begin
 if seneve.coach_eligible_enrollments()<>'[]'::jsonb then raise exception 'Paiement révoqué proposé';end if;
 begin perform seneve.coach_ask(gen_random_uuid(),(select ea from hd_integration_ids),'RECETTE REVOQUE');raise exception 'Paiement révoqué autorisé';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if exists(select 1 from seneve.claim_coach_jobs(20)c where c.message_id in(select message_id from seneve.coach_messages where texte='RECETTE COACH PAYANT SANS ENVOI'))then raise exception 'Tâche révoquée transmise';end if;
end$$;
update seneve.payment_events set statut_traitement='acces_ouvert'where payment_event_id in(select payment_id from hd_paid_coach_ids);
update seneve.entitlements set fin=now()where entitlement_id in(select entitlement_id from hd_paid_coach_ids);
set local role authenticated;
do $$begin
 if seneve.coach_eligible_enrollments()<>'[]'::jsonb then raise exception 'Droit expiré proposé';end if;
 begin perform seneve.coach_ask(gen_random_uuid(),(select ea from hd_integration_ids),'RECETTE EXPIRE');raise exception 'Droit expiré autorisé';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
