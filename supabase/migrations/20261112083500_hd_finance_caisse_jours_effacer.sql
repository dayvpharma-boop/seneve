-- « Effacer des jours dans cette caisse » (décision de Dr Justin du 12/11/2026) : remplace « Tout utilisé : remettre la caisse à zéro ».
-- Copie fidèle de la fonction déjà appliquée en production le 12/11/2026 à 08 h 25 (Kinshasa), enregistrée ici pour l'historique.
-- Efface seulement les opérations d'UNE caisse (dîme, offrande, pour vivre, ou un objectif) datées des jours choisis ;
-- pour une enveloppe, les dépenses de SÉNEVÉ Dépenses liées aux sorties effacées le sont aussi.
-- Sécurité : si la caisse passait sous zéro à une date plus récente, rien n'est effacé (« Effacement impossible »).
create or replace function seneve_private.hd_finance_caisse_jours_effacer(p_enrollment_id uuid,p_currency text,p_envelope text,p_goal_id uuid,p_du date,p_au date,p_confirmation text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;n_mouvements int:=0;n_depenses int:=0;n_versements int:=0;n_retraits int:=0;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_currency is null or p_currency !~ '^[A-Z]{3}$' or ((p_envelope is null)=(p_goal_id is null)) or (p_envelope is not null and p_envelope not in('dime','offrande','vivre')) then raise exception 'Effacement invalide' using errcode='22023';end if;
 if coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 if p_du is null or p_au is null or p_du>p_au or p_au>current_date+1 or p_du<'2000-01-01'::date then raise exception 'Période invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_goal_id is not null and not exists(select 1 from seneve.hd_finance_savings_goals where goal_id=p_goal_id and enrollment_id=enrollment and currency=p_currency) then raise exception 'Objectif non accessible' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));
 if p_envelope is not null then
  delete from seneve.hd_finance_expenses e using seneve.hd_finance_envelope_moves m
   where e.move_id=m.move_id and m.enrollment_id=enrollment and m.envelope=p_envelope and m.currency=p_currency and m.date_locale between p_du and p_au;
  get diagnostics n_depenses=row_count;
  delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and envelope=p_envelope and currency=p_currency and date_locale between p_du and p_au;
  get diagnostics n_mouvements=row_count;
  if exists(select 1 from (select sum(s) over (order by d) cumul from (select date_locale d,sum(case when direction='entree' then amount else -amount end) s
     from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and envelope=p_envelope and currency=p_currency group by date_locale) j) x where x.cumul< -0.000001) then
   raise exception 'Effacement impossible : de l''argent de ces jours a déjà été utilisé plus tard' using errcode='P0001';
  end if;
 else
  delete from seneve.hd_finance_savings_withdrawals where goal_id=p_goal_id and date_locale between p_du and p_au;
  get diagnostics n_retraits=row_count;
  delete from seneve.hd_finance_savings_entries where goal_id=p_goal_id and date_locale between p_du and p_au;
  get diagnostics n_versements=row_count;
  if exists(select 1 from (select sum(s) over (order by d) cumul from (select d,sum(s) s from (
     select date_locale d,amount s from seneve.hd_finance_savings_entries where goal_id=p_goal_id
     union all select date_locale,-amount from seneve.hd_finance_savings_withdrawals where goal_id=p_goal_id) y group by d) j) x where x.cumul< -0.000001) then
   raise exception 'Effacement impossible : de l''argent de ces jours a déjà été utilisé plus tard' using errcode='P0001';
  end if;
 end if;
 delete from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment
  and not exists(select 1 from seneve.hd_finance_envelope_moves m where m.move_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_withdrawals w where w.withdrawal_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_debt_payments p where p.payment_id=x.ligne_id)
  and not exists(select 1 from seneve.hd_finance_savings_entries e where e.entry_id=x.ligne_id);
 return jsonb_build_object('du',p_du,'au',p_au,'mouvements',n_mouvements,'depenses',n_depenses,'versements',n_versements,'retraits',n_retraits);
end$$;
