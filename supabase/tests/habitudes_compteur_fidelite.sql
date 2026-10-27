-- Recette du compteur « Mes jours de fidélité » sur seneve-test, comptes fictifs A et B.
-- Scénarios HD-10 à HD-15. Tout est annulé à la fin : l'exception finale porte le résultat.
begin;
create temporary table fid_ids as select
 gen_random_uuid() ua,gen_random_uuid() ub,gen_random_uuid() pa,gen_random_uuid() pb,
 gen_random_uuid() ea,gen_random_uuid() eb,
 gen_random_uuid() ev1,gen_random_uuid() ev2,gen_random_uuid() ev3,
 'HD_RECETTE_'||replace(gen_random_uuid()::text,'-','') programme,
 (now()at time zone 'Africa/Kinshasa')::date-25 debut;
insert into auth.users(id)select ua from fid_ids union all select ub from fid_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom)
 select pa,ua,'RECETTE_FICTIVE_A' from fid_ids union all select pb,ub,'RECETTE_FICTIVE_B' from fid_ids;
insert into seneve.programmes(programme_id,nom,type_parcours,langue,duree_jours,messages_par_jour)
 select programme,'Recette fictive — ne pas publier','recette','fr',30,1 from fid_ids;
insert into seneve.programme_versions(programme_id,version,etat)select programme,1,'archivee' from fid_ids;
-- A est au jour 26 de son parcours ; B est inscrit mais sans accès en cours.
insert into seneve.enrollments(enrollment_id,participant_id,programme_id,version,langue,date_debut,date_fin_prevue,etat)
 select ea,pa,programme,1,'fr',debut,debut+59,'active' from fid_ids union all
 select eb,pb,programme,1,'fr',debut,debut+29,'active' from fid_ids;
insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)
 select programme,1,'fr','HABITUDES_DEFIS',1,true from fid_ids;
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,actif)
 select programme||'_FREE','Fixture fictive','recette','fr',programme,true from fid_ids;
insert into seneve.entitlements(participant_id,offre_id,origine,etat,debut,fin)
 select pa,programme||'_FREE','gratuit','actif',now()-interval '1 hour',now()+interval '1 hour' from fid_ids;
insert into seneve.hd_access_periods(enrollment_id,participant_id,mois,entitlement_id,debut,fin_exclue)
 select i.ea,i.pa,1,d.entitlement_id,d.debut,d.fin from fid_ids i join seneve.entitlements d on d.participant_id=i.pa;
create temporary table fid_avant as select
 (select count(*)from seneve.progress_events)evenements,(select count(*)from seneve.activity_state)etats,
 (select count(*)from seneve.entitlements)droits,(select count(*)from seneve.audit_events)audit,
 (select to_jsonb(e)from seneve.enrollments e join fid_ids i on e.enrollment_id=i.ea)inscription_a;
do $$begin execute format('grant usage on schema %I to authenticated,anon',(select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on fid_ids to authenticated,anon;

-- Compte A : lecture, masquage, déclaration, double appui, annulation.
select set_config('request.jwt.claim.sub',(select ua::text from fid_ids),true);
set local role authenticated;
do $$declare i record;r jsonb;begin
 select * into i from fid_ids;
 r:=seneve.hd_fidelite_lire(i.ea);
 if (r->>'jours')::int<>25 or not(r->>'masque')::boolean or (r->>'annulable')::boolean then raise exception 'Lecture initiale incorrecte : %',r;end if;
 r:=seneve.hd_fidelite_masquer(i.ea,false);
 if (r->>'masque')::boolean or (r->>'jours')::int<>25 then raise exception 'Affichage incorrect : %',r;end if;
 begin perform seneve.hd_fidelite_declarer(i.ea,i.ev1,false);raise exception 'Déclaration sans confirmation acceptée';exception when invalid_parameter_value then null;end;
 r:=seneve.hd_fidelite_declarer(i.ea,i.ev1,true);
 if (r->>'jours')::int<>0 or (r->>'repetition')::boolean or not(r->>'annulable')::boolean then raise exception 'HD-12 remise à zéro incorrecte : %',r;end if;
 r:=seneve.hd_fidelite_declarer(i.ea,i.ev1,true);
 if not(r->>'repetition')::boolean or (r->>'jours')::int<>0 then raise exception 'Double appui incorrect : %',r;end if;
 r:=seneve.hd_fidelite_annuler(i.ea);
 if (r->>'jours')::int<>25 or (r->>'annulable')::boolean then raise exception 'HD-13 annulation incorrecte : %',r;end if;
 begin perform seneve.hd_fidelite_annuler(i.ea);raise exception 'Deuxième annulation acceptée';exception when invalid_parameter_value then null;end;
 -- Deux déclarations le même jour : l'annulation revient bien au jour 25.
 perform seneve.hd_fidelite_declarer(i.ea,i.ev2,true);perform seneve.hd_fidelite_declarer(i.ea,i.ev3,true);
 r:=seneve.hd_fidelite_annuler(i.ea);
 if (r->>'jours')::int<>25 then raise exception 'Annulation après deux déclarations incorrecte : %',r;end if;
 perform seneve.hd_fidelite_declarer(i.ea,gen_random_uuid(),true);
 begin perform count(*)from seneve_private.hd_fidelite;raise exception 'Table privée lisible';exception when insufficient_privilege then null;end;
end$$;

-- HD-15 : le compte B ne lit ni ne modifie le compteur de A ; sans accès en cours, il ne déclare pas.
reset role;
select set_config('request.jwt.claim.sub',(select ub::text from fid_ids),true);
set local role authenticated;
do $$declare i record;r jsonb;begin
 select * into i from fid_ids;
 begin perform seneve.hd_fidelite_lire(i.ea);raise exception 'HD-15 : B lit le compteur de A';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_fidelite_masquer(i.ea,true);raise exception 'HD-15 : B masque le compteur de A';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_fidelite_declarer(i.ea,gen_random_uuid(),true);raise exception 'HD-15 : B déclare pour A';exception when insufficient_privilege then null;end;
 begin perform seneve.hd_fidelite_annuler(i.ea);raise exception 'HD-15 : B annule pour A';exception when insufficient_privilege then null;end;
 r:=seneve.hd_fidelite_lire(i.eb);
 if (r->>'jours')::int<>25 then raise exception 'Lecture de B incorrecte : %',r;end if;
 begin perform seneve.hd_fidelite_declarer(i.eb,gen_random_uuid(),true);raise exception 'Déclaration sans accès acceptée';exception when insufficient_privilege then null;end;
end$$;

-- Visiteur non connecté : aucune fonction exécutable.
reset role;
set local role anon;
do $$declare i record;begin
 select * into i from fid_ids;
 begin perform seneve.hd_fidelite_lire(i.ea);raise exception 'Visiteur : lecture possible';exception when insufficient_privilege then null;end;
end$$;

-- Vérifications serveur : rien d'autre n'a bougé, puis effacement après 30 jours et à la suppression du compte.
reset role;
do $$declare i record;a record;f record;n int;begin
 select * into i from fid_ids;select * into a from fid_avant;
 if (select count(*)from seneve.progress_events)<>a.evenements or (select count(*)from seneve.activity_state)<>a.etats
  or (select count(*)from seneve.entitlements)<>a.droits then raise exception 'HD-12 : progression ou droits modifiés';end if;
 if (select count(*)from seneve.audit_events)<>a.audit then raise exception 'Une trace d''audit a été écrite';end if;
 if (select to_jsonb(e)from seneve.enrollments e where e.enrollment_id=i.ea)<>a.inscription_a then raise exception 'HD-12 : inscription modifiée';end if;
 select * into f from seneve_private.hd_fidelite where enrollment_id=i.ea;
 if f.debut_serie<>(now()at time zone 'Africa/Kinshasa')::date or f.masque then raise exception 'Ligne stockée incorrecte';end if;
 if (select count(*)from information_schema.columns where table_schema='seneve_private' and table_name='hd_fidelite')<>7 then raise exception 'Colonnes inattendues';end if;
 n:=seneve_private.hd_fidelite_purger();
 if n<>0 or not exists(select 1 from seneve_private.hd_fidelite where enrollment_id=i.ea)then raise exception 'Effacement trop tôt';end if;
 update seneve.entitlements set debut=now()-interval '62 days' where participant_id=i.pa;
 update seneve.hd_access_periods set debut=now()-interval '62 days',fin_exclue=now()-interval '31 days' where enrollment_id=i.ea;
 n:=seneve_private.hd_fidelite_purger();
 if n<>1 or exists(select 1 from seneve_private.hd_fidelite where enrollment_id=i.ea)then raise exception 'Effacement après 30 jours absent';end if;
 insert into seneve_private.hd_fidelite(enrollment_id,participant_id,debut_serie)values(i.eb,i.pb,i.debut);
 delete from seneve.enrollments where enrollment_id=i.eb;
 if exists(select 1 from seneve_private.hd_fidelite where enrollment_id=i.eb)then raise exception 'Compteur conservé après suppression du parcours';end if;
 if not exists(select 1 from cron.job where jobname='seneve-hd-fidelite-effacement')then raise exception 'Effacement quotidien non planifié';end if;
 raise exception 'RECETTE_FIDELITE_OK';
end$$;
rollback;
