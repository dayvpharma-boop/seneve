
-- Suivi des charges professionnelles, par période et devise.
create table if not exists seneve.hd_finance_business_charges(
 charge_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 label text not null check(char_length(btrim(label)) between 1 and 80),
 expected_amount numeric(12,2) not null check(expected_amount>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 period_start date not null,
 period_end date not null,
 created_at timestamptz not null default now(),
 archived_at timestamptz,
 check(period_end>=period_start)
);
create index if not exists hd_finance_business_charges_period_idx on seneve.hd_finance_business_charges(enrollment_id,currency,period_start,period_end) where archived_at is null;
create table if not exists seneve.hd_finance_business_charge_payments(
 payment_id uuid primary key,
 charge_id uuid not null references seneve.hd_finance_business_charges(charge_id) on delete cascade,
 amount numeric(12,2) not null check(amount>0),
 date_locale date not null,
 created_at timestamptz not null default now()
);
create index if not exists hd_finance_business_charge_payments_idx on seneve.hd_finance_business_charge_payments(charge_id,date_locale,created_at);
alter table seneve.hd_finance_business_charges enable row level security;
alter table seneve.hd_finance_business_charge_payments enable row level security;
revoke all on seneve.hd_finance_business_charges,seneve.hd_finance_business_charge_payments from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_business_charges_get(p_enrollment_id uuid,p_date date,p_currency text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare enrollment uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then
  if p_enrollment_id is null then return null;end if;
  raise exception 'Suivi financier non accessible' using errcode='42501';
 end if;
 if p_date is null or p_currency is null then raise exception 'Période invalide' using errcode='22023';end if;
 return jsonb_build_object('enrollment_id',enrollment,'date_locale',p_date,'currency',p_currency,
  'charges',(select coalesce(jsonb_agg(jsonb_build_object(
    'charge_id',c.charge_id,'label',c.label,'expected_amount',c.expected_amount::text,'currency',c.currency,
    'period_start',c.period_start,'period_end',c.period_end,
    'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb)
      from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id)
   ) order by c.created_at),'[]'::jsonb)
   from seneve.hd_finance_business_charges c
   where c.enrollment_id=enrollment and c.currency=p_currency and c.archived_at is null
     and c.period_start<=p_date and c.period_end>=p_date));
end$$;

create function seneve_private.hd_finance_business_charge_add(p_enrollment_id uuid,p_label text,p_expected_amount numeric,p_currency text,p_period_start date,p_period_end date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;c seneve.hd_finance_business_charges%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null or p_label is null or char_length(btrim(p_label)) not between 1 and 80
    or p_period_start is null or p_period_end is null or p_period_end<p_period_start
    or p_expected_amount is null or seneve_private.hd_finance_amount_fits(p_currency,p_expected_amount) is not true then
  raise exception 'Charge invalide' using errcode='22023';
 end if;
 insert into seneve.hd_finance_business_charges(charge_id,enrollment_id,label,expected_amount,currency,period_start,period_end)
 values(p_request_id,enrollment,btrim(p_label),p_expected_amount,p_currency,p_period_start,p_period_end)
 on conflict(charge_id) do nothing returning * into c;
 if not found then
  select * into c from seneve.hd_finance_business_charges where charge_id=p_request_id and enrollment_id=enrollment
   and label=btrim(p_label) and expected_amount=p_expected_amount and currency=p_currency
   and period_start=p_period_start and period_end=p_period_end;
  if not found then raise exception 'Identifiant déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('charge_id',c.charge_id,'label',c.label,'expected_amount',c.expected_amount::text,'currency',c.currency,'period_start',c.period_start,'period_end',c.period_end);
end$$;

create function seneve_private.hd_finance_business_charge_payment_add(p_enrollment_id uuid,p_charge_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;c seneve.hd_finance_business_charges%rowtype;p seneve.hd_finance_business_charge_payments%rowtype;paid numeric;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null or p_date_locale is null or p_amount is null then raise exception 'Paiement invalide' using errcode='22023';end if;
 select * into c from seneve.hd_finance_business_charges where charge_id=p_charge_id and enrollment_id=enrollment and archived_at is null for update;
 if not found then raise exception 'Charge non accessible' using errcode='42501';end if;
 if seneve_private.hd_finance_amount_fits(c.currency,p_amount) is not true then raise exception 'Montant incompatible avec la devise' using errcode='22023';end if;
 select * into p from seneve.hd_finance_business_charge_payments where payment_id=p_request_id;
 if found then
  if p.charge_id<>c.charge_id or p.amount<>p_amount or p.date_locale<>p_date_locale then raise exception 'Identifiant déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('payment_id',p.payment_id,'charge_id',p.charge_id,'amount',p.amount::text);
 end if;
 select coalesce(sum(amount),0) into paid from seneve.hd_finance_business_charge_payments where charge_id=c.charge_id;
 if paid+p_amount>c.expected_amount then raise exception 'Le paiement dépasse le montant prévu de la charge' using errcode='22023';end if;
 insert into seneve.hd_finance_business_charge_payments(payment_id,charge_id,amount,date_locale)
 values(p_request_id,c.charge_id,p_amount,p_date_locale) returning * into p;
 return jsonb_build_object('payment_id',p.payment_id,'charge_id',p.charge_id,'amount',p.amount::text,'paid_total',(paid+p_amount)::text,'remaining',(c.expected_amount-paid-p_amount)::text);
end$$;

-- Empêche aussi un enregistrement direct d’allocation tant qu’une charge active de cette période/devise reste impayée.
create function seneve_private.hd_finance_business_charge_allocation_guard()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(
  select 1 from seneve.hd_finance_business_charges c
  where c.enrollment_id=new.enrollment_id and c.currency=new.currency and c.archived_at is null
    and c.period_start<=new.date_locale and c.period_end>=new.date_locale
    and coalesce((select sum(p.amount) from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id),0)<c.expected_amount
 ) then raise exception 'Répartition verrouillée : règle d’abord les charges professionnelles' using errcode='23514';end if;
 return new;
end$$;
drop trigger if exists hd_finance_business_charge_allocation_guard on seneve.hd_finance_allocations;
create trigger hd_finance_business_charge_allocation_guard before insert on seneve.hd_finance_allocations
for each row execute function seneve_private.hd_finance_business_charge_allocation_guard();

create function seneve.hd_finance_business_charges_get(p_enrollment_id uuid,p_date date,p_currency text) returns jsonb language sql stable security invoker set search_path='' as $$select seneve_private.hd_finance_business_charges_get(p_enrollment_id,p_date,p_currency)$$;
create function seneve.hd_finance_business_charge_add(p_enrollment_id uuid,p_label text,p_expected_amount numeric,p_currency text,p_period_start date,p_period_end date,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_business_charge_add(p_enrollment_id,p_label,p_expected_amount,p_currency,p_period_start,p_period_end,p_request_id)$$;
create function seneve.hd_finance_business_charge_payment_add(p_enrollment_id uuid,p_charge_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_business_charge_payment_add(p_enrollment_id,p_charge_id,p_amount,p_date_locale,p_request_id)$$;
revoke all on function seneve_private.hd_finance_business_charges_get(uuid,date,text),seneve_private.hd_finance_business_charge_add(uuid,text,numeric,text,date,date,uuid),seneve_private.hd_finance_business_charge_payment_add(uuid,uuid,numeric,date,uuid),seneve_private.hd_finance_business_charge_allocation_guard() from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_business_charges_get(uuid,date,text),seneve.hd_finance_business_charge_add(uuid,text,numeric,text,date,date,uuid),seneve.hd_finance_business_charge_payment_add(uuid,uuid,numeric,date,uuid) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_business_charges_get(uuid,date,text),seneve_private.hd_finance_business_charge_add(uuid,text,numeric,text,date,date,uuid),seneve_private.hd_finance_business_charge_payment_add(uuid,uuid,numeric,date,uuid),seneve.hd_finance_business_charges_get(uuid,date,text),seneve.hd_finance_business_charge_add(uuid,text,numeric,text,date,date,uuid),seneve.hd_finance_business_charge_payment_add(uuid,uuid,numeric,date,uuid) to authenticated;
