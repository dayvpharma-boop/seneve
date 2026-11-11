-- SÉNEVÉ Dépenses (décision de Dr Justin du 11/11/2026) :
-- * noter une dépense par catégorie, « juste pour savoir » ;
-- * la dépense fait aussi baisser la caisse « Pour vivre » de SÉNEVÉ Compte quand cette caisse la couvre
--   (sortie « dépensé » liée) ; sinon elle est notée seule, sans toucher la caisse ;
-- * annuler une dépense retire aussi la sortie liée ; rien d'autre n'est effacé.
-- Données privées : table fermée, accès uniquement par les fonctions ci-dessous.

create table if not exists seneve.hd_finance_expenses(
 expense_id uuid primary key,
 enrollment_id uuid not null,
 category text not null check (category in ('nourriture','transport','logement','famille','ecole','sante','communication','autre')),
 amount numeric not null check (amount>0),
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 date_locale date not null,
 note text check (note is null or char_length(note)<=140),
 move_id uuid references seneve.hd_finance_envelope_moves(move_id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),
 voided_at timestamptz
);
create index if not exists hd_finance_expenses_enrollment_date on seneve.hd_finance_expenses(enrollment_id,date_locale);
alter table seneve.hd_finance_expenses enable row level security;
revoke all on seneve.hd_finance_expenses from public, anon, authenticated;

create or replace function seneve_private.hd_finance_expense_add(p_enrollment_id uuid,p_category text,p_amount numeric,p_currency text,p_date_locale date,p_note text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;e seneve.hd_finance_expenses%rowtype;dispo numeric;mouvement uuid;note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 if p_category is null or p_category not in('nourriture','transport','logement','famille','ecole','sante','communication','autre')
   or p_currency is null or p_currency !~ '^[A-Z]{3}$' or seneve_private.hd_finance_date_ok(p_date_locale) is not true
   or (note is not null and char_length(note)>140) then raise exception 'Dépense invalide' using errcode='22023';end if;
 if p_amount is null or p_amount<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_amount) is not true then raise exception 'Montant invalide' using errcode='22023';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Identifiant de saisie requis' using errcode='22023';end if;
 select * into e from seneve.hd_finance_expenses where expense_id=p_request_id;
 if found then
  if e.enrollment_id<>enrollment then raise exception 'Identifiant de saisie déjà utilisé' using errcode='22023';end if;
  return jsonb_build_object('expense_id',e.expense_id,'liee',e.move_id is not null,'balance',seneve_private.hd_finance_envelope_balance(enrollment,'vivre',e.currency)::text);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-finance-env|'||enrollment::text||'|vivre|'||p_currency,0));
 dispo:=coalesce(seneve_private.hd_finance_envelope_dispo_au(enrollment,'vivre',p_currency,p_date_locale),0);
 if dispo>=p_amount then
  mouvement:=gen_random_uuid();
  insert into seneve.hd_finance_envelope_moves(move_id,enrollment_id,envelope,direction,motif,amount,currency,date_locale,remise_a_zero)
  values(mouvement,enrollment,'vivre','sortie','depense',p_amount,p_currency,p_date_locale,false);
 end if;
 insert into seneve.hd_finance_expenses(expense_id,enrollment_id,category,amount,currency,date_locale,note,move_id)
 values(p_request_id,enrollment,p_category,p_amount,p_currency,p_date_locale,note,mouvement) returning * into e;
 return jsonb_build_object('expense_id',e.expense_id,'liee',e.move_id is not null,'balance',seneve_private.hd_finance_envelope_balance(enrollment,'vivre',e.currency)::text);
end$$;

create or replace function seneve_private.hd_finance_expenses_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare enrollment uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Suivi financier non accessible' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('expense_id',e.expense_id,'category',e.category,'amount',e.amount::text,'currency',e.currency,
   'date_locale',e.date_locale,'note',e.note,'liee',e.move_id is not null,'created_at',e.created_at) order by e.date_locale desc,e.created_at desc),'[]'::jsonb)
  from seneve.hd_finance_expenses e where e.enrollment_id=enrollment and e.voided_at is null);
end$$;

create or replace function seneve_private.hd_finance_expense_void(p_enrollment_id uuid,p_expense_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare enrollment uuid;e seneve.hd_finance_expenses%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 select * into e from seneve.hd_finance_expenses where expense_id=p_expense_id and enrollment_id=enrollment for update;
 if not found then raise exception 'Dépense introuvable' using errcode='22023';end if;
 if e.voided_at is not null then return jsonb_build_object('expense_id',e.expense_id,'annulee',true);end if;
 update seneve.hd_finance_expenses set voided_at=clock_timestamp(),move_id=null where expense_id=e.expense_id;
 if e.move_id is not null then
  delete from seneve.hd_finance_bilan_masques where ligne_id=e.move_id and enrollment_id=enrollment;
  delete from seneve.hd_finance_envelope_moves where move_id=e.move_id and enrollment_id=enrollment and direction='sortie' and envelope='vivre';
 end if;
 return jsonb_build_object('expense_id',e.expense_id,'annulee',true);
end$$;

-- Même modèle que les compteurs existants : exécutable par les comptes connectés uniquement, contrôle d'accès à l'intérieur.
revoke all on function seneve_private.hd_finance_expense_add(uuid,text,numeric,text,date,text,uuid) from public, anon;
revoke all on function seneve_private.hd_finance_expenses_get(uuid) from public, anon;
revoke all on function seneve_private.hd_finance_expense_void(uuid,uuid) from public, anon;
grant execute on function seneve_private.hd_finance_expense_add(uuid,text,numeric,text,date,text,uuid) to authenticated;
grant execute on function seneve_private.hd_finance_expenses_get(uuid) to authenticated;
grant execute on function seneve_private.hd_finance_expense_void(uuid,uuid) to authenticated;

create or replace function seneve.hd_finance_expense_add(p_enrollment_id uuid,p_category text,p_amount numeric,p_currency text,p_date_locale date,p_note text,p_request_id uuid)
returns jsonb language sql set search_path to '' as $$select seneve_private.hd_finance_expense_add(p_enrollment_id,p_category,p_amount,p_currency,p_date_locale,p_note,p_request_id)$$;
create or replace function seneve.hd_finance_expenses_get(p_enrollment_id uuid)
returns jsonb language sql stable set search_path to '' as $$select seneve_private.hd_finance_expenses_get(p_enrollment_id)$$;
create or replace function seneve.hd_finance_expense_void(p_enrollment_id uuid,p_expense_id uuid)
returns jsonb language sql set search_path to '' as $$select seneve_private.hd_finance_expense_void(p_enrollment_id,p_expense_id)$$;
revoke all on function seneve.hd_finance_expense_add(uuid,text,numeric,text,date,text,uuid) from public, anon;
revoke all on function seneve.hd_finance_expenses_get(uuid) from public, anon;
revoke all on function seneve.hd_finance_expense_void(uuid,uuid) from public, anon;
grant execute on function seneve.hd_finance_expense_add(uuid,text,numeric,text,date,text,uuid) to authenticated;
grant execute on function seneve.hd_finance_expenses_get(uuid) to authenticated;
grant execute on function seneve.hd_finance_expense_void(uuid,uuid) to authenticated;
