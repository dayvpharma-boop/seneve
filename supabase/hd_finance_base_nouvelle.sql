-- Base nouvelle des répartitions d'activité (demande de Dr Justin du 10/11/2026).
-- Les pourcentages (offrande, réserve, investir, autre, dettes) ne s'appliquent qu'à l'argent NOUVEAU :
-- les encaissements nets qui n'ont encore servi de base à aucune répartition. L'argent revenu au solde
-- (excédent laissé, part décochée) est « déjà réparti » : il ne repasse plus par les pourcentages.
-- La dîme garde sa règle propre (hd_finance_business_tithe_due).
-- Retour : hd_finance_base_nouvelle_retour.sql

alter table seneve.hd_finance_allocations
 add column if not exists business_fresh_amount numeric check (business_fresh_amount is null or business_fresh_amount>=0);

-- Répartitions déjà enregistrées : l'argent encaissé AVANT la dernière répartition a déjà eu ses pourcentages
-- (ce qui en reste est revenu au solde) ; ce qui a été encaissé après reste de l'argent nouveau.
with groupes as (
 select g.*,
  (select coalesce(sum(greatest(0,r.gross_amount-r.goods_cost-r.other_cost)-r.covered_amount),0)
   from seneve.hd_finance_business_receipts r
   where r.enrollment_id=g.enrollment_id and r.currency=g.currency and r.voided_at is null and r.created_at<=g.date_derniere) as net
 from (
  select a.enrollment_id,a.currency,sum(a.business_receipt_amount) as reparti,max(a.created_at) as date_derniere,
   (array_agg(a.allocation_id order by a.created_at desc,a.allocation_id desc))[1] as derniere
  from seneve.hd_finance_allocations a
  where a.business_receipt_amount is not null and a.business_fresh_amount is null
  group by a.enrollment_id,a.currency
 ) g
)
update seneve.hd_finance_allocations a
set business_fresh_amount=a.business_receipt_amount
 +case when a.allocation_id=g.derniere then greatest(0,g.net-g.reparti) else 0 end
from groupes g
where a.enrollment_id=g.enrollment_id and a.currency=g.currency
 and a.business_receipt_amount is not null and a.business_fresh_amount is null;

-- Argent nouveau du solde : encaissements nets pas encore utilisés comme base, borné par le solde disponible.
create or replace function seneve_private.hd_finance_business_fresh(p_enrollment_id uuid, p_currency text)
returns numeric language sql stable set search_path to '' as $$
 select least(
  seneve_private.hd_finance_business_available(p_enrollment_id,p_currency),
  greatest(0,
   coalesce((select sum(greatest(0,gross_amount-goods_cost-other_cost)-covered_amount)
    from seneve.hd_finance_business_receipts where enrollment_id=p_enrollment_id and currency=p_currency and voided_at is null),0)
   - coalesce((select sum(business_fresh_amount) from seneve.hd_finance_allocations
    where enrollment_id=p_enrollment_id and currency=p_currency and business_receipt_amount is not null),0)))
$$;
revoke all on function seneve_private.hd_finance_business_fresh(uuid,text) from public,anon,authenticated,service_role;

-- Enregistrer une répartition consomme toute la base nouvelle du moment.
create or replace function seneve_private.hd_finance_business_allocation_save(p_enrollment_id uuid, p_currency text, p_date_locale date, p_parts jsonb, p_request_id uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
 enrollment uuid; b uuid; resultat jsonb; total numeric; dime numeric; nouveau numeric; a seneve.hd_finance_allocations%rowtype;
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
 if b is null or not exists (
  select 1 from seneve.hd_finance_business_charges c
  where c.block_id=b and c.enrollment_id=enrollment and c.archived_at is null
 ) then raise exception 'Ajoute au moins une charge au bloc du mois' using errcode='23514';end if;
 if exists (
  select 1 from seneve.hd_finance_business_charges c where c.block_id=b and c.enrollment_id=enrollment and c.archived_at is null
  and c.expected_amount>coalesce((select sum(p.amount) from seneve.hd_finance_business_charge_payments p where p.charge_id=c.charge_id),0)
 ) then raise exception 'Charges du mois à compléter' using errcode='23514';end if;
 select sum((x->>'amount')::numeric),
  coalesce(sum((x->>'amount')::numeric) filter (where x->>'part'='dime'),0)
 into total,dime from jsonb_array_elements(p_parts) x;
 if total is null or total<=0 or total>seneve_private.hd_finance_business_available(enrollment,p_currency) then
  raise exception 'Solde à répartir insuffisant' using errcode='23514';
 end if;
 if dime>seneve_private.hd_finance_business_tithe_due(enrollment,p_currency) then
  raise exception 'La dîme dépasse le montant restant à enregistrer' using errcode='23514';
 end if;
 nouveau:=seneve_private.hd_finance_business_fresh(enrollment,p_currency);
 resultat:=seneve_private.hd_finance_allocation_save(enrollment,p_currency,p_date_locale,p_parts,p_request_id);
 update seneve.hd_finance_allocations set business_receipt_amount=total,business_fresh_amount=nouveau where allocation_id=p_request_id;
 return resultat;
end
$function$;

-- Le suivi renvoie aussi la base nouvelle (fresh_amount) ; les anciens clients l'ignorent.
create or replace function seneve_private.hd_finance_business_charges_get(p_enrollment_id uuid, p_date date, p_currency text)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
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
  'fresh_amount',seneve_private.hd_finance_business_fresh(enrollment,p_currency)::text,
  'tithe_due',seneve_private.hd_finance_business_tithe_due(enrollment,p_currency)::text,
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
end$function$;

create or replace function seneve_private.hd_finance_business_receipt_void(p_currency text, p_receipt_id uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
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
  'fresh_amount',seneve_private.hd_finance_business_fresh(e,p_currency)::text,
  'tithe_due',seneve_private.hd_finance_business_tithe_due(e,p_currency)::text);
end
$function$;
