-- Un nom peut être ajouté aux dettes existantes. Les anciens clients gardent leur API.
alter table seneve.hd_finance_debt_accounts
 add column creditor_name text,
 add constraint hd_finance_debt_accounts_creditor_name_check check (
  creditor_name is null or (
   creditor_name=btrim(creditor_name) and char_length(creditor_name) between 1 and 80
   and creditor_name !~ '[[:cntrl:]]'
  )
 );

create function seneve_private.hd_finance_validate_creditor_name(p_creditor_name text)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare creditor text := btrim(p_creditor_name);
begin
 if creditor is null or char_length(creditor) not between 1 and 80 or creditor ~ '[[:cntrl:]]' then
  raise exception 'Nom du créancier invalide' using errcode='22023';
 end if;
 return creditor;
end$$;
revoke all on function seneve_private.hd_finance_validate_creditor_name(text) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_debt_add_named(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid,p_weekly_basis numeric,p_creditor_name text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 creditor text := seneve_private.hd_finance_validate_creditor_name(p_creditor_name);
 result jsonb;
 stored_creditor text;
begin
 -- Le créateur commun vérifie le compte, les montants et l'identifiant de saisie.
 result:=seneve_private.hd_finance_debt_add(
  p_enrollment_id,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent,p_request_id,p_weekly_basis
 );
 update seneve.hd_finance_debt_accounts
 set creditor_name=creditor
 where debt_id=p_request_id and enrollment_id=p_enrollment_id and creditor_name is null
 returning creditor_name into stored_creditor;
 if not found then
  select creditor_name into stored_creditor from seneve.hd_finance_debt_accounts
  where debt_id=p_request_id and enrollment_id=p_enrollment_id;
  if stored_creditor is distinct from creditor then
   raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';
  end if;
 end if;
 return result||jsonb_build_object('creditor_name',stored_creditor);
end$$;

create function seneve_private.hd_finance_debt_rename(p_enrollment_id uuid,p_debt_id uuid,p_creditor_name text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 enrollment uuid;
 creditor text;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501'; end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 creditor:=seneve_private.hd_finance_validate_creditor_name(p_creditor_name);
 update seneve.hd_finance_debt_accounts set creditor_name=creditor
 where debt_id=p_debt_id and enrollment_id=enrollment;
 if not found then raise exception 'Dette non accessible' using errcode='42501'; end if;
 return jsonb_build_object('debt_id',p_debt_id,'creditor_name',creditor);
end$$;

create function seneve.hd_finance_debt_add_named(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid,p_weekly_basis numeric,p_creditor_name text)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_debt_add_named(
  p_enrollment_id,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent,p_request_id,p_weekly_basis,p_creditor_name
 )
$$;

create function seneve.hd_finance_debt_rename(p_enrollment_id uuid,p_debt_id uuid,p_creditor_name text)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_debt_rename(p_enrollment_id,p_debt_id,p_creditor_name)
$$;

revoke all on function seneve_private.hd_finance_debt_add_named(uuid,numeric,text,numeric,numeric,uuid,numeric,text),
 seneve.hd_finance_debt_add_named(uuid,numeric,text,numeric,numeric,uuid,numeric,text),
 seneve_private.hd_finance_debt_rename(uuid,uuid,text),seneve.hd_finance_debt_rename(uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function seneve_private.hd_finance_debt_add_named(uuid,numeric,text,numeric,numeric,uuid,numeric,text),
 seneve.hd_finance_debt_add_named(uuid,numeric,text,numeric,numeric,uuid,numeric,text),
 seneve_private.hd_finance_debt_rename(uuid,uuid,text),seneve.hd_finance_debt_rename(uuid,uuid,text)
 to authenticated;

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
  'debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'creditor_name',d.creditor_name,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text,'created_at',d.created_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment));
end$$;
