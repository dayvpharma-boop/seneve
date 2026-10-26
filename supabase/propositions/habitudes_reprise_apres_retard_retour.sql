-- Retour arrière de habitudes_reprise_apres_retard.sql : restaure les quatre définitions sauvegardées, puis retire
-- les fonctions de calcul du jour. Les inscriptions déjà rouvertes restent actives (à examiner au cas par cas :
-- select * from seneve.audit_events where action='hd_parcours_repris').
do $$
declare r record;
begin
  for r in select distinct on (objet) objet, definition from seneve_private.sauvegardes_definitions
            where motif='avant habitudes_reprise_apres_retard' order by objet, sauvegarde_le desc loop
    execute r.definition;
  end loop;
end $$;
drop function if exists seneve.hd_date_du_jour(uuid,integer);
drop function if exists seneve.hd_jour_du(uuid,date);
drop function if exists seneve.hd_debuts_mois(uuid);
