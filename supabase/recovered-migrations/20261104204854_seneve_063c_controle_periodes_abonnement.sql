-- Source récupérée depuis supabase_migrations.schema_migrations du projet seneve-test.
-- Version enregistrée : 20261104204854 ; nom : seneve_063c_controle_periodes_abonnement.
-- Le corps ci-dessous correspond à l'unique entrée de `statements`.
-- Aucun rollback n'était enregistré. Ne pas exécuter sans analyse et sauvegarde.
do $$
declare s text;
  a1 text := 'if d.origine<>''achat'' or d.payment_event_id is null or d.etat=''revoque'' then';
  a2 text := '(new.mois>1 and (d.origine<>''achat'' or d.payment_event_id is null))';
  ok text := '((d.origine=''achat'' and d.payment_event_id is not null) or (d.origine=''abonnement'' and d.parent_entitlement_id is not null))';
begin
  s := pg_get_functiondef('seneve.hd_validate_access_period()'::regprocedure);
  if position('parent_entitlement_id' in s) = 0 then
    if position(a1 in s) = 0 or position(a2 in s) = 0 then raise exception 'seneve_063 : contrôle introuvable dans hd_validate_access_period'; end if;
    s := replace(s, a1, 'if not ' || ok || ' or d.etat=''revoque'' then');
    s := replace(s, a2, '(new.mois>1 and not ' || ok || ')');
    execute s;
  end if;
end $$;
