-- Additive private tracking only: no automatic cash movement or income allocation.
create table seneve.hd_finance_receivables (
 loan_id uuid primary key, enrollment_id uuid not null references seneve.enrollments on delete cascade,
 borrower text not null check(length(btrim(borrower)) between 1 and 80 and borrower !~ '[[:cntrl:]]'),
 amount numeric(12,2) not null check(amount>0), currency text not null,
 loan_date date not null, due_date date check(due_date>=loan_date), created_at timestamptz not null default now(),
 check(seneve_private.hd_finance_amount_fits(currency,amount))
);
create table seneve.hd_finance_receivable_payments (
 payment_id uuid primary key, loan_id uuid not null references seneve.hd_finance_receivables on delete cascade,
 amount numeric(12,2) not null check(amount>0), payment_date date not null, created_at timestamptz not null default now()
);
create index on seneve.hd_finance_receivables(enrollment_id);
create index on seneve.hd_finance_receivable_payments(loan_id);
alter table seneve.hd_finance_receivables enable row level security;
alter table seneve.hd_finance_receivable_payments enable row level security;
revoke all on seneve.hd_finance_receivables,seneve.hd_finance_receivable_payments from public,anon,authenticated,service_role;
create function seneve_private.hd_finance_receivables_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 return jsonb_build_object('enrollment_id',e,'loans',coalesce((select jsonb_agg(jsonb_build_object(
 'loan_id',l.loan_id,'borrower',l.borrower,'amount',l.amount::text,'currency',l.currency,'loan_date',l.loan_date,'due_date',l.due_date,
 'payments',coalesce((select jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'payment_date',p.payment_date) order by p.payment_date,p.created_at) from seneve.hd_finance_receivable_payments p where p.loan_id=l.loan_id),'[]'::jsonb)) order by l.loan_date desc,l.created_at desc) from seneve.hd_finance_receivables l where l.enrollment_id=e),'[]'::jsonb));
end $$;
create function seneve_private.hd_finance_receivable_add(p_enrollment_id uuid,p_request_id uuid,p_borrower text,p_amount numeric,p_currency text,p_loan_date date,p_due_date date)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid;l seneve.hd_finance_receivables%rowtype;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null or p_enrollment_id is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 if p_request_id is null or p_borrower is null or length(btrim(p_borrower)) not between 1 and 80 or p_borrower ~ '[[:cntrl:]]' or p_amount is null or p_amount<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_amount) is not true or p_loan_date is null or p_loan_date>current_date or (p_due_date is not null and p_due_date<p_loan_date) then raise exception 'Prêt invalide' using errcode='22023';end if;
 insert into seneve.hd_finance_receivables values(p_request_id,e,btrim(p_borrower),p_amount,p_currency,p_loan_date,p_due_date,now()) on conflict do nothing;
 select * into l from seneve.hd_finance_receivables where loan_id=p_request_id;
 if l.enrollment_id is distinct from e or l.borrower is distinct from btrim(p_borrower) or l.amount is distinct from p_amount or l.currency is distinct from p_currency or l.loan_date is distinct from p_loan_date or l.due_date is distinct from p_due_date then raise exception 'Saisie déjà utilisée' using errcode='22023';end if;
 return jsonb_build_object('loan_id',l.loan_id);
end $$;
create function seneve_private.hd_finance_receivable_payment_add(p_enrollment_id uuid,p_loan_id uuid,p_request_id uuid,p_amount numeric,p_payment_date date)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid;l seneve.hd_finance_receivables%rowtype;p seneve.hd_finance_receivable_payments%rowtype;r numeric;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null or p_enrollment_id is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 select * into l from seneve.hd_finance_receivables where loan_id=p_loan_id and enrollment_id=e for update;
 if not found then raise exception 'Prêt inaccessible' using errcode='42501';end if;
 if p_request_id is null or p_amount is null or p_amount<=0 or seneve_private.hd_finance_amount_fits(l.currency,p_amount) is not true or p_payment_date is null or p_payment_date<l.loan_date or p_payment_date>current_date then raise exception 'Remboursement invalide' using errcode='22023';end if;
 select * into p from seneve.hd_finance_receivable_payments where payment_id=p_request_id;
 if found then
 if p.loan_id<>l.loan_id or p.amount<>p_amount or p.payment_date<>p_payment_date then raise exception 'Saisie déjà utilisée' using errcode='22023';end if;
 else
 select l.amount-coalesce(sum(amount),0) into r from seneve.hd_finance_receivable_payments where loan_id=l.loan_id;
 if p_amount>r then raise exception 'Le remboursement dépasse le solde restant' using errcode='22023';end if;
 insert into seneve.hd_finance_receivable_payments values(p_request_id,l.loan_id,p_amount,p_payment_date,now());
 end if;
 return jsonb_build_object('payment_id',p_request_id);
end $$;
create function seneve.hd_finance_receivables_get(p_enrollment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivables_get(p_enrollment_id)$$;
create function seneve.hd_finance_receivable_add(p_enrollment_id uuid,p_request_id uuid,p_borrower text,p_amount numeric,p_currency text,p_loan_date date,p_due_date date) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivable_add(p_enrollment_id,p_request_id,p_borrower,p_amount,p_currency,p_loan_date,p_due_date)$$;
create function seneve.hd_finance_receivable_payment_add(p_enrollment_id uuid,p_loan_id uuid,p_request_id uuid,p_amount numeric,p_payment_date date) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivable_payment_add(p_enrollment_id,p_loan_id,p_request_id,p_amount,p_payment_date)$$;
revoke all on function seneve_private.hd_finance_receivables_get(uuid),seneve_private.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve_private.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date),seneve.hd_finance_receivables_get(uuid),seneve.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date) from public,anon,authenticated,service_role;
grant execute on function seneve_private.hd_finance_receivables_get(uuid),seneve_private.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve_private.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date),seneve.hd_finance_receivables_get(uuid),seneve.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date),seneve.hd_finance_receivable_payment_add(uuid,uuid,uuid,numeric,date) to authenticated;
notify pgrst,'reload schema';
