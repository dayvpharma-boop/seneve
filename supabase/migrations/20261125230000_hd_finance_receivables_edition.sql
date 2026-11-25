-- SÉNEVÉ Prêts : motif facultatif, correction et suppression d'un prêt ou d'un remboursement.
-- Additif : aucune donnée existante n'est modifiée ; l'ancienne lecture reste compatible (champ « note » en plus).
alter table seneve.hd_finance_receivables add column if not exists note text check(note is null or (length(btrim(note)) between 1 and 80 and note !~ '[[:cntrl:]]'));

create or replace function seneve_private.hd_finance_receivables_get(p_enrollment_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 return jsonb_build_object('enrollment_id',e,'loans',coalesce((select jsonb_agg(jsonb_build_object(
 'loan_id',l.loan_id,'borrower',l.borrower,'amount',l.amount::text,'currency',l.currency,'loan_date',l.loan_date,'due_date',l.due_date,'note',l.note,
 'payments',coalesce((select jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'amount',p.amount::text,'payment_date',p.payment_date) order by p.payment_date,p.created_at) from seneve.hd_finance_receivable_payments p where p.loan_id=l.loan_id),'[]'::jsonb)) order by l.loan_date desc,l.created_at desc) from seneve.hd_finance_receivables l where l.enrollment_id=e),'[]'::jsonb));
end $$;

-- Crée le prêt (identifiant neuf) ou le corrige (identifiant existant du même compte). Rejouable sans doublon.
create function seneve_private.hd_finance_receivable_save(p_enrollment_id uuid,p_loan_id uuid,p_borrower text,p_amount numeric,p_currency text,p_loan_date date,p_due_date date,p_note text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid;l seneve.hd_finance_receivables%rowtype;paye numeric;premier date;n text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null or p_enrollment_id is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 if p_loan_id is null or p_borrower is null or length(btrim(p_borrower)) not between 1 and 80 or p_borrower ~ '[[:cntrl:]]' or p_amount is null or p_amount<=0 or seneve_private.hd_finance_amount_fits(p_currency,p_amount) is not true or p_loan_date is null or p_loan_date>current_date or (p_due_date is not null and p_due_date<p_loan_date) or (n is not null and (length(n)>80 or n ~ '[[:cntrl:]]')) then raise exception 'Prêt invalide' using errcode='22023';end if;
 select * into l from seneve.hd_finance_receivables where loan_id=p_loan_id for update;
 if not found then
  insert into seneve.hd_finance_receivables(loan_id,enrollment_id,borrower,amount,currency,loan_date,due_date,created_at,note) values(p_loan_id,e,btrim(p_borrower),p_amount,p_currency,p_loan_date,p_due_date,now(),n);
 else
  if l.enrollment_id<>e then raise exception 'Prêt inaccessible' using errcode='42501';end if;
  select coalesce(sum(amount),0),min(payment_date) into paye,premier from seneve.hd_finance_receivable_payments where loan_id=l.loan_id;
  if paye>0 and p_currency<>l.currency then raise exception 'Devise verrouillée par les remboursements' using errcode='22023';end if;
  if p_amount<paye then raise exception 'Montant inférieur aux remboursements reçus' using errcode='22023';end if;
  if premier is not null and p_loan_date>premier then raise exception 'Date après un remboursement' using errcode='22023';end if;
  update seneve.hd_finance_receivables set borrower=btrim(p_borrower),amount=p_amount,currency=p_currency,loan_date=p_loan_date,due_date=p_due_date,note=n where loan_id=l.loan_id;
 end if;
 return jsonb_build_object('loan_id',p_loan_id);
end $$;

create function seneve_private.hd_finance_receivable_delete(p_enrollment_id uuid,p_loan_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null or p_enrollment_id is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 delete from seneve.hd_finance_receivables where loan_id=p_loan_id and enrollment_id=e;
 if not found and exists(select 1 from seneve.hd_finance_receivables where loan_id=p_loan_id) then raise exception 'Prêt inaccessible' using errcode='42501';end if;
 return jsonb_build_object('loan_id',p_loan_id);
end $$;

create function seneve_private.hd_finance_receivable_payment_delete(p_enrollment_id uuid,p_payment_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare e uuid;
begin
 if auth.uid() is null then raise exception 'Compte requis' using errcode='42501';end if;
 e:=seneve_private.hd_finance_enrollment(p_enrollment_id);
 if e is null or p_enrollment_id is null then raise exception 'Accès financier requis' using errcode='42501';end if;
 delete from seneve.hd_finance_receivable_payments p using seneve.hd_finance_receivables l where p.payment_id=p_payment_id and p.loan_id=l.loan_id and l.enrollment_id=e;
 if not found and exists(select 1 from seneve.hd_finance_receivable_payments where payment_id=p_payment_id) then raise exception 'Remboursement inaccessible' using errcode='42501';end if;
 return jsonb_build_object('payment_id',p_payment_id);
end $$;

create function seneve.hd_finance_receivable_save(p_enrollment_id uuid,p_loan_id uuid,p_borrower text,p_amount numeric,p_currency text,p_loan_date date,p_due_date date,p_note text) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivable_save(p_enrollment_id,p_loan_id,p_borrower,p_amount,p_currency,p_loan_date,p_due_date,p_note)$$;
create function seneve.hd_finance_receivable_delete(p_enrollment_id uuid,p_loan_id uuid) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivable_delete(p_enrollment_id,p_loan_id)$$;
create function seneve.hd_finance_receivable_payment_delete(p_enrollment_id uuid,p_payment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_finance_receivable_payment_delete(p_enrollment_id,p_payment_id)$$;

revoke all on function seneve_private.hd_finance_receivable_save(uuid,uuid,text,numeric,text,date,date,text),seneve_private.hd_finance_receivable_delete(uuid,uuid),seneve_private.hd_finance_receivable_payment_delete(uuid,uuid),seneve.hd_finance_receivable_save(uuid,uuid,text,numeric,text,date,date,text),seneve.hd_finance_receivable_delete(uuid,uuid),seneve.hd_finance_receivable_payment_delete(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function seneve_private.hd_finance_receivable_save(uuid,uuid,text,numeric,text,date,date,text),seneve_private.hd_finance_receivable_delete(uuid,uuid),seneve_private.hd_finance_receivable_payment_delete(uuid,uuid),seneve.hd_finance_receivable_save(uuid,uuid,text,numeric,text,date,date,text),seneve.hd_finance_receivable_delete(uuid,uuid),seneve.hd_finance_receivable_payment_delete(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
