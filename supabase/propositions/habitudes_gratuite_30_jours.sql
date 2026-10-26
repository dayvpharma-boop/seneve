-- Décision explicite de Dr Justin : 30 jours gratuits.
-- Référentiel brouillon TEST uniquement ; aucun droit ou paiement créé.
alter table seneve.hd_modules add column duree_gratuite_jours integer
 check(duree_gratuite_jours is null or duree_gratuite_jours>0);
comment on column seneve.hd_modules.duree_gratuite_jours is
 'Durée décidée de la phase gratuite, indépendante de la règle des mois payants.';
update seneve.hd_modules set duree_gratuite_jours=30
 where module_id='HABITUDES_DEFIS'and version=1 and statut='brouillon';
do $$begin
 if not exists(select 1 from seneve.hd_modules where module_id='HABITUDES_DEFIS'and version=1 and statut='brouillon'and duree_gratuite_jours=30)then
  raise exception 'Référentiel brouillon HD absent';end if;
end$$;
