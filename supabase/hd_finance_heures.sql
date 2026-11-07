-- Heure d'enregistrement dans les historiques (demande de Dr Justin du 07/11/2026).
-- Ajoute seulement le champ created_at aux réponses ; aucune table ni donnée n'est modifiée.
-- Retour arrière : réappliquer les définitions précédentes (hd_finance_debt_names.sql et hd_finance_compteurs.sql).
create or replace function seneve_private.hd_finance_tracker_get(p_enrollment_id uuid)
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
  'savings_goals',(select coalesce(jsonb_agg(jsonb_build_object('goal_id',g.goal_id,'goal_type',g.goal_type,'label',g.label,'target_amount',g.target_amount::text,'currency',g.currency,'created_at',g.created_at,'entries',(select coalesce(jsonb_agg(jsonb_build_object('entry_id',x.entry_id,'amount',x.amount::text,'date_locale',x.date_locale,'created_at',x.created_at) order by x.date_locale,x.created_at),'[]'::jsonb) from seneve.hd_finance_savings_entries x where x.goal_id=g.goal_id)) order by g.created_at),'[]'::jsonb) from seneve.hd_finance_savings_goals g where g.enrollment_id=enrollment and g.archived_at is null),
  'debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'creditor_name',d.creditor_name,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text,'created_at',d.created_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale,'created_at',p.created_at) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment));
end$$;

create or replace function seneve_private.hd_finance_counters_get(p_enrollment_id uuid)
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
  'moves',(select coalesce(jsonb_agg(jsonb_build_object('move_id',m.move_id,'envelope',m.envelope,'direction',m.direction,'motif',m.motif,'amount',m.amount::text,'currency',m.currency,'date_locale',m.date_locale,'remise_a_zero',m.remise_a_zero,'allocation_id',m.allocation_id,'created_at',m.created_at) order by m.date_locale,m.created_at),'[]'::jsonb) from seneve.hd_finance_envelope_moves m where m.enrollment_id=enrollment),
  'withdrawals',(select coalesce(jsonb_agg(jsonb_build_object('withdrawal_id',w.withdrawal_id,'goal_id',w.goal_id,'motif',w.motif,'amount',w.amount::text,'date_locale',w.date_locale,'remise_a_zero',w.remise_a_zero,'created_at',w.created_at) order by w.date_locale,w.created_at),'[]'::jsonb) from seneve.hd_finance_savings_withdrawals w join seneve.hd_finance_savings_goals g using(goal_id) where g.enrollment_id=enrollment));
end$$;
