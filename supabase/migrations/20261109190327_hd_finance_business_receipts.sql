-- Les encaissements et les parts effectivement enregistrées forment le solde à répartir.
create table seneve.hd_finance_business_receipts (
 receipt_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 date_locale date not null,
 gross_amount numeric(12,2) not null check (gross_amount > 0),
 goods_cost numeric(12,2) not null check (goods_cost >= 0),
 other_cost numeric(12,2) not null check (other_cost >= 0),
 covered_amount numeric(12,2) not null check (covered_amount between 0 and greatest(0,gross_amount-goods_cost-other_cost)),
 created_at timestamptz not null default now()
);
alter table seneve.hd_finance_business_receipts enable row level security;
revoke all on table seneve.hd_finance_business_receipts from public,anon,authenticated,service_role;
create index hd_finance_business_receipts_balance_idx on seneve.hd_finance_business_receipts(enrollment_id,currency);
alter table seneve.hd_finance_allocations
 add column business_receipt_amount numeric check (business_receipt_amount > 0);
create index hd_finance_allocations_business_balance_idx on seneve.hd_finance_allocations(enrollment_id,currency)
 where business_receipt_amount is not null;

create function seneve_private.hd_finance_business_available(p_enrollment_id uuid,p_currency text)
returns numeric language sql stable security invoker set search_path='' as $$
 select coalesce((select sum(greatest(0,gross_amount-goods_cost-other_cost)-covered_amount)
  from seneve.hd_finance_business_receipts where enrollment_id=p_enrollment_id and currency=p_currency),0)
  - coalesce((select sum(business_receipt_amount) from seneve.hd_finance_allocations
   where enrollment_id=p_enrollment_id and currency=p_currency and business_receipt_amount is not null),0)
$$;
revoke all on function seneve_private.hd_finance_business_available(uuid,text) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_business_receipt_add(
 p_enrollment_id uuid,p_currency text,p_month_start date,p_gross numeric,p_goods numeric,p_costs numeric,p_request_id uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 enrollment uuid; b uuid; c record; r seneve.hd_finance_business_receipts%rowtype;
 jour date := (now() at time zone 'Africa/Kinshasa')::date;
 mois date := date_trunc('month',jour)::date;
 net numeric; restant numeric; verse numeric; deja_paye numeric; i integer := 0;
begin
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if auth.uid() is null or p_enrollment_id is null or enrollment is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 if p_request_id is null or p_gross is null or p_gross<=0 or p_goods is null or p_costs is null
  or seneve_private.hd_finance_amount_fits(p_currency,p_gross) is not true
  or seneve_private.hd_finance_amount_fits(p_currency,p_goods) is not true
  or seneve_private.hd_finance_amount_fits(p_currency,p_costs) is not true then
  raise exception 'Montants de vente invalides' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));
 select * into r from seneve.hd_finance_business_receipts where receipt_id=p_request_id;
 net:=greatest(0,p_gross-p_goods-p_costs);
 if found then
  if r.enrollment_id<>enrollment or r.currency<>p_currency or r.gross_amount<>p_gross
   or r.goods_cost<>p_goods or r.other_cost<>p_costs then
   raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';
  end if;
 else
  if p_month_start is distinct from mois then
   raise exception 'Actualise le bloc du mois' using errcode='22023';
  end if;
  select block_id into b from seneve.hd_finance_business_charge_blocks
  where enrollment_id=enrollment and month_start=mois for update;
  if b is null then raise exception 'Crée d’abord le bloc du mois' using errcode='23514';end if;
  restant:=net;
  for c in select charge_id,expected_amount from seneve.hd_finance_business_charges
   where block_id=b and enrollment_id=enrollment and currency=p_currency and archived_at is null
   order by (lower(label) ~ '(^|[^[:alnum:]])(loyer|rent)([^[:alnum:]]|$)') desc,created_at,charge_id
   for update
  loop
   exit when restant=0;
   select coalesce(sum(amount),0) into deja_paye from seneve.hd_finance_business_charge_payments where charge_id=c.charge_id;
   verse:=least(restant,greatest(0,c.expected_amount-deja_paye));
   if verse>0 then
    i:=i+1;
    insert into seneve.hd_finance_business_charge_payments(payment_id,charge_id,amount,date_locale)
    values(seneve_private.hd_finance_derived_id(p_request_id,i),c.charge_id,verse,jour);
    restant:=restant-verse;
   end if;
  end loop;
  insert into seneve.hd_finance_business_receipts(receipt_id,enrollment_id,currency,date_locale,gross_amount,goods_cost,other_cost,covered_amount)
  values(p_request_id,enrollment,p_currency,jour,p_gross,p_goods,p_costs,net-restant) returning * into r;
 end if;
 return jsonb_build_object('receipt_id',r.receipt_id,'covered',r.covered_amount::text,'remaining',(net-r.covered_amount)::text);
end
$$;

create function seneve_private.hd_finance_business_charge_archive(p_enrollment_id uuid,p_charge_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid; b uuid;
begin
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if auth.uid() is null or p_enrollment_id is null or enrollment is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 select block_id into b from seneve.hd_finance_business_charges where charge_id=p_charge_id and enrollment_id=enrollment;
 if not found then raise exception 'Charge non accessible' using errcode='42501';end if;
 perform 1 from seneve.hd_finance_business_charge_blocks where block_id=b and enrollment_id=enrollment for update;
 update seneve.hd_finance_business_charges set archived_at=now()
 where charge_id=p_charge_id and enrollment_id=enrollment and archived_at is null;
 return jsonb_build_object('charge_id',p_charge_id);
end
$$;

create function seneve_private.hd_finance_business_allocation_save(
 p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 enrollment uuid; b uuid; resultat jsonb; total numeric; a seneve.hd_finance_allocations%rowtype;
 jour date := (now() at time zone 'Africa/Kinshasa')::date;
begin
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if auth.uid() is null or p_enrollment_id is null or enrollment is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 if p_request_id is null or p_date_locale is null or p_date_locale>jour or
  seneve_private.hd_finance_amount_fits(p_currency,0) is not true or jsonb_typeof(p_parts) is distinct from 'array' then
  raise exception 'Répartition invalide' using errcode='22023';
 end if;
 if jsonb_array_length(p_parts) not between 1 and 30 then
  raise exception 'Répartition invalide' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));
 select * into a from seneve.hd_finance_allocations where allocation_id=p_request_id;
 if found then
  if a.enrollment_id<>enrollment or a.currency<>p_currency or a.date_locale<>p_date_locale
   or a.parts<>p_parts or a.business_receipt_amount is null then
   raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';
  end if;
  return jsonb_build_object('allocation_id',p_request_id,'deja',true);
 end if;
 select block_id into b from seneve.hd_finance_business_charge_blocks
 where enrollment_id=enrollment and month_start=date_trunc('month',jour)::date for update;
 if b is null or exists (
  select 1 from seneve.hd_finance_business_charges c where c.block_id=b and c.enrollment_id=enrollment and c.archived_at is null
  and c.expected_amount>coalesce((select sum(p.amount) from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id),0)
 ) then raise exception 'Charges du mois à compléter' using errcode='23514';end if;
 select sum((x->>'amount')::numeric) into total from jsonb_array_elements(p_parts) x;
 if total is null or total<=0 or total>seneve_private.hd_finance_business_available(enrollment,p_currency) then
  raise exception 'Solde à répartir insuffisant' using errcode='23514';
 end if;
 resultat:=seneve_private.hd_finance_allocation_save(enrollment,p_currency,p_date_locale,p_parts,p_request_id);
 update seneve.hd_finance_allocations set business_receipt_amount=total where allocation_id=p_request_id;
 return resultat;
end
$$;

create function seneve.hd_finance_business_receipt_add(
 p_enrollment_id uuid,p_currency text,p_month_start date,p_gross numeric,p_goods numeric,p_costs numeric,p_request_id uuid
) returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_business_receipt_add(p_enrollment_id,p_currency,p_month_start,p_gross,p_goods,p_costs,p_request_id)
$$;
create function seneve.hd_finance_business_charge_archive(p_enrollment_id uuid,p_charge_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_business_charge_archive(p_enrollment_id,p_charge_id)
$$;
create function seneve.hd_finance_business_allocation_save(
 p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid
) returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_business_allocation_save(p_enrollment_id,p_currency,p_date_locale,p_parts,p_request_id)
$$;

revoke all on function
 seneve_private.hd_finance_business_receipt_add(uuid,text,date,numeric,numeric,numeric,uuid),
 seneve_private.hd_finance_business_charge_archive(uuid,uuid),
 seneve_private.hd_finance_business_allocation_save(uuid,text,date,jsonb,uuid),
 seneve.hd_finance_business_receipt_add(uuid,text,date,numeric,numeric,numeric,uuid),
 seneve.hd_finance_business_charge_archive(uuid,uuid),
 seneve.hd_finance_business_allocation_save(uuid,text,date,jsonb,uuid)
 from public,anon,authenticated,service_role;
grant execute on function
 seneve_private.hd_finance_business_receipt_add(uuid,text,date,numeric,numeric,numeric,uuid),
 seneve_private.hd_finance_business_charge_archive(uuid,uuid),
 seneve_private.hd_finance_business_allocation_save(uuid,text,date,jsonb,uuid),
 seneve.hd_finance_business_receipt_add(uuid,text,date,numeric,numeric,numeric,uuid),
 seneve.hd_finance_business_charge_archive(uuid,uuid),
 seneve.hd_finance_business_allocation_save(uuid,text,date,jsonb,uuid)
 to authenticated;

create or replace function seneve_private.hd_finance_business_charges_get(p_enrollment_id uuid,p_date date,p_currency text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare enrollment uuid;mois date;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then
  if p_enrollment_id is null then return null;end if;
  raise exception 'Suivi financier non accessible' using errcode='42501';
 end if;
 if p_date is null or p_currency is null then raise exception 'Période invalide' using errcode='22023';end if;
 mois:=date_trunc('month',p_date)::date;
 return jsonb_build_object(
  'enrollment_id',enrollment,'date_locale',p_date,'currency',p_currency,
  'available_amount',seneve_private.hd_finance_business_available(enrollment,p_currency)::text,
  'active_block',(select jsonb_build_object('block_id',b.block_id,'month_start',b.month_start)
    from seneve.hd_finance_business_charge_blocks b where b.enrollment_id=enrollment and b.month_start=mois),
  'charges',(select coalesce(jsonb_agg(jsonb_build_object(
    'charge_id',c.charge_id,'label',c.label,'expected_amount',c.expected_amount::text,'currency',c.currency,
    'period_start',c.period_start,'period_end',c.period_end,
    'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb)
      from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id)
   ) order by c.currency,c.created_at),'[]'::jsonb)
   from seneve.hd_finance_business_charges c join seneve.hd_finance_business_charge_blocks b on b.block_id=c.block_id
   where c.enrollment_id=enrollment and c.archived_at is null and b.month_start=mois),
  'archives',(select coalesce(jsonb_agg(jsonb_build_object(
    'block_id',b.block_id,'month_start',b.month_start,
    'charges',(select coalesce(jsonb_agg(jsonb_build_object(
      'charge_id',c.charge_id,'label',c.label,'expected_amount',c.expected_amount::text,'currency',c.currency,
      'period_start',c.period_start,'period_end',c.period_end,
      'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale) order by p.date_locale,p.created_at),'[]'::jsonb)
       from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id)
    ) order by c.currency,c.created_at),'[]'::jsonb) from seneve.hd_finance_business_charges c
      where c.block_id=b.block_id and c.archived_at is null)
   ) order by b.month_start desc),'[]'::jsonb)
   from seneve.hd_finance_business_charge_blocks b where b.enrollment_id=enrollment and b.month_start<mois)
 );
end$$;
