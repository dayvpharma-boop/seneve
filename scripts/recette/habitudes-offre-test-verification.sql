-- DONNÉES DE RECETTE : exécuter exclusivement sur rlojnuaajeubzlwofwhn (seneve-test).
-- Crée un catalogue technique FR, sans inscription ni période ouverte.
-- Identifiants réservés : ne remplace aucun catalogue existant.
begin;
select pg_advisory_xact_lock(hashtextextended('HD_RECETTE_INSCRIPTION_FR_20261026',0));
do $$begin
 if exists(select 1 from seneve.programmes where programme_id='HD_RECETTE_INSCRIPTION_FR_20261026') then
  raise exception 'Catalogue de recette déjà présent : vérifier son état sans le remplacer';
 end if;
 if (select count(*) from seneve.hd_habit_templates where module_id='HABITUDES_DEFIS' and version=1 and langue='fr' and heure_proposee is not null)<>15 then
  raise exception 'Les 15 modèles FR avec horaires sont requis';
 end if;
end$$;
insert into seneve.programmes(programme_id,nom,description,type_parcours,langue,duree_jours,messages_par_jour,quota_coach_jour)
values('HD_RECETTE_INSCRIPTION_FR_20261026','ESSAI TECHNIQUE — Habitudes & Défis','Recette de préinscription et d’horaires uniquement, dans seneve-test. Aucun contenu pédagogique de production, abonnement ou envoi de rappel associé.','recette','fr',30,3,0);
insert into seneve.programme_versions(programme_id,version,etat,valide_par,date_validation,publiee_le)
values('HD_RECETTE_INSCRIPTION_FR_20261026',1,'publiee','RECETTE_TECHNIQUE_TEST_AUTORISEE_PAR_PORTEUR',now(),now());
insert into seneve.hd_programme_links(programme_id,version,langue,module_id,module_version,actif)
values('HD_RECETTE_INSCRIPTION_FR_20261026',1,'fr','HABITUDES_DEFIS',1,true);
insert into seneve.offers(offre_id,produit,type_offre,langue,programme_id,prix,devise,duree_acces_jours,actif,chariow_product_id,lien_achat)
values('HD_RECETTE_INSCRIPTION_FR_20261026_30J','ESSAI TECHNIQUE — 30 jours gratuits sans coach IA','habitudes_defis_gratuit','fr','HD_RECETTE_INSCRIPTION_FR_20261026',0,null,30,true,null,null);

create temporary table hd_offre_test_ids as select gen_random_uuid() as utilisateur,gen_random_uuid() as participant;
insert into auth.users(id) select utilisateur from hd_offre_test_ids;
insert into seneve.participants(participant_id,auth_user_id,prenom,fuseau) select participant,utilisateur,'RECETTE_OFFRE_TEST_FICTIVE','Africa/Kinshasa' from hd_offre_test_ids;
select set_config('request.jwt.claim.sub',(select utilisateur::text from hd_offre_test_ids),true);
set local role authenticated;
do $$declare c jsonb;o jsonb;h jsonb;r jsonb;begin
 c:=seneve.hd_free_catalogue('fr');
 select value into o from jsonb_array_elements(c->'offres') where value->>'offre_id'='HD_RECETTE_INSCRIPTION_FR_20261026_30J';
 if o is null or jsonb_array_length(o->'planning')<>15 then raise exception 'Offre ou planning incomplet';end if;
 select jsonb_agg(jsonb_build_object('habit_key',x->'habit_key','creneaux',x->'creneaux'))into h from jsonb_array_elements(o->'planning')x;
 begin
  perform seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,false);
  raise exception 'Une inscription sans confirmation a été acceptée';
 exception when insufficient_privilege then null;end;
 r:=seneve.hd_start_free(o->>'programme_id',1,'fr',o->>'offre_id',h,true);
 if not coalesce((r->>'cree')::boolean,false) or (r->>'fin_exclue')::timestamptz-(r->>'debut')::timestamptz<>interval '720 hours' then raise exception 'Durée ou création incohérente';end if;
 if jsonb_array_length(seneve.coach_eligible_enrollments())<>0 then raise exception 'Coach proposé pendant le gratuit';end if;
 r:=seneve.hd_free_catalogue('fr');
 if r->>'motif'<>'gratuite_deja_utilisee' then raise exception 'Accès gratuit répété proposé';end if;
end$$;
reset role;
select (select count(*) from seneve.hd_access_periods where participant_id in(select participant from hd_offre_test_ids)) as periode_fictive,
(select count(*) from seneve.hd_habit_schedules where participant_id in(select participant from hd_offre_test_ids)) as horaires_fictifs,
(select count(*) from seneve_private.hd_schedule_heads where participant_id in(select participant from hd_offre_test_ids)) as habitudes_fictives;
rollback;
