-- Seulement si la correction F01 doit être retirée. Ne supprime aucune donnée.
-- Retirer la contrainte avant sa fonction ; les définitions préexistantes ne changent pas.
begin;
set local lock_timeout = '3s';
alter table seneve.push_appareils drop constraint if exists push_appareils_abonnement_valide;
drop function if exists seneve_private.push_abonnement_valide(text, text, text);
commit;
