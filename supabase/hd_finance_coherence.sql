-- Cohérence des calculs SÉNEVÉ Finance (audit du 10/11/2026).
-- 1. « Effacer le bilan » ne change plus jamais un disponible ni une dette : les lignes sont MASQUÉES
--    (elles disparaissent de l'historique et du bilan) mais restent comptées dans les soldes.
--    Seul « Tout effacer » sur toute la période (« Tout ») supprime vraiment et remet tout à zéro.
-- 2. Une sortie ou un retrait daté ne peut pas dépasser ce qui était disponible à cette date,
--    ni rendre la caisse négative à une date plus tardive (l'ordre des dates est respecté).
-- 3. Aucune saisie dans le futur (tolérance d'un jour pour les fuseaux en avance sur UTC).
-- 4. Une dette mise de côté ne peut plus recevoir de remboursement.
-- À appliquer après hd_finance_heures.sql et hd_finance_suppression.sql. Retour arrière : hd_finance_coherence_retour.sql.

create table seneve.hd_finance_bilan_masques(
 ligne_type text not null check(ligne_type in('mouvement','retrait','remboursement','versement')),
 ligne_id uuid not null,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 masque_le timestamptz not null default now(),
 primary key(ligne_type,ligne_id)
);
create index hd_finance_bilan_masques_idx on seneve.hd_finance_bilan_masques(enrollment_id);
alter table seneve.hd_finance_bilan_masques enable row level security;
revoke all on seneve.hd_finance_bilan_masques from public,anon,authenticated,service_role;

-- Date acceptée : jamais après demain en UTC (le jour local le plus en avance est UTC+14).
create function seneve_private.hd_finance_date_ok(p_date date)
returns boolean language sql stable set search_path='' as $$
 select p_date is not null and p_date<=(pg_catalog.now() at time zone 'UTC')::date+1
$$;
revoke all on function seneve_private.hd_finance_date_ok(date) from public,anon,authenticated,service_role;

-- Disponible d'une caisse « à la date » : le plus petit solde de fin de journée entre cette date et la fin
-- de l'historique. Une sortie datée de ce jour ne peut pas dépasser ce montant.
create function seneve_private.hd_finance_envelope_dispo_au(p_enrollment uuid,p_envelope text,p_currency text,p_date date)
returns numeric language sql stable set search_path='' as $$
 with j as (select date_locale d,sum(case when direction='entree' then amount else -amount end) s
            from seneve.hd_finance_envelope_moves
            where enrollment_id=p_enrollment and envelope=p_envelope and currency=p_currency group by date_locale),
      c as (select d,sum(s) over (order by d) cumul from j),
      a as (select coalesce((select sum(s) from j where d<=p_date),0) v)
 select greatest(0,least(a.v,coalesce((select min(cumul) from c where d>p_date),a.v))) from a
$$;
revoke all on function seneve_private.hd_finance_envelope_dispo_au(uuid,text,text,date) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_goal_dispo_au(p_goal uuid,p_date date)
returns numeric language sql stable set search_path='' as $$
 with j as (select d,sum(s) s from (
             select date_locale d,amount s from seneve.hd_finance_savings_entries where goal_id=p_goal
             union all
             select date_locale,-amount from seneve.hd_finance_savings_withdrawals where goal_id=p_goal) x group by d),
      c as (select d,sum(s) over (order by d) cumul from j),
      a as (select coalesce((select sum(s) from j where d<=p_date),0) v)
 select greatest(0,least(a.v,coalesce((select min(cumul) from c where d>p_date),a.v))) from a
$$;
revoke all on function seneve_private.hd_finance_goal_dispo_au(uuid,date) from public,anon,authenticated,service_role;

create or replace function seneve_private.hd_finance_envelope_move_add(p_enrollment_id uuid,p_envelope text,p_direction text,p_motif text,p_amount numeric,p_currency text,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;m seneve.hd_finance_envelope_moves%rowtype;dispo numeric;montant numeric:=p_amount;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_envelope is null or p_envelope not in('dime','offrande','vivre') or p_direction is null or p_direction not in('entree','sortie')
   or (p_direction='sortie')<>(p_motif is not null) or (p_motif is not null and p_motif not in('donne','depense','investi','autre'))
   or seneve_private.hd_finance_date_ok(p_date_locale) is not true or (coalesce(p_remise_a_zero,false) and p_direction<>'sortie') then raise exception 'Mouvement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into m from seneve.hd_finance_envelope_moves where move_id=p_request_id;
 if found then
  if m.enrollment_id<>enrollment or m.envelope<>p_envelope or m.direction<>p_direction or m.currency<>p_currency then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('move_id',m.move_id,'amount',m.amount::text,'balance',seneve_private.hd_finance_envelope_balance(enrollment,m.envelope,m.currency)::text);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance-env|'||enrollment::text||'|'||p_envelope||'|'||coalesce(p_currency,''),0));
 -- Disponible à la date choisie (et jamais négatif ensuite), pas seulement le total du jour.
 dispo:=seneve_private.hd_finance_envelope_dispo_au(enrollment,p_envelope,p_currency,p_date_locale);
 if coalesce(p_remise_a_zero,false) then montant:=dispo;end if;
 if montant is null or montant<=0 or seneve_private.hd_finance_amount_fits(p_currency,montant) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
 if p_direction='sortie' and montant>dispo then raise exception 'Le montant dépasse le disponible du compteur à cette date' using errcode='22023';end if;
 insert into seneve.hd_finance_envelope_moves(move_id,enrollment_id,envelope,direction,motif,amount,currency,date_locale,remise_a_zero)
 values(p_request_id,enrollment,p_envelope,p_direction,p_motif,montant,p_currency,p_date_locale,coalesce(p_remise_a_zero,false)) returning * into m;
 return jsonb_build_object('move_id',m.move_id,'amount',m.amount::text,'balance',seneve_private.hd_finance_envelope_balance(enrollment,m.envelope,m.currency)::text);
end$$;

create or replace function seneve_private.hd_finance_savings_withdraw_add(p_enrollment_id uuid,p_goal_id uuid,p_motif text,p_amount numeric,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;w seneve.hd_finance_savings_withdrawals%rowtype;dispo numeric;montant numeric:=p_amount;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_motif is null or p_motif not in('donne','depense','investi','autre') or seneve_private.hd_finance_date_ok(p_date_locale) is not true then raise exception 'Retrait invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into g from seneve.hd_finance_savings_goals where goal_id=p_goal_id and enrollment_id=enrollment and archived_at is null for update;
 if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
 select * into w from seneve.hd_finance_savings_withdrawals where withdrawal_id=p_request_id;
 if found then
  if w.goal_id<>g.goal_id then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('withdrawal_id',w.withdrawal_id,'amount',w.amount::text,'balance',seneve_private.hd_finance_goal_balance(g.goal_id)::text);
 end if;
 dispo:=seneve_private.hd_finance_goal_dispo_au(g.goal_id,p_date_locale);
 if coalesce(p_remise_a_zero,false) then montant:=dispo;end if;
 if montant is null or montant<=0 or seneve_private.hd_finance_amount_fits(g.currency,montant) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
 if montant>dispo then raise exception 'Le retrait dépasse le disponible de l’objectif à cette date' using errcode='22023';end if;
 insert into seneve.hd_finance_savings_withdrawals(withdrawal_id,goal_id,motif,amount,date_locale,remise_a_zero)
 values(p_request_id,g.goal_id,p_motif,montant,p_date_locale,coalesce(p_remise_a_zero,false)) returning * into w;
 return jsonb_build_object('withdrawal_id',w.withdrawal_id,'amount',w.amount::text,'balance',seneve_private.hd_finance_goal_balance(g.goal_id)::text);
end$$;

create or replace function seneve_private.hd_finance_savings_entry_add(p_enrollment_id uuid,p_goal_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;x seneve.hd_finance_savings_entries%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount>9999999999.99 or scale(p_amount)>2 or seneve_private.hd_finance_date_ok(p_date_locale) is not true then raise exception 'Versement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into g from seneve.hd_finance_savings_goals where goal_id=p_goal_id and enrollment_id=enrollment and archived_at is null for share;
 if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
 if seneve_private.hd_finance_amount_fits(g.currency,p_amount) is not true then raise exception 'Montant incompatible avec la devise' using errcode='22023';end if;
 insert into seneve.hd_finance_savings_entries(entry_id,goal_id,amount,date_locale)
 values(p_request_id,g.goal_id,p_amount,p_date_locale)
 on conflict(entry_id) do nothing returning * into x;
 if not found then
  select * into x from seneve.hd_finance_savings_entries
   where entry_id=p_request_id and goal_id=g.goal_id and amount=p_amount and date_locale=p_date_locale;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('entry_id',x.entry_id,'goal_id',x.goal_id,'amount',x.amount::text,'date_locale',x.date_locale);
end$$;

create or replace function seneve_private.hd_finance_debt_payment_add(p_enrollment_id uuid,p_debt_id uuid,p_amount numeric,p_date_locale date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;d seneve.hd_finance_debt_accounts%rowtype;p seneve.hd_finance_debt_payments%rowtype;reste numeric;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount>9999999999.99 or scale(p_amount)>2 or seneve_private.hd_finance_date_ok(p_date_locale) is not true then raise exception 'Remboursement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into d from seneve.hd_finance_debt_accounts where debt_id=p_debt_id and enrollment_id=enrollment for update;
 if not found then raise exception 'Dette non accessible' using errcode='42501';end if;
 select d.opening_balance-coalesce(sum(x.amount),0) into reste from seneve.hd_finance_debt_payments x where x.debt_id=d.debt_id;
 if seneve_private.hd_finance_amount_fits(d.currency,p_amount) is not true then raise exception 'Montant incompatible avec la devise' using errcode='22023';end if;
 select * into p from seneve.hd_finance_debt_payments where payment_id=p_request_id and debt_id=d.debt_id;
 if found then
  if p.amount<>p_amount or p.date_locale<>p_date_locale then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
 else
  -- Une dette mise de côté (« Supprimer ») ne reçoit plus de nouveau remboursement.
  if d.archived_at is not null then raise exception 'Dette non accessible' using errcode='42501';end if;
  if p_amount>reste then raise exception 'Le remboursement dépasse le solde restant' using errcode='22023';end if;
  insert into seneve.hd_finance_debt_payments(payment_id,debt_id,amount,date_locale)
  values(p_request_id,d.debt_id,p_amount,p_date_locale)
  on conflict(payment_id) do nothing returning * into p;
  if not found then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  reste:=reste-p.amount;
  if reste=0 then update seneve.hd_finance_debt_accounts set closed_at=now() where debt_id=d.debt_id;end if;
 end if;
 return jsonb_build_object('payment_id',p.payment_id,'debt_id',p.debt_id,'amount',p.amount::text,'date_locale',p.date_locale,'remaining',reste::text);
end$$;

create or replace function seneve_private.hd_finance_allocation_save(p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;a seneve.hd_finance_allocations%rowtype;part jsonb;i integer:=0;nom text;montant numeric;g seneve.hd_finance_savings_goals%rowtype;d seneve.hd_finance_debt_accounts%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if seneve_private.hd_finance_date_ok(p_date_locale) is not true or p_parts is null or jsonb_typeof(p_parts)<>'array' or jsonb_array_length(p_parts) not between 1 and 30 then raise exception 'Répartition invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into a from seneve.hd_finance_allocations where allocation_id=p_request_id;
 if found then
  if a.enrollment_id<>enrollment or a.currency<>p_currency or a.parts<>p_parts then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('allocation_id',a.allocation_id,'deja',true);
 end if;
 insert into seneve.hd_finance_allocations(allocation_id,enrollment_id,currency,date_locale,parts) values(p_request_id,enrollment,p_currency,p_date_locale,p_parts);
 for part in select * from jsonb_array_elements(p_parts) loop
  i:=i+1;nom:=part->>'part';
  begin montant:=(part->>'amount')::numeric;exception when others then raise exception 'Montant invalide' using errcode='22023';end;
  if montant is null or montant<=0 or seneve_private.hd_finance_amount_fits(p_currency,montant) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
  if nom in('dime','offrande','vivre') then
   insert into seneve.hd_finance_envelope_moves(move_id,enrollment_id,envelope,direction,amount,currency,date_locale,allocation_id)
   values(seneve_private.hd_finance_derived_id(p_request_id,i),enrollment,nom,'entree',montant,p_currency,p_date_locale,p_request_id);
  elsif nom in('reserve_joie','epargne_investir','autre') then
   select * into g from seneve.hd_finance_savings_goals where goal_id=(part->>'goal_id')::uuid and enrollment_id=enrollment and archived_at is null and currency=p_currency and goal_type=nom;
   if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
   insert into seneve.hd_finance_savings_entries(entry_id,goal_id,amount,date_locale) values(seneve_private.hd_finance_derived_id(p_request_id,i),g.goal_id,montant,p_date_locale);
  elsif nom='dettes' then
   select * into d from seneve.hd_finance_debt_accounts where debt_id=(part->>'debt_id')::uuid and enrollment_id=enrollment and currency=p_currency and archived_at is null for update;
   if not found then raise exception 'Dette non accessible' using errcode='42501';end if;
   perform seneve_private.hd_finance_debt_payment_add(enrollment,d.debt_id,montant,p_date_locale,seneve_private.hd_finance_derived_id(p_request_id,i));
  else raise exception 'Part inconnue' using errcode='22023';
  end if;
 end loop;
 return jsonb_build_object('allocation_id',p_request_id,'deja',false);
end$$;

-- Lecture des compteurs : ajoute la liste des lignes masquées du bilan.
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
  'withdrawals',(select coalesce(jsonb_agg(jsonb_build_object('withdrawal_id',w.withdrawal_id,'goal_id',w.goal_id,'motif',w.motif,'amount',w.amount::text,'date_locale',w.date_locale,'remise_a_zero',w.remise_a_zero,'created_at',w.created_at) order by w.date_locale,w.created_at),'[]'::jsonb) from seneve.hd_finance_savings_withdrawals w join seneve.hd_finance_savings_goals g using(goal_id) where g.enrollment_id=enrollment),
  'masques',(select coalesce(jsonb_agg(x.ligne_id order by x.ligne_id),'[]'::jsonb) from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment));
end$$;

-- Effacer le bilan. Par défaut : MASQUE les lignes (historique et bilan), les soldes ne bougent pas.
-- « Tout effacer » sur tout l'historique (p_quoi='tout', p_depuis null) : remise à zéro réelle de la monnaie.
create or replace function seneve_private.hd_finance_bilan_effacer(p_enrollment_id uuid,p_currency text,p_depuis date,p_quoi text,p_confirmation text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;n_sorties integer:=0;n_retraits integer:=0;n_paiements integer:=0;n_entrees integer:=0;n_versements integer:=0;n_repartitions integer:=0;depuis date:=coalesce(p_depuis,'0001-01-01'::date);
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_quoi is null or p_quoi not in('donne','depense','investi','autre','dettes','tout') or p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Effacement invalide' using errcode='22023';end if;
 if p_quoi='tout' and coalesce(p_confirmation,'')<>'EFFACER' then raise exception 'Confirmation requise' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;

 if p_quoi='tout' and p_depuis is null then
  -- Remise à zéro complète, demandée avec confirmation : tout disparaît ensemble, donc rien ne « revient ».
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
  -- Masques devenus sans objet.
  delete from seneve.hd_finance_bilan_masques x where x.enrollment_id=enrollment
   and not exists(select 1 from seneve.hd_finance_envelope_moves m where m.move_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_savings_withdrawals w where w.withdrawal_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_debt_payments p where p.payment_id=x.ligne_id)
   and not exists(select 1 from seneve.hd_finance_savings_entries e where e.entry_id=x.ligne_id);
  return jsonb_build_object('sorties',n_sorties,'retraits',n_retraits,'remboursements',n_paiements,'entrees',n_entrees,'versements',n_versements,'repartitions',n_repartitions,'masque',false);
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
end$$;
