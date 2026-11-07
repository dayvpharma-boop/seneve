-- Suivi privé Épargne et Dettes pour les participants ayant un accès actif à Habitudes & Défis.
create table seneve.hd_finance_savings_goals(
 goal_id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 goal_type text not null check(goal_type in('reserve_joie','epargne_investir','autre')),
 label text not null check(length(btrim(label)) between 1 and 60),
 target_amount numeric(12,2) not null check(target_amount>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 created_at timestamptz not null default now(),
 archived_at timestamptz
);
create index hd_finance_savings_goals_enrollment_idx on seneve.hd_finance_savings_goals(enrollment_id,created_at);
create table seneve.hd_finance_savings_entries(
 entry_id uuid primary key default gen_random_uuid(),
 goal_id uuid not null references seneve.hd_finance_savings_goals(goal_id) on delete cascade,
 amount numeric(12,2) not null check(amount>0),
 date_locale date not null,
 created_at timestamptz not null default now()
);
create index hd_finance_savings_entries_goal_idx on seneve.hd_finance_savings_entries(goal_id,date_locale,created_at);
create table seneve.hd_finance_debt_accounts(
 debt_id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 debt_number integer not null check(debt_number>0),
 opening_balance numeric(12,2) not null check(opening_balance>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 monthly_basis numeric(12,2) check(monthly_basis is null or monthly_basis>=0),
 repayment_percent numeric(5,2) check(repayment_percent is null or repayment_percent between 0 and 100),
 created_at timestamptz not null default now(),
 closed_at timestamptz,
 unique(enrollment_id,debt_number),
 check((monthly_basis is null)=(repayment_percent is null))
);
create table seneve.hd_finance_debt_payments(
 payment_id uuid primary key default gen_random_uuid(),
 debt_id uuid not null references seneve.hd_finance_debt_accounts(debt_id) on delete cascade,
 amount numeric(12,2) not null check(amount>0),
 date_locale date not null,
 created_at timestamptz not null default now()
);
create index hd_finance_debt_payments_debt_idx on seneve.hd_finance_debt_payments(debt_id,date_locale,created_at);
alter table seneve.hd_finance_savings_goals enable row level security;
alter table seneve.hd_finance_savings_entries enable row level security;
alter table seneve.hd_finance_debt_accounts enable row level security;
alter table seneve.hd_finance_debt_payments enable row level security;
revoke all on seneve.hd_finance_savings_goals,seneve.hd_finance_savings_entries,seneve.hd_finance_debt_accounts,seneve.hd_finance_debt_payments from public,anon,authenticated,service_role;

-- Centralise le contrôle des droits existants pour les quatre écritures et la lecture.
create function seneve_private.hd_finance_enrollment(p_enrollment_id uuid)
returns uuid language sql stable security invoker set search_path='' as $$
 select e.enrollment_id
 from seneve.enrollments e
 join seneve.hd_programme_links l using (programme_id,version,langue)
 where (select auth.uid()) is not null
   and e.participant_id=(select seneve.current_participant_id())
   and (p_enrollment_id is null or e.enrollment_id=p_enrollment_id)
   and l.module_id='HABITUDES_DEFIS' and l.actif
   and seneve.hd_has_current_right(e.enrollment_id)
 order by e.date_debut desc, e.cree_le desc, e.enrollment_id
 limit 1
$$;
revoke all on function seneve_private.hd_finance_enrollment(uuid) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_amount_fits(p_currency text,p_amount numeric)
returns boolean language sql immutable set search_path='' as $$
 select p_currency=any(string_to_array('AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JPY KES KGS KHR KMF KPW KRW KYD KZT LAK LBP LKR LRD LSL MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG',' '))
    and p_amount between 0 and 9999999999.99 and scale(p_amount)<=2
    and (p_currency<>all(string_to_array('AFN ALL BIF CLP COP DJF GNF HUF IDR IQD IRR ISK JPY KMF KPW KRW LAK LBP MGA MMK PKR PYG RSD RWF SOS SYP UGX VND VUV XAF XOF XPF YER',' ')) or trunc(p_amount)=p_amount)
$$;
revoke all on function seneve_private.hd_finance_amount_fits(text,numeric) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_tracker_get(p_enrollment_id uuid)
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
  'debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'created_at',d.created_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment));
end$$;

create function seneve_private.hd_finance_savings_goal_add(p_enrollment_id uuid,p_goal_type text,p_label text,p_target_amount numeric,p_currency text,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_goal_type is null or p_goal_type not in('reserve_joie','epargne_investir','autre') or p_label is null or length(btrim(p_label)) not between 1 and 60 or p_target_amount<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_target_amount) is not true then raise exception 'Objectif d’épargne invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 insert into seneve.hd_finance_savings_goals(goal_id,enrollment_id,goal_type,label,target_amount,currency)
 values(p_request_id,enrollment,p_goal_type,btrim(p_label),p_target_amount,p_currency)
 on conflict(goal_id) do nothing returning * into g;
 if not found then
  select * into g from seneve.hd_finance_savings_goals
   where goal_id=p_request_id and enrollment_id=enrollment and goal_type=p_goal_type
     and label=btrim(p_label) and target_amount=p_target_amount and currency=p_currency;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('goal_id',g.goal_id,'goal_type',g.goal_type,'label',g.label,'target_amount',g.target_amount::text,'currency',g.currency);
end$$;

create function seneve_private.hd_finance_savings_entry_add(p_enrollment_id uuid,p_goal_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;x seneve.hd_finance_savings_entries%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount>9999999999.99 or scale(p_amount)>2 or p_date_locale is null then raise exception 'Versement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into g from seneve.hd_finance_savings_goals where goal_id=p_goal_id and enrollment_id=enrollment and archived_at is null for share;
 if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
 if seneve_private.hd_finance_amount_fits(g.currency,p_amount) is not true then raise exception 'Montant incompatible avec la devise' using errcode='22023';end if;
 insert into seneve.hd_finance_savings_entries(entry_id,goal_id,amount,date_locale)
 values(p_request_id,g.goal_id,p_amount,p_date_locale)
 on conflict(entry_id) do nothing returning * into x;
 if not found then
  select * into x from seneve.hd_finance_savings_entries
   where entry_id=p_request_id and goal_id=g.goal_id and amount=p_amount and date_locale=p_date_locale;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('entry_id',x.entry_id,'goal_id',x.goal_id,'amount',x.amount::text,'date_locale',x.date_locale);
end$$;

create function seneve_private.hd_finance_debt_add(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;d seneve.hd_finance_debt_accounts%rowtype;n integer;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_opening_balance<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_opening_balance) is not true or ((p_monthly_basis is null)<>(p_repayment_percent is null)) or (p_monthly_basis is not null and (seneve_private.hd_finance_amount_fits(p_currency,p_monthly_basis) is not true)) or (p_repayment_percent is not null and (p_repayment_percent not between 0 and 100 or scale(p_repayment_percent)>2)) then raise exception 'Dette ou repère de remboursement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance-debt|'||enrollment::text,0));
 select * into d from seneve.hd_finance_debt_accounts where debt_id=p_request_id and enrollment_id=enrollment;
 if found then
  if d.opening_balance<>p_opening_balance or d.currency<>p_currency or d.monthly_basis is distinct from p_monthly_basis
    or d.repayment_percent is distinct from p_repayment_percent then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 else
  select coalesce(max(debt_number),0)+1 into n from seneve.hd_finance_debt_accounts where enrollment_id=enrollment;
  insert into seneve.hd_finance_debt_accounts(debt_id,enrollment_id,debt_number,opening_balance,currency,monthly_basis,repayment_percent)
  values(p_request_id,enrollment,n,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent)
  on conflict(debt_id) do nothing returning * into d;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text);
end$$;

create function seneve_private.hd_finance_debt_payment_add(p_enrollment_id uuid,p_debt_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;d seneve.hd_finance_debt_accounts%rowtype;p seneve.hd_finance_debt_payments%rowtype;reste numeric;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount>9999999999.99 or scale(p_amount)>2 or p_date_locale is null then raise exception 'Remboursement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into d from seneve.hd_finance_debt_accounts where debt_id=p_debt_id and enrollment_id=enrollment for update;
 if not found then raise exception 'Dette non accessible' using errcode='42501';end if;
 select d.opening_balance-coalesce(sum(x.amount),0) into reste from seneve.hd_finance_debt_payments x where x.debt_id=d.debt_id;
 if seneve_private.hd_finance_amount_fits(d.currency,p_amount) is not true then raise exception 'Montant incompatible avec la devise' using errcode='22023';end if;
 select * into p from seneve.hd_finance_debt_payments where payment_id=p_request_id and debt_id=d.debt_id;
 if found then
  if p.amount<>p_amount or p.date_locale<>p_date_locale then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 else
  if p_amount>reste then raise exception 'Le remboursement dépasse le solde restant' using errcode='22023';end if;
  insert into seneve.hd_finance_debt_payments(payment_id,debt_id,amount,date_locale)
  values(p_request_id,d.debt_id,p_amount,p_date_locale)
  on conflict(payment_id) do nothing returning * into p;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  reste:=reste-p.amount;
  if reste=0 then update seneve.hd_finance_debt_accounts set closed_at=now() where debt_id=d.debt_id;end if;
 end if;
 return jsonb_build_object('payment_id',p.payment_id,'debt_id',p.debt_id,'amount',p.amount::text,'date_locale',p.date_locale,'remaining',reste::text);
end$$;

create function seneve.hd_finance_tracker_get(p_enrollment_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select seneve_private.hd_finance_tracker_get(p_enrollment_id)$$;
create function seneve.hd_finance_savings_goal_add(p_enrollment_id uuid,p_goal_type text,p_label text,p_target_amount numeric,p_currency text,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_savings_goal_add(p_enrollment_id,p_goal_type,p_label,p_target_amount,p_currency,p_request_id)$$;
create function seneve.hd_finance_savings_entry_add(p_enrollment_id uuid,p_goal_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_savings_entry_add(p_enrollment_id,p_goal_id,p_amount,p_date_locale,p_request_id)$$;
create function seneve.hd_finance_debt_add(p_enrollment_id uuid,p_opening_balance numeric,p_currency text,p_monthly_basis numeric,p_repayment_percent numeric,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_debt_add(p_enrollment_id,p_opening_balance,p_currency,p_monthly_basis,p_repayment_percent,p_request_id)$$;
create function seneve.hd_finance_debt_payment_add(p_enrollment_id uuid,p_debt_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_debt_payment_add(p_enrollment_id,p_debt_id,p_amount,p_date_locale,p_request_id)$$;
revoke all on function seneve_private.hd_finance_tracker_get(uuid),seneve_private.hd_finance_savings_goal_add(uuid,text,text,numeric,text,uuid),seneve_private.hd_finance_savings_entry_add(uuid,uuid,numeric,date,uuid),seneve_private.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid),seneve_private.hd_finance_debt_payment_add(uuid,uuid,numeric,date,uuid) from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_tracker_get(uuid),seneve.hd_finance_savings_goal_add(uuid,text,text,numeric,text,uuid),seneve.hd_finance_savings_entry_add(uuid,uuid,numeric,date,uuid),seneve.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid),seneve.hd_finance_debt_payment_add(uuid,uuid,numeric,date,uuid) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_tracker_get(uuid),seneve_private.hd_finance_savings_goal_add(uuid,text,text,numeric,text,uuid),seneve_private.hd_finance_savings_entry_add(uuid,uuid,numeric,date,uuid),seneve_private.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid),seneve_private.hd_finance_debt_payment_add(uuid,uuid,numeric,date,uuid),seneve.hd_finance_tracker_get(uuid),seneve.hd_finance_savings_goal_add(uuid,text,text,numeric,text,uuid),seneve.hd_finance_savings_entry_add(uuid,uuid,numeric,date,uuid),seneve.hd_finance_debt_add(uuid,numeric,text,numeric,numeric,uuid),seneve.hd_finance_debt_payment_add(uuid,uuid,numeric,date,uuid) to authenticated;
