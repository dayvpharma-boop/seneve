-- Les deux rythmes restent distincts dans les données et dans les réponses à l'ancien client.
alter table seneve.hd_finance_debt_accounts
 add column weekly_basis numeric(12,2),
 add column weekly_repayment_percent numeric(5,2),
 add constraint hd_finance_debt_accounts_weekly_guide_check check (
  (weekly_basis is null) = (weekly_repayment_percent is null)
  and (weekly_basis is null or (monthly_basis is null and weekly_basis >= 0))
  and (weekly_repayment_percent is null or weekly_repayment_percent between 0 and 100)
 );

create function seneve_private.hd_finance_debt_add(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid,p_weekly_basis numeric)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 enrollment uuid;
 d seneve.hd_finance_debt_accounts%rowtype;
 debt_number_next integer;
 repayment_basis numeric := coalesce(p_monthly_basis,p_weekly_basis);
 monthly_percent numeric := case when p_monthly_basis is not null then p_repayment_percent end;
 weekly_percent numeric := case when p_weekly_basis is not null then p_repayment_percent end;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501'; end if;
 if p_opening_balance<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_opening_balance) is not true
  or (p_monthly_basis is not null and p_weekly_basis is not null)
  or ((repayment_basis is null)<>(p_repayment_percent is null))
  or (repayment_basis is not null and seneve_private.hd_finance_amount_fits(p_currency,repayment_basis) is not true)
  or (p_repayment_percent is not null and (p_repayment_percent not between 0 and 100 or scale(p_repayment_percent)>2))
 then raise exception 'Dette ou repère de remboursement invalide' using errcode='22023'; end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023'; end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance-debt|'||enrollment::text,0));
 select * into d from seneve.hd_finance_debt_accounts where debt_id=p_request_id and enrollment_id=enrollment;
 if found then
  if d.opening_balance<>p_opening_balance or d.currency<>p_currency
   or d.monthly_basis is distinct from p_monthly_basis or d.repayment_percent is distinct from monthly_percent
   or d.weekly_basis is distinct from p_weekly_basis or d.weekly_repayment_percent is distinct from weekly_percent
  then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023'; end if;
 else
  select coalesce(max(debt_number),0)+1 into debt_number_next
  from seneve.hd_finance_debt_accounts where enrollment_id=enrollment;
  insert into seneve.hd_finance_debt_accounts(
   debt_id,enrollment_id,debt_number,opening_balance,currency,monthly_basis,repayment_percent,weekly_basis,weekly_repayment_percent
  ) values(
   p_request_id,enrollment,debt_number_next,p_opening_balance,p_currency,p_monthly_basis,monthly_percent,p_weekly_basis,weekly_percent
  ) on conflict(debt_id) do nothing returning * into d;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023'; end if;
 end if;

 return jsonb_build_object(
  'debt_id',d.debt_id,'debt_number',d.debt_number,'opening_balance',d.opening_balance::text,'currency',d.currency,
  'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,
  'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text
 );
end$$;

create or replace function seneve_private.hd_finance_debt_add(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_debt_add(p_enrollment_id,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent,p_request_id,null)
$$;

create function seneve.hd_finance_debt_add_with_guide(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid,p_weekly_basis numeric)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_debt_add(p_enrollment_id,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent,p_request_id,p_weekly_basis)
$$;

revoke all on function seneve_private.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid,numeric),
 seneve.hd_finance_debt_add_with_guide(uuid,numeric,text,numeric,numeric,uuid,numeric) from public,anon,authenticated,service_role;
grant execute on function seneve_private.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid,numeric),
 seneve.hd_finance_debt_add_with_guide(uuid,numeric,text,numeric,numeric,uuid,numeric) to authenticated;

create or replace function seneve_private.hd_finance_tracker_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare enrollment uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then
  if p_enrollment_id is null then return null;end if;
  raise exception 'Suivi financier non accessible' using errcode='42501';
 end if;
 return jsonb_build_object('enrollment_id',enrollment,
  'savings_goals',(select coalesce(jsonb_agg(jsonb_build_object('goal_id',g.goal_id,'goal_type',g.goal_type,'label',g.label,'target_amount',g.target_amount::text,'currency',g.currency,'created_at',g.created_at,'entries',(select coalesce(jsonb_agg(jsonb_build_object('entry_id',x.entry_id,'amount',x.amount::text,'date_locale',x.date_locale) order by x.date_locale,x.created_at),'[]'::jsonb) from seneve.hd_finance_savings_entries x where x.goal_id=g.goal_id)) order by g.created_at),'[]'::jsonb) from seneve.hd_finance_savings_goals g where g.enrollment_id=enrollment and g.archived_at is null),
  'debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text,'created_at',d.created_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment));
end$$;
