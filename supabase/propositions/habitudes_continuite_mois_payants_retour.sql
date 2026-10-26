-- Retour arrière de habitudes_continuite_mois_payants.sql
-- Restaure les quatre fonctions d'origine depuis seneve_private.sauvegardes_definitions,
-- puis retire le déclencheur, les nouvelles fonctions et la table des offres acceptées.
-- Les mois HD déjà ouverts par Continuité sont listés AVANT suppression : à examiner (ils deviendraient
-- invalides pour les gardes d'origine). Exécuter d'abord la requête de contrôle ci-dessous.
--
-- Contrôle préalable :
--   select p.* from seneve.hd_access_periods p join seneve.entitlements d using(entitlement_id)
--    where p.mois>1 and d.offre_id like 'CONTINUITE_MENSUEL_%';

begin;
do $$
declare r record;
begin
  for r in select distinct on (objet) objet, definition from seneve_private.sauvegardes_definitions
            where motif='avant habitudes_continuite_mois_payants' order by objet, sauvegarde_le desc loop
    execute r.definition;
  end loop;
end $$;
drop trigger if exists hd_retirer_mois_revoque on seneve.entitlements;
drop function if exists seneve.hd_retirer_mois_revoque();
drop function if exists seneve._ouvrir_mois_habitudes(uuid,uuid);
drop function if exists seneve.hd_offre_acceptee(text,text,integer,text,integer);
drop table if exists seneve.hd_offres_mensuelles;
commit;
