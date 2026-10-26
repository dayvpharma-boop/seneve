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
commit;
