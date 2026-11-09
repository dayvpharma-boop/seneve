-- Le client limite la part à enregistrer. Ce contrôle protège aussi des
-- répartitions calculées à partir d'un ancien solde et des versements simultanés.
create function seneve_private.hd_finance_check_goal_target()
returns trigger language plpgsql volatile security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('seneve/objectif/' || new.goal_id::text, 0)
  );
  if exists (
    select 1
    from seneve.hd_finance_savings_goals g
    where g.goal_id = new.goal_id
      and seneve_private.hd_finance_goal_balance(g.goal_id) > g.target_amount
  ) then
    raise exception 'Le versement dépasse le montant restant pour cet objectif'
      using errcode='PFC01';
  end if;
  return new;
end;
$$;

revoke all on function seneve_private.hd_finance_check_goal_target()
from public, anon, authenticated, service_role;

-- AFTER INSERT ignore les reprises idempotentes avec ON CONFLICT DO NOTHING.
create trigger hd_finance_savings_target_guard
after insert on seneve.hd_finance_savings_entries
for each row execute function seneve_private.hd_finance_check_goal_target();
