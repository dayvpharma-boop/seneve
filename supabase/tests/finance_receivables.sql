-- Run only on seneve-test. All fixtures and temporary rights are rolled back.
begin;
create or replace function seneve.hd_has_current_right(p_enrollment_id uuid) returns boolean language sql stable set search_path='' as $$select true$$;
do $$
declare e uuid;u uuid;loan uuid:=gen_random_uuid();payment uuid:=gen_random_uuid();j jsonb;
begin
 select x.enrollment_id,p.auth_user_id into e,u from seneve.enrollments x join seneve.participants p on p.participant_id=x.participant_id join seneve.hd_programme_links l on l.programme_id=x.programme_id and l.version=x.version and l.langue=x.langue where l.module_id='HABITUDES_DEFIS' and l.actif and p.auth_user_id is not null limit 1;
 if e is null then raise exception 'Fixture HD manquante';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform seneve.hd_finance_receivable_add(e,loan,'TEST ROLLBACK',100,'USD',current_date,null);
 perform seneve.hd_finance_receivable_add(e,loan,'TEST ROLLBACK',100,'USD',current_date,null);
 perform seneve.hd_finance_receivable_payment_add(e,loan,payment,30,current_date);
 perform seneve.hd_finance_receivable_payment_add(e,loan,payment,30,current_date);
 if (select count(*) from seneve.hd_finance_receivable_payments where loan_id=loan)<>1 then raise exception 'Paiement doublonné';end if;
 if (select amount from seneve.hd_finance_receivables where loan_id=loan)-(select sum(amount) from seneve.hd_finance_receivable_payments where loan_id=loan)<>70 then raise exception 'Solde incorrect';end if;
 begin perform seneve.hd_finance_receivable_payment_add(e,loan,gen_random_uuid(),71,current_date);raise exception 'Trop-perçu accepté';exception when invalid_parameter_value then null;end;
 perform seneve.hd_finance_receivable_payment_add(e,loan,gen_random_uuid(),70,current_date);
 begin perform seneve.hd_finance_receivable_payment_add(e,loan,gen_random_uuid(),1,current_date);raise exception 'Prêt soldé accepté';exception when invalid_parameter_value then null;end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform seneve.hd_finance_receivables_get(e);raise exception 'Accès autre compte accepté';exception when insufficient_privilege then null;end;
 if has_table_privilege('authenticated','seneve.hd_finance_receivables','select') then raise exception 'Accès direct accordé';end if;
 if has_function_privilege('anon','seneve.hd_finance_receivable_add(uuid,uuid,text,numeric,text,date,date)','execute') then raise exception 'Écriture anonyme autorisée';end if;
end $$;
rollback;
select 'OK: remboursements partiels, doublons, plafond, solde et confidentialité' as resultat;
