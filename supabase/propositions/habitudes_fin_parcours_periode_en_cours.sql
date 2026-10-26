-- Habitudes & Défis — un parcours n'est pas clôturé tant qu'une période d'accès est encore en cours.
-- Défaut constaté le 26/10/2026 (23h30) : l'inscription gratuite prévoit sa fin au jour 30, mais les 30 jours gratuits
-- (720 heures depuis l'inscription) finissent le jour 31 au soir. La clôture horaire terminait donc le parcours le
-- matin du jour 31 : la personne perdait son écran, et un achat Continuité fait ce jour-là n'ouvrait pas le mois 2.
-- Seul changement : la condition « aucune période HD en cours » dans close_finished_enrollments. Les autres parcours
-- sont clôturés comme avant (une inscription sans période HD n'est pas concernée).
insert into seneve_private.sauvegardes_definitions(objet,definition,motif)
select p.oid::regprocedure::text,pg_get_functiondef(p.oid),'avant habitudes_fin_parcours_periode_en_cours'
  from pg_proc p where p.oid='seneve.close_finished_enrollments()'::regprocedure;

do $$
declare d text; ancien text := '> coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 7) - 1))';
begin
  d := pg_get_functiondef('seneve.close_finished_enrollments()'::regprocedure);
  if (length(d) - length(replace(d, ancien, ''))) / length(ancien) <> 1 then
    raise exception 'Texte attendu introuvable ou ambigu dans close_finished_enrollments';
  end if;
  -- Fins de ligne différentes selon la base : on ajoute la condition sur la même ligne.
  d := replace(d, ancien, ancien ||
    ' and not exists (select 1 from seneve.hd_access_periods a where a.enrollment_id = e.enrollment_id and a.fin_exclue > now())'
    || ' /* HD : jamais pendant une période d''accès en cours */');
  execute d;
end $$;
