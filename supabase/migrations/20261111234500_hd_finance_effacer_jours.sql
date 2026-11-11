-- « Effacer des jours » (décision de Dr Justin du 11/11/2026, 23 h 23) : à la place de « tout effacer depuis le début »
-- ou de « cette semaine / ce mois-ci », la personne choisit dans un calendrier un jour, ou une suite de jours
-- (2 jours, 5 jours, un mois, une année…). Seules les données datées de ces jours sont effacées.
--
-- Effacé (date entre p_du et p_au inclus, même monnaie) : entrées et sorties des caisses, versements et retraits des objectifs,
-- remboursements de dettes, répartitions, encaissements, paiements de charges, dépenses de SÉNEVÉ Dépenses.
-- Gardé : objectifs, dettes, charges (noms et montants prévus), et tout ce qui est hors des jours choisis.
-- Sécurité : si, après effacement, une caisse ou un objectif passait sous zéro à une date plus récente (argent déjà utilisé
-- plus tard), ou si le « Solde à répartir » devenait négatif, RIEN n'est effacé (erreur « Effacement impossible »).
-- Remplace seneve_private.hd_finance_periode_effacer (semaine / mois), supprimée.

create or replace function seneve_private.hd_finance_jours_effacer(p_enrollment_id uuid,p_currency text,p_du date,p_au date,p_confirmation text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;n_sorties int:=0;n_entrees int:=0;n_versements int:=0;n_retraits int:=0;n_paiements int:=0;n_repartitions int:=0;n_encaissements int:=0;n_charges int:=0;n_depenses int:=0;n_rouvertes int:=0;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Effacement invalide' using errcode='22023';end if;
 if coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 if p_du is null or p_au is null or p_du>p_au or p_au>current_date+1 or p_du<'2000-01-01'::date then raise exception 'Période invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));

 delete from seneve.hd_finance_expenses where enrollment_id=enrollment and currency=p_currency and date_locale between p_du and p_au;
 get diagnostics n_depenses=row_count;
 delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale between p_du and p_au and direction='sortie';
 get diagnostics n_sorties=row_count;
 delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and date_locale between p_du and p_au;
 get diagnostics n_entrees=row_count;
 delete from seneve.hd_finance_savings_withdrawals w using seneve.hd_finance_savings_goals g where w.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and w.date_locale between p_du and p_au;
 get diagnostics n_retraits=row_count;
 delete from seneve.hd_finance_savings_entries x using seneve.hd_finance_savings_goals g where x.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency and x.date_locale between p_du and p_au;
 get diagnostics n_versements=row_count;
 delete from seneve.hd_finance_debt_payments p using seneve.hd_finance_debt_accounts d where p.debt_id=d.debt_id and d.enrollment_id=enrollment and d.currency=p_currency and p.date_locale between p_du and p_au;
 get diagnostics n_paiements=row_count;
 update seneve.hd_finance_debt_accounts d set closed_at=null
  where d.enrollment_id=enrollment and d.currency=p_currency and d.closed_at is not null
   and coalesce((select sum(p.amount) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id),0)<d.opening_balance;
 get diagnostics n_rouvertes=row_count;
 delete from seneve.hd_finance_allocations where enrollment_id=enrollment and currency=p_currency and date_locale between p_du and p_au;
 get diagnostics n_repartitions=row_count;
 delete from seneve.hd_finance_business_charge_payments p using seneve.hd_finance_business_charges c
  where p.charge_id=c.charge_id and c.enrollment_id=enrollment and c.currency=p_currency and p.date_locale between p_du and p_au;
 get diagnostics n_charges=row_count;
 delete from seneve.hd_finance_business_receipts where enrollment_id=enrollment and currency=p_currency and date_locale between p_du and p_au;
 get diagnostics n_encaissements=row_count;

 -- Contrôle de cohérence : aucun solde ne doit devenir négatif à une date plus récente.
 if exists(
   select 1 from (select envelope,sum(s) over (partition by envelope order by d) cumul from (
     select envelope,date_locale d,sum(case when direction='entree' then amount else -amount end) s
     from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency group by envelope,date_locale) j) x where x.cumul< -0.000001)
  or exists(
   select 1 from (select goal_id,sum(s) over (partition by goal_id order by d) cumul from (
     select goal_id,d,sum(s) s from (
      select x.goal_id,x.date_locale d,x.amount s from seneve.hd_finance_savings_entries x join seneve.hd_finance_savings_goals g using(goal_id) where g.enrollment_id=enrollment and g.currency=p_currency
      union all
      select w.goal_id,w.date_locale,-w.amount from seneve.hd_finance_savings_withdrawals w join seneve.hd_finance_savings_goals g using(goal_id) where g.enrollment_id=enrollment and g.currency=p_currency) y group by goal_id,d) j) z where z.cumul< -0.000001)
  or seneve_private.hd_finance_business_available(enrollment,p_currency)< -0.000001 then
  raise exception 'Effacement impossible : de l''argent de ces jours a déjà été utilisé plus tard' using errcode='P0001';
 end if;

 delete from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment
  and not exists(select 1 from seneve.hd_finance_envelope_moves m where m.move_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_withdrawals w where w.withdrawal_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_debt_payments p where p.payment_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_entries e where e.entry_id=x.ligne_id);
 return jsonb_build_object('du',p_du,'au',p_au,'sorties',n_sorties,'entrees',n_entrees,'versements',n_versements,'retraits',n_retraits,'remboursements',n_paiements,
  'dettes_rouvertes',n_rouvertes,'repartitions',n_repartitions,'encaissements',n_encaissements,'paiements_charges',n_charges,'depenses',n_depenses,'masque',false);
end$$;
revoke all on function seneve_private.hd_finance_jours_effacer(uuid,text,date,date,text) from public, anon;
grant execute on function seneve_private.hd_finance_jours_effacer(uuid,text,date,date,text) to authenticated;

create or replace function seneve.hd_finance_jours_effacer(p_enrollment_id uuid,p_currency text,p_du date,p_au date,p_confirmation text)
returns jsonb language sql set search_path to '' as $$select seneve_private.hd_finance_jours_effacer(p_enrollment_id,p_currency,p_du,p_au,p_confirmation)$$;
revoke all on function seneve.hd_finance_jours_effacer(uuid,text,date,date,text) from public, anon;
grant execute on function seneve.hd_finance_jours_effacer(uuid,text,date,date,text) to authenticated;

-- Ancienne porte « tout + date + EFFACER » (semaine / mois, version de 23 h) : passe désormais par les jours, du début choisi à aujourd'hui.
create or replace function seneve.hd_finance_bilan_effacer(p_enrollment_id uuid, p_currency text, p_depuis date, p_quoi text, p_confirmation text)
returns jsonb language plpgsql set search_path to '' as $$
declare r jsonb;
begin
 if p_quoi='tout' and p_depuis is not null and coalesce(p_confirmation,'')='EFFACER' then
  return seneve_private.hd_finance_jours_effacer(p_enrollment_id,p_currency,p_depuis,current_date+1,p_confirmation);
 end if;
 r:=seneve_private.hd_finance_bilan_effacer(p_enrollment_id,p_currency,p_depuis,p_quoi,p_confirmation);
 if p_quoi='tout' and p_depuis is null then
  r:=r||jsonb_build_object('depenses',seneve_private.hd_finance_expenses_reset(p_enrollment_id,p_currency,p_confirmation));
 end if;
 return r;
end$$;
drop function if exists seneve_private.hd_finance_periode_effacer(uuid,text,date,text);
