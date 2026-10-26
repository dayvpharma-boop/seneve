-- Retour arrière de habitudes_fin_parcours_periode_en_cours.sql : restaure la définition sauvegardée.
do $$
declare r record;
begin
  select definition into strict r from seneve_private.sauvegardes_definitions
   where motif='avant habitudes_fin_parcours_periode_en_cours' order by sauvegarde_le desc limit 1;
  execute r.definition;
end $$;
