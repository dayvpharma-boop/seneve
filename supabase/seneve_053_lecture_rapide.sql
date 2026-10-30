-- SÉNEVÉ 053 — Lecture rapide des journées (demande de Dr Justin du 30/10/2026 : la page Habitudes & Défis
-- mettait jusqu'à 15 s à s'afficher).
-- Constat (production, 30/10/2026) : lire les 16 activités d'une journée prenait ~500 ms côté base, dont ~490 ms
-- à vérifier les droits sur TOUS les contenus (2 669 lignes, une fonction hd_content_allowed par ligne).
-- Mêmes droits, calcul plus court :
--  1) activities et resources : la règle vérifie le contenu de la ligne lue (EXISTS sur ce contenu) au lieu de
--     construire la liste de tous les contenus visibles. Toutes les colonnes concernées sont NOT NULL ou traitées
--     à l'identique (content_id NULL : refusé dans les deux écritures).
--  2) contents (garde Habitudes & Défis, RESTRICTIVE) : la liste des programmes HD et celle des inscriptions HD
--     ouvrant droit sont calculées une seule fois par requête au lieu d'un appel de fonction par ligne.
--     hd_programme_links.(programme_id,version,langue) et contents.(…) sont NOT NULL : NOT IN est sûr.
--     La fonction seneve.hd_content_allowed est conservée (plus utilisée par aucune règle, gardée pour le retour arrière).
-- Retour arrière : voir le bloc commenté en fin de fichier.
-- APPLIQUÉE en production le 30/10/2026 vers 23 h (Kinshasa) par Dr Justin (SQL Editor). Vérifié ensuite sur son compte :
--   contenus, activités et ressources visibles identiques à l'octet près (2 488 / 5 483 / 13, empreintes md5 égales) ;
--   activités d'une journée : 505 ms -> 14 ms ; activités des 30 jours de l'historique : ~1 s -> 29 ms (temps base).
-- Base de test (rlojnuaajeubzlwofwhn) : PAS encore appliquée.
begin;

drop policy if exists activites_de_mes_contenus on seneve.activities;
create policy activites_de_mes_contenus on seneve.activities
  for select to authenticated
  using (exists (select 1 from seneve.contents c where c.content_id = activities.content_id));

drop policy if exists ressources_publiees on seneve.resources;
create policy ressources_publiees on seneve.resources
  for select to authenticated
  using (etat = 'publie' and (est_public or exists (select 1 from seneve.contents c where c.content_id = resources.content_id)));

drop policy if exists hd_contents_access_guard on seneve.contents;
create policy hd_contents_access_guard on seneve.contents
  as restrictive for select to authenticated
  using (
    (programme_id, version, langue) not in (select l.programme_id, l.version, l.langue from seneve.hd_programme_links l)
    or (programme_id, version, langue) in (
      select e.programme_id, e.version, e.langue from seneve.enrollments e
      where e.participant_id = (select seneve.current_participant_id())
        and seneve.hd_has_current_right(e.enrollment_id))
  );

commit;

-- Retour arrière (règles d'avant le 30/10/2026) :
-- begin;
-- drop policy activites_de_mes_contenus on seneve.activities;
-- create policy activites_de_mes_contenus on seneve.activities for select to authenticated
--   using (content_id in (select contents.content_id from seneve.contents));
-- drop policy ressources_publiees on seneve.resources;
-- create policy ressources_publiees on seneve.resources for select to authenticated
--   using (etat = 'publie' and (est_public or content_id in (select contents.content_id from seneve.contents)));
-- drop policy hd_contents_access_guard on seneve.contents;
-- create policy hd_contents_access_guard on seneve.contents as restrictive for select to authenticated
--   using (seneve.hd_content_allowed(programme_id, version, langue));
-- commit;
