create or replace function seneve_private.hd_finance_business_allocation_save(
 p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid
) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 enrollment uuid; b uuid; resultat jsonb; total numeric; dime numeric; a seneve.hd_finance_allocations%rowtype;
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
 resultat:=seneve_private.hd_finance_allocation_save(enrollment,p_currency,p_date_locale,p_parts,p_request_id);
 update seneve.hd_finance_allocations set business_receipt_amount=total where allocation_id=p_request_id;
 return resultat;
end
$$;

