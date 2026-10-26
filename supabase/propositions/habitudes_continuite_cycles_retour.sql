-- Retour arrière de habitudes_continuite_cycles.sql (+ numéro de cycle et correctif de remboursement)
-- Revient à l'état de habitudes_continuite_mois_payants.sql.
-- Contrôle préalable (doit être vide, sinon examiner les nouveaux cycles avant de revenir en arrière) :
--   select * from seneve.hd_access_periods where cycle > 1;
--   select * from seneve.hd_cycles_planifies where etat = 'en_attente';
begin;
do $$
declare r record;
begin
  if exists(select 1 from seneve.hd_access_periods where cycle > 1) then
    raise exception 'Des nouveaux cycles existent : retour arrière refusé sans examen.';
  end if;
  for r in select distinct on (objet) objet, definition from seneve_private.sauvegardes_definitions
            where motif='avant habitudes_continuite_cycles' order by objet, sauvegarde_le desc loop
    execute r.definition;
  end loop;
end $$;
drop trigger if exists hd_cycle_apres_fin on seneve.enrollments;
drop trigger if exists hd_access_period_cycle on seneve.hd_access_periods;
drop function if exists seneve.hd_cycle_apres_fin();
drop function if exists seneve.hd_cycle_coherent();
drop function if exists seneve._hd_demarrer_cycle(uuid,uuid,uuid);
drop function if exists seneve.hd_droit_a(uuid,timestamptz);
drop function if exists seneve.hd_offre_mensuelle(text,text,integer,text,integer);
drop table if exists seneve.hd_cycles_planifies;
drop index if exists seneve.hd_access_un_mois1_par_cycle_idx;
drop index if exists seneve.hd_access_one_free_idx;
create unique index hd_access_one_free_idx on seneve.hd_access_periods (participant_id) where mois = 1;
alter table seneve.hd_access_periods drop column cycle;
alter table seneve.hd_offres_mensuelles drop column nouveau_cycle;
commit;
