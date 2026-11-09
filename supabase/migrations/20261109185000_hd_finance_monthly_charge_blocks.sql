create table if not exists seneve.hd_finance_business_charge_blocks(
 block_id uuid primary key,
 enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
 month_start date not null check(extract(day from month_start)=1),
 created_at timestamptz not null default now(),
 unique(enrollment_id,month_start)
);
alter table seneve.hd_finance_business_charge_blocks enable row level security;
revoke all on seneve.hd_finance_business_charge_blocks from public,anon,authenticated,service_role;
alter table seneve.hd_finance_business_charges add column if not exists block_id uuid;
insert into seneve.hd_finance_business_charge_blocks(block_id,enrollment_id,month_start)
select gen_random_uuid(),c.enrollment_id,date_trunc('month',c.period_start)::date
from seneve.hd_finance_business_charges c
group by c.enrollment_id,date_trunc('month',c.period_start)::date
on conflict(enrollment_id,month_start) do nothing;
update seneve.hd_finance_business_charges c
set block_id=b.block_id from seneve.hd_finance_business_charge_blocks b
where c.block_id is null and b.enrollment_id=c.enrollment_id and b.month_start=date_trunc('month',c.period_start)::date;
alter table seneve.hd_finance_business_charges add constraint hd_finance_business_charges_block_id_fkey foreign key(block_id) references seneve.hd_finance_business_charge_blocks(block_id) on delete cascade;
create index if not exists hd_finance_business_charge_blocks_month_idx on seneve.hd_finance_business_charge_blocks(enrollment_id,month_start desc);

create or replace function seneve_private.hd_finance_business_charge_block_create(p_enrollment_id uuid,p_month_start date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;b seneve.hd_finance_business_charge_blocks%rowtype;mois date;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 mois:=date_trunc('month',(now() at time zone 'Africa/Kinshasa')::date)::date;
 if p_request_id is null or p_month_start is distinct from mois then raise exception 'Le bloc doit concerner le mois en cours' using errcode='22023';end if;
 insert into seneve.hd_finance_business_charge_blocks(block_id,enrollment_id,month_start) values(p_request_id,enrollment,mois)
 on conflict(enrollment_id,month_start) do nothing returning * into b;
 if not found then select * into b from seneve.hd_finance_business_charge_blocks where enrollment_id=enrollment and month_start=mois;end if;
 return jsonb_build_object('block_id',b.block_id,'month_start',b.month_start,'created',b.block_id=p_request_id);
end$$;

create or replace function seneve_private.hd_finance_business_charge_add(p_enrollment_id uuid,p_label text,p_expected_amount numeric,p_currency text,p_period_start date,p_period_end date,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare enrollment uuid;c seneve.hd_finance_business_charges%rowtype;mois date;fin date;b uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 enrollment:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if enrollment is null then raise exception 'Inscription financière non accessible' using errcode='42501';end if;
 mois:=date_trunc('month',(now() at time zone 'Africa/Kinshasa')::date)::date;fin:=(mois+interval '1 month - 1 day')::date;
 if p_request_id is null or p_label is null or char_length(btrim(p_label)) not between 1 and 80
  or p_period_start is distinct from mois or p_period_end is distinct from fin
  or p_expected_amount is null or seneve_private.hd_finance_amount_fits(p_currency,p_expected_amount) is not true then
  raise exception 'Charge invalide : le bloc doit couvrir le mois entier' using errcode='22023';
 end if;
 select block_id into b from seneve.hd_finance_business_charge_blocks where enrollment_id=enrollment and month_start=mois for update;
 if b is null then raise exception 'Crée d’abord le bloc du mois' using errcode='23514';end if;
 insert into seneve.hd_finance_business_charges(charge_id,enrollment_id,block_id,label,expected_amount,currency,period_start,period_end)
 values(p_request_id,enrollment,b,btrim(p_label),p_expected_amount,p_currency,p_period_start,p_period_end)
 on conflict(charge_id) do nothing returning * into c;
 if not found then
  select * into c from seneve.hd_finance_business_charges where charge_id=p_request_id and enrollment_id=enrollment
   and label=btrim(p_label) and expected_amount=p_expected_amount and currency=p_currency
   and period_start=p_period_start and period_end=p_period_end and block_id=b;
  if not found then raise exception 'Identifiant déjà utilisé' using errcode='22023';end if;
 end if;
 return jsonb_build_object('charge_id',c.charge_id,'block_id',c.block_id,'label',c.label,'expected_amount',c.expected_amount::text,'currency',c.currency,'period_start',c.period_start,'period_end',c.period_end);
end$$;
create or replace function seneve.hd_finance_business_charge_block_create(p_enrollment_id uuid,p_month_start date,p_request_id uuid)
returns jsonb language sql volatile security invoker set search_path='' as $$select seneve_private.hd_finance_business_charge_block_create(p_enrollment_id,p_month_start,p_request_id)$$;

revoke all on function seneve_private.hd_finance_business_charge_block_create(uuid,date,uuid) from public,anon,authenticated,service_role;
revoke all on function seneve.hd_finance_business_charge_block_create(uuid,date,uuid) from public,anon,service_role;
grant execute on function seneve_private.hd_finance_business_charge_block_create(uuid,date,uuid) to authenticated;
grant execute on function seneve.hd_finance_business_charge_block_create(uuid,date,uuid) to authenticated;
