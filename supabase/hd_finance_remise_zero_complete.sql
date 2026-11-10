-- Remise à zéro complète (demande de Dr Justin du 10/11/2026, choix « 2 ») : « Tout effacer » depuis le début
-- efface aussi les encaissements d'activité et les paiements des charges, donc le « Solde à répartir ».
-- Les objectifs, les dettes et les charges restent (avec leur nom et leur montant prévu).
-- Seule différence avec hd_finance_coherence.sql : les deux delete marqués « (nouveau) ».
-- Retour : réappliquer la définition de hd_finance_bilan_effacer de hd_finance_coherence.sql.
create or replace function seneve_private.hd_finance_bilan_effacer(p_enrollment_id uuid, p_currency text, p_depuis date, p_quoi text, p_confirmation text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare enrollment uuid;n_sorties integer:=0;n_retraits integer:=0;n_paiements integer:=0;n_entrees integer:=0;n_versements integer:=0;n_repartitions integer:=0;n_encaissements integer:=0;n_charges integer:=0;depuis date:=coalesce(p_depuis,'0001-01-01'::date);
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_quoi is null or p_quoi not in('donne','depense','investi','autre','dettes','tout') or p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Effacement invalide' using errcode='22023';end if;
 if p_quoi='tout' and coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;

 if p_quoi='tout' and p_depuis is null then
  perform pg_advisory_xact_lock(hashtextextended('seneve/recettes/'||enrollment::text||'/'||p_currency,0));
  delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency and direction='sortie';
  get diagnostics n_sorties=row_count;
  delete from seneve.hd_finance_savings_withdrawals w using seneve.hd_finance_savings_goals g where w.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency;
  get diagnostics n_retraits=row_count;
  delete from seneve.hd_finance_debt_payments p using seneve.hd_finance_debt_accounts d where p.debt_id=d.debt_id and d.enrollment_id=enrollment and d.currency=p_currency;
  get diagnostics n_paiements=row_count;
  update seneve.hd_finance_debt_accounts set closed_at=null where enrollment_id=enrollment and currency=p_currency and closed_at is not null;
  delete from seneve.hd_finance_envelope_moves where enrollment_id=enrollment and currency=p_currency;
  get diagnostics n_entrees=row_count;
  delete from seneve.hd_finance_savings_entries x using seneve.hd_finance_savings_goals g where x.goal_id=g.goal_id and g.enrollment_id=enrollment and g.currency=p_currency;
  get diagnostics n_versements=row_count;
  delete from seneve.hd_finance_allocations where enrollment_id=enrollment and currency=p_currency;
  get diagnostics n_repartitions=row_count;
  -- (nouveau) Paiements des charges d'activité de cette monnaie : les charges restent, à couvrir de nouveau.
  delete from seneve.hd_finance_business_charge_payments p using seneve.hd_finance_business_charges c
   where p.charge_id=c.charge_id and c.enrollment_id=enrollment and c.currency=p_currency;
  get diagnostics n_charges=row_count;
  -- (nouveau) Encaissements d'activité : le « Solde à répartir » revient à 0.
  delete from seneve.hd_finance_business_receipts where enrollment_id=enrollment and currency=p_currency;
  get diagnostics n_encaissements=row_count;
  delete from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment
   and not exists(select 1 from seneve.hd_finance_envelope_moves m where m.move_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_savings_withdrawals w where w.withdrawal_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_debt_payments p where p.payment_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_savings_entries e where e.entry_id=x.ligne_id);
  return jsonb_build_object('sorties',n_sorties,'retraits',n_retraits,'remboursements',n_paiements,'entrees',n_entrees,'versements',n_versements,'repartitions',n_repartitions,'encaissements',n_encaissements,'paiements_charges',n_charges,'masque',false);
 end if;

 if p_quoi in('donne','depense','investi','autre','tout') then
  insert into seneve.hd_finance_bilan_masques(ligne_type,ligne_id,enrollment_id)
  select 'mouvement',m.move_id,enrollment from seneve.hd_finance_envelope_moves m
  where m.enrollment_id=enrollment and m.currency=p_currency and m.date_locale>=depuis and m.direction='sortie' and (p_quoi='tout' or m.motif=p_quoi)
  on conflict do nothing;
  get diagnostics n_sorties=row_count;
  insert into seneve.hd_finance_bilan_masques(ligne_type,ligne_id,enrollment_id)
  select 'retrait',w.withdrawal_id,enrollment from seneve.hd_finance_savings_withdrawals w join seneve.hd_finance_savings_goals g using(goal_id)
  where g.enrollment_id=enrollment and g.currency=p_currency and w.date_locale>=depuis and (p_quoi='tout' or w.motif=p_quoi)
  on conflict do nothing;
  get diagnostics n_retraits=row_count;
 end if;
 if p_quoi in('dettes','tout') then
  insert into seneve.hd_finance_bilan_masques(ligne_type,ligne_id,enrollment_id)
  select 'remboursement',p.payment_id,enrollment from seneve.hd_finance_debt_payments p join seneve.hd_finance_debt_accounts d using(debt_id)
  where d.enrollment_id=enrollment and d.currency=p_currency and p.date_locale>=depuis
  on conflict do nothing;
  get diagnostics n_paiements=row_count;
 end if;
 if p_quoi='tout' then
  insert into seneve.hd_finance_bilan_masques(ligne_type,ligne_id,enrollment_id)
  select 'mouvement',m.move_id,enrollment from seneve.hd_finance_envelope_moves m
  where m.enrollment_id=enrollment and m.currency=p_currency and m.date_locale>=depuis and m.direction='entree'
  on conflict do nothing;
  get diagnostics n_entrees=row_count;
  insert into seneve.hd_finance_bilan_masques(ligne_type,ligne_id,enrollment_id)
  select 'versement',x.entry_id,enrollment from seneve.hd_finance_savings_entries x join seneve.hd_finance_savings_goals g using(goal_id)
  where g.enrollment_id=enrollment and g.currency=p_currency and x.date_locale>=depuis
  on conflict do nothing;
  get diagnostics n_versements=row_count;
 end if;
 return jsonb_build_object('sorties',n_sorties,'retraits',n_retraits,'remboursements',n_paiements,'entrees',n_entrees,'versements',n_versements,'repartitions',n_repartitions,'masque',true);
end$function$;
