-- Run only on seneve-test. All fixtures and temporary rights are rolled back.
begin;
create or replace function seneve.hd_has_current_right(p_enrollment_id uuid) returns boolean language sql stable set search_path='' as $$select true$$;
do $$
declare e uuid;u uuid;loan uuid:=gen_random_uuid();payment uuid:=gen_random_uuid();j jsonb;
begin
 select x.enrollment_id,p.auth_user_id into e,u from seneve.enrollments x join seneve.participants p on p.participant_id=x.participant_id join seneve.hd_programme_links l on l.programme_id=x.programme_id and l.version=x.version and l.langue=x.langue where l.module_id='HABITUDES_DEFIS' and l.actif and p.auth_user_id is not null limit 1;
 if e is null then raise exception 'Fixture HD manquante';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform seneve.hd_finance_receivable_save(e,loan,'TEST ROLLBACK',100,'USD',current_date-10,null,'  frais d''école ');
 perform seneve.hd_finance_receivable_save(e,loan,'TEST ROLLBACK',100,'USD',current_date-10,null,'frais d''école');
 if (select count(*) from seneve.hd_finance_receivables where loan_id=loan)<>1 then raise exception 'Prêt doublonné';end if;
 if (select note from seneve.hd_finance_receivables where loan_id=loan)<>'frais d''école' then raise exception 'Motif mal enregistré';end if;
 perform seneve.hd_finance_receivable_payment_add(e,loan,payment,30,current_date-5);
 begin perform seneve.hd_finance_receivable_save(e,loan,'TEST ROLLBACK',20,'USD',current_date-10,null,null);raise exception 'Montant sous les remboursements accepté';exception when invalid_parameter_value then null;end;
 begin perform seneve.hd_finance_receivable_save(e,loan,'TEST ROLLBACK',100,'EUR',current_date-10,null,null);raise exception 'Changement de devise accepté';exception when invalid_parameter_value then null;end;
 begin perform seneve.hd_finance_receivable_save(e,loan,'TEST ROLLBACK',100,'USD',current_date-2,null,null);raise exception 'Date après remboursement acceptée';exception when invalid_parameter_value then null;end;
 perform seneve.hd_finance_receivable_save(e,loan,'Nom corrigé',120,'USD',current_date-10,current_date+3,null);
 j:=seneve.hd_finance_receivables_get(e);
 if not exists(select 1 from jsonb_array_elements(j->'loans') x where x->>'loan_id'=loan::text and x->>'borrower'='Nom corrigé' and x->>'amount'='120.00' and x->'note'='null'::jsonb) then raise exception 'Correction non relue';end if;
 perform seneve.hd_finance_receivable_payment_delete(e,payment);
 if exists(select 1 from seneve.hd_finance_receivable_payments where payment_id=payment) then raise exception 'Remboursement non supprimé';end if;
 perform seneve.hd_finance_receivable_payment_add(e,loan,gen_random_uuid(),10,current_date);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform seneve.hd_finance_receivable_delete(e,loan);raise exception 'Suppression autre compte acceptée';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform seneve.hd_finance_receivable_delete(e,loan);
 if exists(select 1 from seneve.hd_finance_receivable_payments p where p.loan_id=loan) or exists(select 1 from seneve.hd_finance_receivables where loan_id=loan) then raise exception 'Suppression incomplète';end if;
 if has_function_privilege('anon','seneve.hd_finance_receivable_save(uuid,uuid,text,numeric,text,date,date,text)','execute') then raise exception 'Écriture anonyme autorisée';end if;
end $$;
rollback;
select 'OK: motif, correction, verrous, suppressions et confidentialité' as resultat;
