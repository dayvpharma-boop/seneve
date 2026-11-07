-- Retour arrière de hd_finance_compteurs.sql : retire uniquement ce que cette migration a ajouté.
-- ATTENTION : efface les compteurs (dîme, offrande, pour vivre), les retraits d'épargne et l'historique des répartitions.
-- Les versements d'épargne et les remboursements créés par une répartition restent (ils vivent dans les tables existantes).
drop function if exists seneve.hd_finance_counters_get(uuid);
drop function if exists seneve.hd_finance_allocation_save(uuid,text,date,jsonb,uuid);
drop function if exists seneve.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid);
drop function if exists seneve.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid);
drop function if exists seneve_private.hd_finance_counters_get(uuid);
drop function if exists seneve_private.hd_finance_allocation_save(uuid,text,date,jsonb,uuid);
drop function if exists seneve_private.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid);
drop function if exists seneve_private.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid);
drop function if exists seneve_private.hd_finance_goal_balance(uuid);
drop function if exists seneve_private.hd_finance_envelope_balance(uuid,text,text);
drop function if exists seneve_private.hd_finance_derived_id(uuid,integer);
drop table if exists seneve.hd_finance_allocations;
drop table if exists seneve.hd_finance_savings_withdrawals;
drop table if exists seneve.hd_finance_envelope_moves;
