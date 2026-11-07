-- Source récupérée depuis supabase_migrations.schema_migrations du projet seneve-test.
-- Version enregistrée : 20261104204140 ; nom : seneve_063b_abonnements_origine.
-- Le corps ci-dessous correspond à l'unique entrée de `statements`.
-- Aucun rollback n'était enregistré. Ne pas exécuter sans analyse et sauvegarde.
do $$
declare s text;
begin
  s := pg_get_functiondef('seneve._ouvrir_mois_habitudes(uuid,uuid)'::regprocedure);
  s := replace(s, 'd.origine=''abonnement_annuel''', 'd.origine=''abonnement''');
  execute s;
  s := pg_get_functiondef('seneve._ouvrir_acces(uuid,uuid)'::regprocedure);
  s := replace(s, '''abonnement_annuel''', '''abonnement''');
  execute s;
  s := pg_get_functiondef('seneve_private.abonnements_ouvrir_mois_suivants()'::regprocedure);
  s := replace(s, 'c.origine = ''abonnement_annuel''', 'c.origine = ''abonnement''');
  execute s;
end $$;
