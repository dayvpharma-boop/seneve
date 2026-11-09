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
