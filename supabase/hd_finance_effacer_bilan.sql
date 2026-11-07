-- Effacer le bilan (demande de Dr Justin du 07-08/11/2026). DÉFINITIF : les lignes sont supprimées.
-- p_quoi : 'donne' | 'depense' | 'investi' | 'autre' (sorties de ce motif : caisses et retraits d'objectifs),
--          'dettes' (remboursements des dettes ; chaque dette remonte d'autant),
--          'tout' (tout ce qui précède + entrées des caisses, versements des objectifs, répartitions).
-- Limité à une monnaie et, si p_depuis est donné, aux dates >= p_depuis. Les objectifs et les dettes eux-mêmes restent.
-- « Tout effacer » exige p_confirmation='EFFACER' (l'écran demande en plus l'e-mail et le mot de passe quand le compte en a un).
create function seneve_private.hd_finance_bilan_effacer(p_enrollment_id uuid,p_currency text,p_depuis date,p_quoi text,p_confirmation text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;n_sorties integer:=0;n_retraits integer:=0;n_paiements integer:=0;n_entrees integer:=0;n_versements integer:=0;n_repartitions integer:=0;depuis date:=coalesce(p_depuis,'0001-01-01'::date);
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_quoi is null or p_quoi not in('donne','depense','investi','autre','dettes','tout') or p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Effacement invalide' using errcode='22023';end if;
 if p_quoi='tout' and coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_quoi in('donne','depense','investi','autre','tout') then
  delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale>=depuis and direction='sortie' and (p_quoi='tout' or motif=p_quoi);
  get diagnostics n_sorties=row_count;
  delete from seneve.hd_finance_savings_withdrawals w using seneve.hd_finance_savings_goals g where w.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and w.date_locale>=depuis and (p_quoi='tout' or w.motif=p_quoi);
  get diagnostics n_retraits=row_count;
 end if;
 if p_quoi in('dettes','tout') then
  delete from seneve.hd_finance_debt_payments p using seneve.hd_finance_debt_accounts d where p.debt_id=d.debt_id and d.enrollment_id=enrollment and d.currency=p_currency and p.date_locale>=depuis;
  get diagnostics n_paiements=row_count;
  update seneve.hd_finance_debt_accounts d set closed_at=null where d.enrollment_id=enrollment and d.currency=p_currency and d.closed_at is not null
   and d.opening_balance>coalesce((select sum(p.amount) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id),0);
 end if;
 if p_quoi='tout' then
  delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale>=depuis and direction='entree';
  get diagnostics n_entrees=row_count;
  delete from seneve.hd_finance_savings_entries x using seneve.hd_finance_savings_goals g where x.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and x.date_locale>=depuis;
  get diagnostics n_versements=row_count;
  delete from seneve.hd_finance_allocations where enrollment_id=enrollment and currency=p_currency and date_locale>=depuis;
  get diagnostics n_repartitions=row_count;
 end if;
 -- Garde-fou : après un effacement partiel par période, un objectif ou une caisse ne peut pas devenir négatif.
 if exists(select 1 from seneve.hd_finance_savings_goals g where g.enrollment_id=enrollment and seneve_private.hd_finance_goal_balance(g.goal_id)<0)
   or exists(select 1 from (select envelope,currency from seneve.hd_finance_envelope_moves where enrollment_id=enrollment group by 1,2) e where seneve_private.hd_finance_envelope_balance(enrollment,e.envelope,e.currency)<0) then
  raise exception 'Cet effacement rendrait une caisse négative' using errcode='22023';
 end if;
 return jsonb_build_object('sorties',n_sorties,'retraits',n_retraits,'remboursements',n_paiements,'entrees',n_entrees,'versements',n_versements,'repartitions',n_repartitions);
end$$;
create function seneve.hd_finance_bilan_effacer(p_enrollment_id uuid,p_currency text,p_depuis date,p_quoi text,p_confirmation text) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_bilan_effacer(p_enrollment_id,p_currency,p_depuis,p_quoi,p_confirmation)$$;
revoke all on function seneve_private.hd_finance_bilan_effacer(uuid,text,date,text,text) from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_bilan_effacer(uuid,text,date,text,text) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_bilan_effacer(uuid,text,date,text,text),seneve.hd_finance_bilan_effacer(uuid,text,date,text,text) to authenticated;
