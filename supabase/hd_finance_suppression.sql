-- Supprimer une dette ou un objectif (demande de Dr Justin du 07/11/2026).
-- « Supprimer » met de côté (archived_at) : la dette ou l'objectif disparaît des listes, de la répartition et des
-- compteurs, mais son historique reste dans le bilan et il peut revenir (« Annuler »). Aucune donnée n'est effacée.
-- Retour arrière : réappliquer tracker_get de hd_finance_heures.sql et allocation_save de hd_finance_compteurs.sql,
-- puis drop des deux fonctions *_archive ; la colonne archived_at peut rester.
alter table seneve.hd_finance_debt_accounts add column if not exists archived_at timestamptz;

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
  'debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'creditor_name',d.creditor_name,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text,'created_at',d.created_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale,'created_at',p.created_at) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment and d.archived_at is null),
  'archived_goals',(select coalesce(jsonb_agg(jsonb_build_object('goal_id',g.goal_id,'goal_type',g.goal_type,'label',g.label,'target_amount',g.target_amount::text,'currency',g.currency,'created_at',g.created_at,'archived_at',g.archived_at,'entries',(select coalesce(jsonb_agg(jsonb_build_object('entry_id',x.entry_id,'amount',x.amount::text,'date_locale',x.date_locale,'created_at',x.created_at) order by x.date_locale,x.created_at),'[]'::jsonb) from seneve.hd_finance_savings_entries x where x.goal_id=g.goal_id)) order by g.created_at),'[]'::jsonb) from seneve.hd_finance_savings_goals g where g.enrollment_id=enrollment and g.archived_at is not null),
  'archived_debts',(select coalesce(jsonb_agg(jsonb_build_object('debt_id',d.debt_id,'debt_number',d.debt_number,'creditor_name',d.creditor_name,'opening_balance',d.opening_balance::text,'currency',d.currency,'monthly_basis',d.monthly_basis::text,'repayment_percent',d.repayment_percent::text,'weekly_basis',d.weekly_basis::text,'weekly_repayment_percent',d.weekly_repayment_percent::text,'created_at',d.created_at,'archived_at',d.archived_at,'payments',(select coalesce(jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'date_locale',p.date_locale,'created_at',p.created_at) order by p.date_locale,p.created_at),'[]'::jsonb) from seneve.hd_finance_debt_payments p where p.debt_id=d.debt_id)) order by d.debt_number),'[]'::jsonb) from seneve.hd_finance_debt_accounts d where d.enrollment_id=enrollment and d.archived_at is not null));
end$$;

create or replace function seneve_private.hd_finance_allocation_save(p_enrollment_id uuid,p_currency text,p_date_locale date,p_parts jsonb,p_request_id uuid)
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

create function seneve_private.hd_finance_goal_archive(p_enrollment_id uuid,p_goal_id uuid,p_archive boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;g seneve.hd_finance_savings_goals%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 update seneve.hd_finance_savings_goals set archived_at=case when coalesce(p_archive,true) then coalesce(archived_at,now()) else null end
 where goal_id=p_goal_id and enrollment_id=enrollment returning * into g;
 if not found then raise exception 'Objectif d’épargne non accessible' using errcode='42501';end if;
 return jsonb_build_object('goal_id',g.goal_id,'archived_at',g.archived_at);
end$$;

create function seneve_private.hd_finance_debt_archive(p_enrollment_id uuid,p_debt_id uuid,p_archive boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;d seneve.hd_finance_debt_accounts%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if p_enrollment_id is null or enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 update seneve.hd_finance_debt_accounts set archived_at=case when coalesce(p_archive,true) then coalesce(archived_at,now()) else null end
 where debt_id=p_debt_id and enrollment_id=enrollment returning * into d;
 if not found then raise exception 'Dette non accessible' using errcode='42501';end if;
 return jsonb_build_object('debt_id',d.debt_id,'archived_at',d.archived_at);
end$$;

create function seneve.hd_finance_goal_archive(p_enrollment_id uuid,p_goal_id uuid,p_archive boolean) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_goal_archive(p_enrollment_id,p_goal_id,p_archive)$$;
create function seneve.hd_finance_debt_archive(p_enrollment_id uuid,p_debt_id uuid,p_archive boolean) returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_debt_archive(p_enrollment_id,p_debt_id,p_archive)$$;
revoke all on function seneve_private.hd_finance_goal_archive(uuid,uuid,boolean),seneve_private.hd_finance_debt_archive(uuid,uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_goal_archive(uuid,uuid,boolean),seneve.hd_finance_debt_archive(uuid,uuid,boolean) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_goal_archive(uuid,uuid,boolean),seneve_private.hd_finance_debt_archive(uuid,uuid,boolean),seneve.hd_finance_goal_archive(uuid,uuid,boolean),seneve.hd_finance_debt_archive(uuid,uuid,boolean) to authenticated;
