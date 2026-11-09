-- L’annulation retire une entrée de la caisse sans effacer sa trace.
alter table seneve.hd_finance_business_receipts add column voided_at timestamptz;
alter table seneve.hd_finance_business_receipts alter column created_at set default clock_timestamp();
alter table seneve.hd_finance_allocations alter column created_at set default clock_timestamp();

create function seneve_private.hd_finance_business_receipt_removal_block(
 p_covered numeric,p_net numeric,p_created_at timestamptz,p_last_allocation timestamptz
) returns text language sql immutable set search_path='' as $$
 select case
  when p_covered>0 then 'charges'
  when p_net>0 and p_last_allocation>=p_created_at then 'allocation'
  else null
 end
$$;
revoke all on function seneve_private.hd_finance_business_receipt_removal_block(numeric,numeric,timestamptz,timestamptz)
 from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_business_balance_history(
 p_currency text,p_before_at timestamptz,p_before_kind integer,p_before_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e uuid;
begin
 e:=seneve_private.hd_finance_enrollment(null);
 if auth.uid() is null or e is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 if seneve_private.hd_finance_amount_fits(p_currency,0) is not true or
  (p_before_at is not null and (p_before_kind is null or p_before_kind not in (0,1) or p_before_id is null)) then
  raise exception 'Historique invalide' using errcode='22023';
 end if;
 return (
  with allocations as (
   select allocation_id,date_locale,created_at,business_receipt_amount
   from seneve.hd_finance_allocations
   where enrollment_id=e and currency=p_currency and business_receipt_amount is not null
  ), derniere as (select max(created_at) as date from allocations),
  mouvements as (
   select r.receipt_id as id,0 as kind,r.date_locale,r.created_at,r.gross_amount as montant,
    n.net as variation,seneve_private.hd_finance_business_receipt_removal_block(r.covered_amount,n.net,r.created_at,d.date) as retrait
   from seneve.hd_finance_business_receipts r
   cross join lateral (select greatest(0,r.gross_amount-r.goods_cost-r.other_cost)-r.covered_amount as net) n
   cross join derniere d
   where r.enrollment_id=e and r.currency=p_currency and r.voided_at is null
   union all
   select allocation_id,1,date_locale,created_at,business_receipt_amount,-business_receipt_amount,null::text
   from allocations
  ), chronologie as (
   select *,sum(variation) over(order by created_at,kind,id rows unbounded preceding) as solde
   from mouvements
  ), page as (
   select * from chronologie
   where p_before_at is null or (created_at,kind,id)<(p_before_at,p_before_kind,p_before_id)
   order by created_at desc,kind desc,id desc limit 31
  )
  select jsonb_build_object(
   'has_more',(select count(*)>30 from page),
   'items',coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',id,'kind',kind,'date_locale',date_locale,'created_at',created_at,'amount',montant::text,
     'balance',solde::text,'net',case when kind=0 then variation::text end,'removal_block',retrait
    ) order by created_at desc,kind desc,id desc)
    from (select * from page order by created_at desc,kind desc,id desc limit 30) lignes
   ),'[]'::jsonb)
  )
 );
end
$$;

create function seneve_private.hd_finance_business_receipt_void(p_currency text,p_receipt_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid; r seneve.hd_finance_business_receipts%rowtype; derniere timestamptz;
begin
 e:=seneve_private.hd_finance_enrollment(null);
 if auth.uid() is null or e is null then
  raise exception 'Inscription financière non accessible' using errcode='42501';
 end if;
 if p_receipt_id is null or seneve_private.hd_finance_amount_fits(p_currency,0) is not true then
  raise exception 'Encaissement invalide' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||e::text||'/'||p_currency,0));
 select * into r from seneve.hd_finance_business_receipts
 where receipt_id=p_receipt_id and enrollment_id=e and currency=p_currency for update;
 if not found then raise exception 'Encaissement non accessible' using errcode='42501';end if;
 if r.voided_at is null then
  select max(created_at) into derniere from seneve.hd_finance_allocations
  where enrollment_id=e and currency=p_currency and business_receipt_amount is not null;
  if seneve_private.hd_finance_business_receipt_removal_block(
   r.covered_amount,greatest(0,r.gross_amount-r.goods_cost-r.other_cost)-r.covered_amount,r.created_at,derniere
  ) is not null then
   raise exception 'Cet encaissement a déjà servi aux charges ou à une répartition' using errcode='23514';
  end if;
  update seneve.hd_finance_business_receipts set voided_at=clock_timestamp() where receipt_id=r.receipt_id;
 end if;
 return jsonb_build_object('receipt_id',r.receipt_id,
  'available_amount',seneve_private.hd_finance_business_available(e,p_currency)::text,
  'tithe_due',seneve_private.hd_finance_business_tithe_due(e,p_currency)::text);
end
$$;

create function seneve.hd_finance_business_balance_history(
 p_currency text,p_before_at timestamptz default null,p_before_kind integer default null,p_before_id uuid default null
) returns jsonb language sql stable security invoker set search_path='' as $$
 select seneve_private.hd_finance_business_balance_history(p_currency,p_before_at,p_before_kind,p_before_id)
$$;
create function seneve.hd_finance_business_receipt_void(p_currency text,p_receipt_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select seneve_private.hd_finance_business_receipt_void(p_currency,p_receipt_id)
$$;

revoke all on function
 seneve_private.hd_finance_business_balance_history(text,timestamptz,integer,uuid),
 seneve_private.hd_finance_business_receipt_void(text,uuid),
 seneve.hd_finance_business_balance_history(text,timestamptz,integer,uuid),
 seneve.hd_finance_business_receipt_void(text,uuid)
 from public,anon,authenticated,service_role;
grant execute on function
 seneve_private.hd_finance_business_balance_history(text,timestamptz,integer,uuid),
 seneve_private.hd_finance_business_receipt_void(text,uuid),
 seneve.hd_finance_business_balance_history(text,timestamptz,integer,uuid),
 seneve.hd_finance_business_receipt_void(text,uuid)
 to authenticated;

create or replace function seneve_private.hd_finance_business_available(p_enrollment_id uuid,p_currency text)
returns numeric language sql stable security invoker set search_path='' as $$
 select coalesce((select sum(greatest(0,gross_amount-goods_cost-other_cost)-covered_amount)
  from seneve.hd_finance_business_receipts where enrollment_id=p_enrollment_id and currency=p_currency and voided_at is null),0)
  - coalesce((select sum(business_receipt_amount) from seneve.hd_finance_allocations
   where enrollment_id=p_enrollment_id and currency=p_currency and business_receipt_amount is not null),0)
$$;

create or replace function seneve_private.hd_finance_business_tithe_due(p_enrollment_id uuid,p_currency text)
returns numeric language sql stable security invoker set search_path='' as $$
 select greatest(0,
  round(0.10 * coalesce((
   select sum(greatest(0,gross_amount-goods_cost-other_cost)-covered_amount)
   from seneve.hd_finance_business_receipts
   where enrollment_id=p_enrollment_id and currency=p_currency and voided_at is null
  ),0),case when seneve_private.hd_finance_amount_fits(p_currency,0.01) then 2 else 0 end)
  - coalesce((
   select sum((p->>'amount')::numeric)
   from seneve.hd_finance_allocations a
   cross join lateral jsonb_array_elements(a.parts) p
   where a.enrollment_id=p_enrollment_id and a.currency=p_currency
    and a.business_receipt_amount is not null and p->>'part'='dime'
  ),0)
 )
$$;

create or replace function seneve_private.hd_finance_business_receipt_add(
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
  if r.voided_at is not null then
   raise exception 'Cet encaissement a été supprimé' using errcode='23514';
  end if;
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

