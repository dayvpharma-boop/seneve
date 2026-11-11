-- SÉNEVÉ Bénéfices (décision de Dr Justin du 11/11/2026, une seule activité par personne) : lecture seule.
-- Les ventes sont déjà notées dans SÉNEVÉ Répartition (Commerçant) : montant encaissé, coût des marchandises, autres frais,
-- et part qui a payé les charges du mois (covered_amount). Aucune double saisie.
-- Bénéfice = ventes − marchandises − autres frais − charges du mois payées (peut être négatif : c'est une perte).
-- Pour un salarié sans commerce : les montants répartis hors encaissements (revenus reçus) sont aussi renvoyés.

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
   from seneve.hd_finance_allocations a where a.enrollment_id=enrollment and a.business_receipt_amount is null));
end$$;
revoke all on function seneve_private.hd_finance_benefices_get(uuid) from public, anon;
grant execute on function seneve_private.hd_finance_benefices_get(uuid) to authenticated;

create or replace function seneve.hd_finance_benefices_get(p_enrollment_id uuid)
returns jsonb language sql stable set search_path to '' as $$select seneve_private.hd_finance_benefices_get(p_enrollment_id)$$;
revoke all on function seneve.hd_finance_benefices_get(uuid) from public, anon;
grant execute on function seneve.hd_finance_benefices_get(uuid) to authenticated;
