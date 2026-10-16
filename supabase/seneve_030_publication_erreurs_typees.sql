-- SÉNEVÉ 2.0 — Migration 030 (16/10/2026, test de réception) : publication bloquée avec rapport
-- Défaut trouvé : publish_programme ajoutait ses messages d'erreur sous forme de texte non typé
-- (v_erreurs || 'jour en double'), ce que PostgreSQL lit comme un tableau mal formé : la fonction
-- s'arrêtait en erreur au lieu d'enregistrer la publication « bloquée » avec son rapport.
-- Correction : les 6 messages sont typés (text '...'). Rien d'autre ne change.
-- Appliquée par remplacement contrôlé (6 occurrences attendues) dans la définition en place.
do $mig$
declare d text; avant int; apres int;
begin
  d := pg_get_functiondef('seneve.publish_programme(text,text,text,text,integer,integer,text,integer,text,jsonb)'::regprocedure);
  avant := (select count(*) from regexp_matches(d, $r$v_erreurs := v_erreurs \|\| '$r$, 'g'));
  d := replace(d, $s$v_erreurs := v_erreurs || '$s$, $s$v_erreurs := v_erreurs || text '$s$);
  apres := (select count(*) from regexp_matches(d, $r$v_erreurs := v_erreurs \|\| text '$r$, 'g'));
  if avant <> 6 or apres <> 6 then raise exception 'remplacements inattendus : % / %', avant, apres; end if;
  execute d;
end $mig$;
