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

delete from seneve.hd_access_periods where enrollment_id in(select ea from hd_integration_ids);
delete from seneve.entitlements where participant_id in(select pa from hd_integration_ids);
do $$begin execute format('grant usage on schema %I to service_role,authenticated',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_integration_ids to service_role,authenticated;
set local role service_role;
do $$declare i record;r jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.hd_open_free_period(i.ea,i.programme||'_FREE');
 if r->>'motif'<>'offre_gratuite_non_configuree'then raise exception 'Offre non approuvée acceptée';end if;
end$$;
reset role;
update seneve.offers set type_offre='habitudes_defis_gratuit',prix=0,duree_acces_jours=30,chariow_product_id=null,lien_achat=null where programme_id in(select programme from hd_integration_ids);
set local role service_role;
do $$declare i record;r jsonb;r2 jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.hd_open_free_period(i.ea,i.programme||'_FREE');
 if not coalesce((r->>'cree')::boolean,false)then raise exception 'Gratuité valide refusée : %',r->>'motif';end if;
 if (r->>'fin_exclue')::timestamptz-(r->>'debut')::timestamptz<>interval '720 hours'then raise exception 'Durée différente de 30 jours';end if;
 r2:=seneve.hd_open_free_period(i.ea,i.programme||'_FREE');
 if(r2->>'cree')::boolean or not(r2->>'existant')::boolean or r2->>'entitlement_id'<>r->>'entitlement_id' or r2->>'fin_exclue'<>r->>'fin_exclue' then raise exception 'Rejeu a créé ou prolongé le droit';end if;
end$$;
reset role;
update seneve.enrollments set participant_id=(select pa from hd_integration_ids)where enrollment_id in(select eb from hd_integration_ids);
set local role service_role;
do $$declare i record;r jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.hd_open_free_period(i.eb,i.programme||'_FREE');
 if r->>'motif'<>'gratuite_deja_utilisee'then raise exception 'Seconde gratuité acceptée';end if;
end$$;
reset role;
update seneve.entitlements set etat='revoque'where participant_id in(select pa from hd_integration_ids);
set local role service_role;
do $$declare i record;r jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.hd_open_free_period(i.ea,i.programme||'_FREE');
 if(r->>'cree')::boolean or r->>'etat'<>'revoque'then raise exception 'Droit révoqué réactivé';end if;
end$$;
reset role;
-- Un deuxième participant ne peut ouvrir à une date de début future.
update seneve.enrollments set participant_id=(select pb from hd_integration_ids),date_debut=(now()at time zone 'Africa/Kinshasa')::date+1,date_fin_prevue=(now()at time zone 'Africa/Kinshasa')::date+2 where enrollment_id in(select eb from hd_integration_ids);
set local role service_role;
do $$declare i record;r jsonb;begin select * into i from hd_integration_ids;
 r:=seneve.hd_open_free_period(i.eb,i.programme||'_FREE');
 if r->>'motif'<>'debut_inscription_non_concordant'then raise exception 'Début futur accepté';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',(select ua::text from hd_integration_ids),true);
set local role authenticated;
do $$declare i record;begin select * into i from hd_integration_ids;
 begin perform seneve.hd_open_free_period(i.ea,i.programme||'_FREE');raise exception 'Appel client autorisé';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$declare i record;begin select * into i from hd_integration_ids;
 if(select count(*)from seneve.entitlements where participant_id=i.pa)<>1 then raise exception 'Doublon de droit';end if;
 if(select count(*)from seneve.hd_access_periods where participant_id=i.pa)<>1 then raise exception 'Doublon de période';end if;

end$$;
rollback;
