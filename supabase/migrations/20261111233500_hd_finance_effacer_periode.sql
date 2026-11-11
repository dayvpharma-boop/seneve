-- « Effacer tout » limité à une période (décision de Dr Justin du 11/11/2026, 23 h 12) :
-- on choisit « cette semaine » ou « ce mois-ci » ; seules les données datées de cette période sont effacées,
-- les semaines et mois passés restent intacts. Remplace, côté écran, la remise à zéro « depuis le début ».
--
-- Effacé (date >= début de la période, même monnaie) : sorties et entrées des caisses, versements et retraits des objectifs,
-- remboursements de dettes, répartitions, encaissements, paiements de charges, dépenses de SÉNEVÉ Dépenses.
-- Gardé : objectifs, dettes, charges (noms et montants prévus). Une dette qui n'est plus soldée est rouverte.
-- Le « Solde à répartir » et la dîme due se recalculent seuls (encaissements − répartitions).

create or replace function seneve_private.hd_finance_periode_effacer(p_enrollment_id uuid,p_currency text,p_depuis date,p_confirmation text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;n_sorties int:=0;n_entrees int:=0;n_versements int:=0;n_retraits int:=0;n_paiements int:=0;n_repartitions int:=0;n_encaissements int:=0;n_charges int:=0;n_depenses int:=0;n_rouvertes int:=0;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Effacement invalide' using errcode='22023';end if;
 if coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 -- Seulement le début de la semaine en cours (lundi) ou du mois en cours : jamais une période plus ancienne.
 -- Un jour de marge de chaque côté : la date du serveur (UTC) peut différer de celle du participant.
 if p_depuis is null or not exists(select 1 from generate_series(current_date-1,current_date+1,interval '1 day') j(d)
   where p_depuis in (date_trunc('week',j.d)::date,date_trunc('month',j.d)::date)) then raise exception 'Période invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));

 delete from seneve.hd_finance_expenses where enrollment_id=enrollment and currency=p_currency and date_locale>=p_depuis;
 get diagnostics n_depenses=row_count;
 delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale>=p_depuis and direction='sortie';
 get diagnostics n_sorties=row_count;
 delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale>=p_depuis;
 get diagnostics n_entrees=row_count;
 delete from seneve.hd_finance_savings_withdrawals w using seneve.hd_finance_savings_goals g where w.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and w.date_locale>=p_depuis;
 get diagnostics n_retraits=row_count;
 delete from seneve.hd_finance_savings_entries x using seneve.hd_finance_savings_goals g where x.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and x.date_locale>=p_depuis;
 get diagnostics n_versements=row_count;
 delete from seneve.hd_finance_debt_payments p using seneve.hd_finance_debt_accounts d where p.debt_id=d.debt_id and d.enrollment_id=enrollment and d.currency=p_currency and p.date_locale>=p_depuis;
 get diagnostics n_paiements=row_count;
 update seneve.hd_finance_debt_accounts d set closed_at=null
  where d.enrollment_id=enrollment and d.currency=p_currency and d.closed_at is not null
   and coalesce((select sum(p.amount) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id),0)<d.opening_balance;
 get diagnostics n_rouvertes=row_count;
 delete from seneve.hd_finance_allocations where enrollment_id=enrollment and currency=p_currency and date_locale>=p_depuis;
 get diagnostics n_repartitions=row_count;
 delete from seneve.hd_finance_business_charge_payments p using seneve.hd_finance_business_charges c
  where p.charge_id=c.charge_id and c.enrollment_id=enrollment and c.currency=p_currency and p.date_locale>=p_depuis;
 get diagnostics n_charges=row_count;
 delete from seneve.hd_finance_business_receipts where enrollment_id=enrollment and currency=p_currency and date_locale>=p_depuis;
 get diagnostics n_encaissements=row_count;
 delete from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment
  and not exists(select 1 from seneve.hd_finance_envelope_moves m where m.move_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_withdrawals w where w.withdrawal_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_debt_payments p where p.payment_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_entries e where e.entry_id=x.ligne_id);
 return jsonb_build_object('depuis',p_depuis,'sorties',n_sorties,'entrees',n_entrees,'versements',n_versements,'retraits',n_retraits,'remboursements',n_paiements,
  'dettes_rouvertes',n_rouvertes,'repartitions',n_repartitions,'encaissements',n_encaissements,'paiements_charges',n_charges,'depenses',n_depenses,'masque',false);
end$$;
revoke all on function seneve_private.hd_finance_periode_effacer(uuid,text,date,text) from public, anon;
grant execute on function seneve_private.hd_finance_periode_effacer(uuid,text,date,text) to authenticated;

-- Porte d'entrée : « tout » + une date de début + EFFACER = effacement réel de la période.
-- Les autres cas (une ligne du bilan, ou l'ancienne remise à zéro complète) ne changent pas.
create or replace function seneve.hd_finance_bilan_effacer(p_enrollment_id uuid, p_currency text, p_depuis date, p_quoi text, p_confirmation text)
returns jsonb language plpgsql set search_path to '' as $$
declare r jsonb;
begin
 if p_quoi='tout' and p_depuis is not null and coalesce(p_confirmation,'')='EFFACER' then
  return seneve_private.hd_finance_periode_effacer(p_enrollment_id,p_currency,p_depuis,p_confirmation);
 end if;
 r:=seneve_private.hd_finance_bilan_effacer(p_enrollment_id,p_currency,p_depuis,p_quoi,p_confirmation);
 if p_quoi='tout' and p_depuis is null then
  r:=r||jsonb_build_object('depenses',seneve_private.hd_finance_expenses_reset(p_enrollment_id,p_currency,p_confirmation));
 end if;
 return r;
end$$;
