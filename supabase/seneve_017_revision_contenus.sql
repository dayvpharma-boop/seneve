-- SÉNEVÉ 017 — Révision d'un programme publié (13/10/2026).
-- Une même ligne de la feuille CONTENUS (contenu_id) doit pouvoir figurer dans plusieurs versions publiées :
-- la version 2 reste archivée telle quelle, la version 3 reprend la ligne revue.
-- L'unicité porte donc sur (contenu_id de la feuille, version) et non plus sur le seul contenu_id.
alter table seneve.contents drop constraint contents_legacy_contenu_id_key;
alter table seneve.contents add constraint contents_legacy_contenu_id_version_key unique (legacy_contenu_id, version);
