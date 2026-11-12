-- SÉNEVÉ Compte affiche le détail des dépenses (catégorie, note) dans l'historique et le bilan (demande du 12/11/2026) :
-- la lecture des dépenses renvoie aussi l'identifiant de la sortie de caisse liée.
create or replace function seneve_private.hd_finance_expenses_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare enrollment uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Suivi financier non accessible' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('expense_id',e.expense_id,'category',e.category,'amount',e.amount::text,'currency',e.currency,
   'date_locale',e.date_locale,'note',e.note,'liee',e.move_id is not null,'move_id',e.move_id,'created_at',e.created_at) order by e.date_locale desc,e.created_at desc),'[]'::jsonb)
  from seneve.hd_finance_expenses e where e.enrollment_id=enrollment and e.voided_at is null);
end$$;
