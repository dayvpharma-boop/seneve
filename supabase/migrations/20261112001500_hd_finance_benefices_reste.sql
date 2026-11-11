-- Bilan de SÉNEVÉ Compte (décision de Dr Justin du 12/11/2026) : afficher « Encaissé » (montant exact reçu, sans rien enlever)
-- et « Pas encore réparti ». La lecture des bénéfices renvoie en plus le solde à répartir actuel de chaque monnaie.
create or replace function seneve_private.hd_finance_benefices_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare enrollment uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Suivi financier non accessible' using errcode='42501';end if;
 return jsonb_build_object(
  'ventes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.receipt_id,'currency',r.currency,'date_locale',r.date_locale,'gross',r.gross_amount::text,
     'goods',r.goods_cost::text,'other',r.other_cost::text,'charges',r.covered_amount::text) order by r.date_locale,r.created_at),'[]'::jsonb)
   from seneve.hd_finance_business_receipts r where r.enrollment_id=enrollment and r.voided_at is null),
  'revenus',(select coalesce(jsonb_agg(jsonb_build_object('id',a.allocation_id,'currency',a.currency,'date_locale',a.date_locale,
     'amount',(select coalesce(sum((p->>'amount')::numeric),0) from jsonb_array_elements(a.parts) p)::text) order by a.date_locale,a.created_at),'[]'::jsonb)
   from seneve.hd_finance_allocations a where a.enrollment_id=enrollment and a.business_receipt_amount is null),
  'reste_a_repartir',(select coalesce(jsonb_object_agg(d.currency,greatest(0,seneve_private.hd_finance_business_available(enrollment,d.currency))::text),'{}'::jsonb)
   from (select distinct currency from seneve.hd_finance_business_receipts where enrollment_id=enrollment and voided_at is null) d));
end$$;
