-- Compteurs « Quand je reçois de l'argent » (demande de Dr Justin du 07/11/2026).
-- Ajout seulement : aucune table ni fonction existante n'est modifiée. Retour arrière : hd_finance_compteurs_retour.sql.
-- 1. Compteurs Dîme, Offrande et Pour vivre : entrées (répartition) et sorties (donné, dépensé, investi, autre).
-- 2. Retraits sur un objectif d'épargne (Réserve de joie, Pour investir) : le disponible de l'objectif baisse.
-- 3. Enregistrement d'une répartition entière en une seule opération (tout ou rien).
-- Aucun texte libre n'est conservé ; SÉNEVÉ ne déplace aucun argent, il note ce que la personne déclare.

create table seneve.hd_finance_envelope_moves(
 move_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 envelope text not null check(envelope in('dime','offrande','vivre')),
 direction text not null check(direction in('entree','sortie')),
 motif text check(motif in('donne','depense','investi','autre')),
 amount numeric(12,2) not null check(amount>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 date_locale date not null,
 remise_a_zero boolean not null default false,
 allocation_id uuid,
 created_at timestamptz not null default now(),
 check((direction='sortie')=(motif is not null)),
 check(not remise_a_zero or direction='sortie')
);
create index hd_finance_envelope_moves_idx on seneve.hd_finance_envelope_moves(enrollment_id,envelope,currency,date_locale,created_at);

create table seneve.hd_finance_savings_withdrawals(
 withdrawal_id uuid primary key,
 goal_id uuid not null references seneve.hd_finance_savings_goals(goal_id) on delete cascade,
 motif text not null check(motif in('donne','depense','investi','autre')),
 amount numeric(12,2) not null check(amount>0),
 date_locale date not null,
 remise_a_zero boolean not null default false,
 created_at timestamptz not null default now()
);
create index hd_finance_savings_withdrawals_goal_idx on seneve.hd_finance_savings_withdrawals(goal_id,date_locale,created_at);

create table seneve.hd_finance_allocations(
 allocation_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 currency text not null check(currency ~ '^[A-Z]{3}$'),
 date_locale date not null,
 parts jsonb not null,
 created_at timestamptz not null default now()
);
create index hd_finance_allocations_idx on seneve.hd_finance_allocations(enrollment_id,date_locale,created_at);

alter table seneve.hd_finance_envelope_moves enable row level security;
alter table seneve.hd_finance_savings_withdrawals enable row level security;
alter table seneve.hd_finance_allocations enable row level security;
revoke all on seneve.hd_finance_envelope_moves,seneve.hd_finance_savings_withdrawals,seneve.hd_finance_allocations from public,anon,authenticated,service_role;

-- Identifiant stable dérivé (pour rejouer une répartition sans doublon).
create function seneve_private.hd_finance_derived_id(p_base uuid,p_index integer)
returns uuid language sql immutable set search_path='' as $$
 select (md5(p_base::text||'|'||p_index::text))::uuid
$$;
revoke all on function seneve_private.hd_finance_derived_id(uuid,integer) from public,anon,authenticated,service_role;

-- Disponible d'un compteur (entrées − sorties), par monnaie.
create function seneve_private.hd_finance_envelope_balance(p_enrollment uuid,p_envelope text,p_currency text)
returns numeric language sql stable set search_path='' as $$
 select coalesce(sum(case when direction='entree' then amount else -amount end),0)
 from seneve.hd_finance_envelope_moves
 where enrollment_id=p_enrollment and envelope=p_envelope and currency=p_currency
$$;
revoke all on function seneve_private.hd_finance_envelope_balance(uuid,text,text) from public,anon,authenticated,service_role;

-- Disponible d'un objectif d'épargne (versements − retraits).
create function seneve_private.hd_finance_goal_balance(p_goal uuid)
returns numeric language sql stable set search_path='' as $$
 select coalesce((select sum(amount) from seneve.hd_finance_savings_entries where goal_id=p_goal),0)
       -coalesce((select sum(amount) from seneve.hd_finance_savings_withdrawals where goal_id=p_goal),0)
$$;
revoke all on function seneve_private.hd_finance_goal_balance(uuid) from public,anon,authenticated,service_role;

create function seneve_private.hd_finance_envelope_move_add(p_enrollment_id uuid,p_envelope text,p_direction text,p_motif text,p_amount numeric,p_currency text,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;m seneve.hd_finance_envelope_moves%rowtype;dispo numeric;montant numeric:=p_amount;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_envelope is null or p_envelope not in('dime','offrande','vivre') or p_direction is null or p_direction not in('entree','sortie')
   or (p_direction='sortie')<>(p_motif is not null) or (p_motif is not null and p_motif not in('donne','depense','investi','autre'))
   or p_date_locale is null or (coalesce(p_remise_a_zero,false) and p_direction<>'sortie') then raise exception 'Mouvement invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into m from seneve.hd_finance_envelope_moves where move_id=p_request_id;
 if found then
  if m.enrollment_id<>enrollment or m.envelope<>p_envelope or m.direction<>p_direction or m.currency<>p_currency then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('move_id',m.move_id,'amount',m.amount::text,'balance',seneve_private.hd_finance_envelope_balance(enrollment,m.envelope,m.currency)::text);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance-env|'||enrollment::text||'|'||p_envelope||'|'||coalesce(p_currency,''),0));
 dispo:=seneve_private.hd_finance_envelope_balance(enrollment,p_envelope,p_currency);
 -- « Tout utilisé » : le montant est le disponible entier, et le compteur repart de zéro.
 if coalesce(p_remise_a_zero,false) then montant:=dispo;end if;
 if montant is null or montant<=0 or seneve_private.hd_finance_amount_fits(p_currency,montant) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
 if p_direction='sortie' and montant>dispo then raise exception 'Le montant dépasse le disponible du compteur' using errcode='22023';end if;
 insert into seneve.hd_finance_envelope_moves(move_id,enrollment_id,envelope,direction,motif,amount,currency,date_locale,remise_a_zero)
 values(p_request_id,enrollment,p_envelope,p_direction,p_motif,montant,p_currency,p_date_locale,coalesce(p_remise_a_zero,false)) returning * into m;
 return jsonb_build_object('move_id',m.move_id,'amount',m.amount::text,'balance',seneve_private.hd_finance_envelope_balance(enrollment,m.envelope,m.currency)::text);
end$$;

create function seneve_private.hd_finance_savings_withdraw_add(p_enrollment_id uuid,p_goal_id uuid,p_motif text,p_amount numeric,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;w seneve.hd_finance_savings_withdrawals%rowtype;dispo numeric;montant numeric:=p_amount;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_motif is null or p_motif not in('donne','depense','investi','autre') or p_date_locale is null then raise exception 'Retrait invalide' using errcode='22023';end if;
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
 dispo:=seneve_private.hd_finance_goal_balance(g.goal_id);
 if coalesce(p_remise_a_zero,false) then montant:=dispo;end if;
 if montant is null or montant<=0 or seneve_private.hd_finance_amount_fits(g.currency,montant) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
 if montant>dispo then raise exception 'Le retrait dépasse le disponible de l’objectif' using errcode='22023';end if;
 insert into seneve.hd_finance_savings_withdrawals(withdrawal_id,goal_id,motif,amount,date_locale,remise_a_zero)
 values(p_request_id,g.goal_id,p_motif,montant,p_date_locale,coalesce(p_remise_a_zero,false)) returning * into w;
 return jsonb_build_object('withdrawal_id',w.withdrawal_id,'amount',w.amount::text,'balance',seneve_private.hd_finance_goal_balance(g.goal_id)::text);
end$$;

-- Répartition entière, tout ou rien. p_parts : [{"part":"dime"|"offrande"|"vivre","amount":"50"},
-- {"part":"reserve_joie"|"epargne_investir","goal_id":"…","amount":"50"}, {"part":"dettes","debt_id":"…","amount":"60"}].
create function seneve_private.hd_finance_allocation_save(p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;a seneve.hd_finance_allocations%rowtype;part jsonb;i integer:=0;nom text;montant numeric;g seneve.hd_finance_savings_goals%rowtype;d seneve.hd_finance_debt_accounts%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_date_locale is null or p_parts is null or jsonb_typeof(p_parts)<>'array' or jsonb_array_length(p_parts) not between 1 and 30 then raise exception 'Répartition invalide' using errcode='22023';end if;
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
  elsif nom in('reserve_joie','epargne_investir') then
   select * into g from seneve.hd_finance_savings_goals where goal_id=(part->>'goal_id')::uuid and enrollment_id=enrollment and archived_at is null and currency=p_currency;
   if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
   insert into seneve.hd_finance_savings_entries(entry_id,goal_id,amount,date_locale) values(seneve_private.hd_finance_derived_id(p_request_id,i),g.goal_id,montant,p_date_locale);
  elsif nom='dettes' then
   select * into d from seneve.hd_finance_debt_accounts where debt_id=(part->>'debt_id')::uuid and enrollment_id=enrollment and currency=p_currency for update;
   if not found then raise exception 'Dette non accessible' using errcode='42501';end if;
   perform seneve_private.hd_finance_debt_payment_add(enrollment,d.debt_id,montant,p_date_locale,seneve_private.hd_finance_derived_id(p_request_id,i));
  else raise exception 'Part inconnue' using errcode='22023';
  end if;
 end loop;
 return jsonb_build_object('allocation_id',p_request_id,'deja',false);
end$$;

create function seneve_private.hd_finance_counters_get(p_enrollment_id uuid)
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
  'moves',(select coalesce(jsonb_agg(jsonb_build_object('move_id',m.move_id,'envelope',m.envelope,'direction',m.direction,'motif',m.motif,'amount',m.amount::text,'currency',m.currency,'date_locale',m.date_locale,'remise_a_zero',m.remise_a_zero,'allocation_id',m.allocation_id) order by m.date_locale,m.created_at),'[]'::jsonb) from seneve.hd_finance_envelope_moves m where m.enrollment_id=enrollment),
  'withdrawals',(select coalesce(jsonb_agg(jsonb_build_object('withdrawal_id',w.withdrawal_id,'goal_id',w.goal_id,'motif',w.motif,'amount',w.amount::text,'date_locale',w.date_locale,'remise_a_zero',w.remise_a_zero) order by w.date_locale,w.created_at),'[]'::jsonb) from seneve.hd_finance_savings_withdrawals w join seneve.hd_finance_savings_goals g using(goal_id) where g.enrollment_id=enrollment));
end$$;

create function seneve.hd_finance_envelope_move_add(p_enrollment_id uuid,p_envelope text,p_direction text,p_motif text,p_amount numeric,p_currency text,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_envelope_move_add(p_enrollment_id,p_envelope,p_direction,p_motif,p_amount,p_currency,p_date_locale,p_remise_a_zero,p_request_id)$$;
create function seneve.hd_finance_savings_withdraw_add(p_enrollment_id uuid,p_goal_id uuid,p_motif text,p_amount numeric,p_date_locale date,p_remise_a_zero boolean,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_savings_withdraw_add(p_enrollment_id,p_goal_id,p_motif,p_amount,p_date_locale,p_remise_a_zero,p_request_id)$$;
create function seneve.hd_finance_allocation_save(p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_allocation_save(p_enrollment_id,p_currency,p_date_locale,p_parts,p_request_id)$$;
create function seneve.hd_finance_counters_get(p_enrollment_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select seneve_private.hd_finance_counters_get(p_enrollment_id)$$;

revoke all on function seneve_private.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid),seneve_private.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid),seneve_private.hd_finance_allocation_save(uuid,text,date,jsonb,uuid),seneve_private.hd_finance_counters_get(uuid) from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid),seneve.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid),seneve.hd_finance_allocation_save(uuid,text,date,jsonb,uuid),seneve.hd_finance_counters_get(uuid) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid),seneve_private.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid),seneve_private.hd_finance_allocation_save(uuid,text,date,jsonb,uuid),seneve_private.hd_finance_counters_get(uuid),seneve.hd_finance_envelope_move_add(uuid,text,text,text,numeric,text,date,boolean,uuid),seneve.hd_finance_savings_withdraw_add(uuid,uuid,text,numeric,date,boolean,uuid),seneve.hd_finance_allocation_save(uuid,text,date,jsonb,uuid),seneve.hd_finance_counters_get(uuid) to authenticated;
