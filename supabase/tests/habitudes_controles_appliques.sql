-- Essai de l'API EXISTANTE sur seneve-test, données fictives exclusivement.
-- Tout est annulé par rollback ; aucun contenu approuvé ni compte réel conservé.
begin;


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
do $$declare i record;r jsonb;begin
 select * into i from hd_integration_ids;
 begin insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)values(i.eb,i.pa,2,gen_random_uuid(),now(),now()+interval '1 hour');raise exception 'Création client de droit autorisée';exception when insufficient_privilege then null;end;
 if(select count(*) from seneve.contents where programme_id=i.programme)<>4 then raise exception 'Contenus autorisés absents';end if;
 if not seneve.hd_has_current_right(i.ea) then raise exception 'Droit gratuit valide non reconnu';end if;
 if seneve.hd_has_current_right(i.eb) then raise exception 'Droit compte B reconnu';end if;
 r:=seneve.record_progress(i.ea,i.a1,i.event1,'realisee','web');
 if r->>'etat'<>'realisee' or (r->>'repetition')::boolean then raise exception 'Première réalisation incorrecte';end if;
 if(select count(*) from seneve.activity_state where enrollment_id=i.ea and etat='realisee')<>1 then raise exception 'Une prière a validé les autres';end if;
 r:=seneve.record_progress(i.ea,i.a1,i.event1,'realisee','web');
 if not(r->>'repetition')::boolean then raise exception 'Rejeu non reconnu';end if;
 if(select count(*) from seneve.progress_events where enrollment_id=i.ea)<>1 then raise exception 'Rejeu compté deux fois';end if;
 begin perform seneve.record_progress(i.ea,i.a2,i.event1,'realisee','web');raise exception 'Identifiant recyclé accepté';exception when unique_violation then null;end;
 r:=seneve.record_progress(i.ea,i.a2,i.event2,'aide_demandee','web');
 if r->>'etat'<>'non_commencee' or not(r->>'aide_demandee')::boolean then raise exception 'Aide assimilée à réalisation';end if;
 r:=seneve.record_progress(i.ea,i.a2,i.event3,'preparee','web');
 if r->>'etat'<>'preparee' or not(r->>'aide_demandee')::boolean then raise exception 'Préparation ou aide perdue';end if;
 perform seneve.record_progress(i.ea,i.a2,i.event4,'realisee','web');
 perform seneve.record_progress(i.ea,i.a3,i.event5,'realisee','web');
 if(select count(*) from seneve.activity_state where enrollment_id=i.ea and etat='realisee')<>3 then raise exception 'Trois prières non indépendantes';end if;
 begin perform seneve.record_progress(i.eb,i.a1,gen_random_uuid(),'realisee','web');raise exception 'Écriture compte B autorisée';exception when insufficient_privilege then null;end;
 begin perform seneve.record_progress(i.ea,i.a4,gen_random_uuid(),'realisee','web');raise exception 'Jour futur autorisé';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- La production de jobs est vérifiée sans les réclamer ni envoyer de messages.
do $$declare i record;begin select * into i from hd_integration_ids;
 if(select count(*) from seneve.jobs where type='reevaluer_rappels' and charge->>'enrollment_id'=i.ea::text)<>5 then raise exception 'Nombre de jobs incohérent';end if;
 if(select count(*) from seneve.help_requests where participant_id=i.pa)<>1 then raise exception 'Demande aide absente ou doublonnée';end if;
end$$;
update seneve.hd_programme_links set actif=false where programme_id=(select programme from hd_integration_ids);
set local role authenticated;
do $$begin if exists(select 1 from seneve.contents where programme_id=(select programme from hd_integration_ids))then raise exception 'Registre inactif contourné';end if;end$$;
reset role;
update seneve.hd_programme_links set actif=true where programme_id=(select programme from hd_integration_ids);
update seneve.entitlements set etat='revoque' where participant_id=(select pa from hd_integration_ids);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 if seneve.hd_has_current_right(i.ea)then raise exception 'Droit révoqué autorisé';end if;
 if exists(select 1 from seneve.contents where programme_id=i.programme)then raise exception 'Lecture directe après révocation';end if;
 if(select count(*) from seneve.activity_state where enrollment_id=i.ea)<>3 then raise exception 'Historique indisponible';end if;
 begin perform seneve.record_progress(i.ea,i.a1,gen_random_uuid(),'realisee','web');raise exception 'API directe après révocation autorisée';exception when insufficient_privilege then null;end;
end$$;
reset role;
update seneve.entitlements set etat='actif',fin=now() where participant_id=(select pa from hd_integration_ids);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 if seneve.hd_has_current_right(i.ea)then raise exception 'Droit expiré autorisé';end if;
 if exists(select 1 from seneve.activities where activity_id in(i.a1,i.a2,i.a3))then raise exception 'Activités lisibles après expiration';end if;
 begin perform seneve.record_progress(i.ea,i.a2,gen_random_uuid(),'realisee','web');raise exception 'API directe après expiration autorisée';exception when insufficient_privilege then null;end;
end$$;
reset role;
update seneve.enrollments set etat='en_pause' where enrollment_id=(select ea from hd_integration_ids);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 begin perform seneve.record_progress(i.ea,i.a1,gen_random_uuid(),'realisee','web');raise exception 'Écriture inscription en pause autorisée';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
