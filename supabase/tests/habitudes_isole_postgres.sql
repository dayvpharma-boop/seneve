-- Maquette de sécurité PostgreSQL, uniquement sur seneve-test.
-- Aucun schéma applicatif, donnée réelle, fonction d'envoi ou paiement utilisé.
-- Le ROLLBACK final annule les objets et données temporaires.
begin;
create temporary table hd_sql_enrollments (
 enrollment_id uuid primary key, auth_uid uuid not null, active boolean not null,
 unique(enrollment_id,auth_uid)
);
create temporary table hd_sql_rights (
 right_id integer primary key, enrollment_id uuid not null, auth_uid uuid not null,
 debut timestamptz not null, fin_exclue timestamptz not null,
 etat text not null check(etat in ('actif','revoque')),
 origine text not null check(origine in ('gratuit_valide','paiement_verifie')),
 foreign key(enrollment_id,auth_uid) references hd_sql_enrollments(enrollment_id,auth_uid),
 check(fin_exclue>debut)
);
create temporary table hd_sql_occurrences (
 occurrence_id text primary key, enrollment_id uuid not null, auth_uid uuid not null,
 foreign key(enrollment_id,auth_uid) references hd_sql_enrollments(enrollment_id,auth_uid)
);
create temporary table hd_sql_states (
 occurrence_id text primary key references hd_sql_occurrences(occurrence_id),
 etat text not null check(etat in ('non_commencee','preparee','partielle','realisee'))
);
create temporary table hd_sql_events (
 client_event_id uuid primary key, occurrence_id text not null references hd_sql_occurrences(occurrence_id)
);
create temporary table hd_sql_reminders (
 occurrence_id text not null references hd_sql_occurrences(occurrence_id),
 canal text not null, creneau timestamptz not null, etat text not null default 'planifie',
 unique(occurrence_id,canal,creneau)
);
insert into hd_sql_enrollments values
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',true),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022',true),
 ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011',true);
insert into hd_sql_rights values
 (1,'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',now()-interval '1 hour',now()+interval '1 hour','actif','gratuit_valide'),
 (2,'00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022',now()-interval '1 hour',now()+interval '1 hour','actif','paiement_verifie'),
 (3,'00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011',now()-interval '2 hours',now(),'actif','paiement_verifie');
insert into hd_sql_occurrences values
 ('a_matin','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011'),
 ('a_midi','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011'),
 ('b_matin','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022'),
 ('a_expire','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011');
alter table hd_sql_enrollments enable row level security;
alter table hd_sql_rights enable row level security;
alter table hd_sql_occurrences enable row level security;
alter table hd_sql_states enable row level security;
alter table hd_sql_events enable row level security;
create policy owner_enrollments on hd_sql_enrollments for select to authenticated using(auth_uid=(select auth.uid()));
create policy owner_rights on hd_sql_rights for select to authenticated using(auth_uid=(select auth.uid()));
create policy occurrence_access on hd_sql_occurrences for select to authenticated using(
 auth_uid=(select auth.uid()) and exists(
  select 1 from hd_sql_enrollments e join hd_sql_rights d using(enrollment_id,auth_uid)
  where e.enrollment_id=hd_sql_occurrences.enrollment_id and e.active and d.etat='actif' and now()>=d.debut and now()<d.fin_exclue));
create policy state_read on hd_sql_states for select to authenticated using(exists(select 1 from hd_sql_occurrences o where o.occurrence_id=hd_sql_states.occurrence_id));
create policy state_write on hd_sql_states for insert to authenticated with check(exists(select 1 from hd_sql_occurrences o where o.occurrence_id=hd_sql_states.occurrence_id));
create policy event_read on hd_sql_events for select to authenticated using(exists(select 1 from hd_sql_occurrences o where o.occurrence_id=hd_sql_events.occurrence_id));
create policy event_write on hd_sql_events for insert to authenticated with check(exists(select 1 from hd_sql_occurrences o where o.occurrence_id=hd_sql_events.occurrence_id));
do $$begin execute format('grant usage on schema %I to authenticated', (select nspname from pg_namespace where oid=pg_my_temp_schema()));end$$;
grant select on hd_sql_enrollments,hd_sql_rights,hd_sql_occurrences,hd_sql_states,hd_sql_events to authenticated;
grant insert on hd_sql_states,hd_sql_events to authenticated;
-- Les JWT suivants sont des identifiants fictifs, sans compte auth réel.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
do $$begin
 if(select count(*) from hd_sql_occurrences)<>2 then raise exception 'Lecture propriétaire ou expiration incorrecte';end if;
 if exists(select 1 from hd_sql_occurrences where occurrence_id='b_matin')then raise exception 'Lecture du compte B autorisée';end if;
 begin insert into hd_sql_states values('b_matin','realisee');raise exception 'Écriture du compte B autorisée';exception when insufficient_privilege then null;end;
 begin insert into hd_sql_states values('a_expire','realisee');raise exception 'Écriture après expiration autorisée';exception when insufficient_privilege then null;end;
 insert into hd_sql_states values('a_matin','preparee'),('a_midi','non_commencee');
 insert into hd_sql_events values('00000000-0000-4000-8000-000000000099','a_matin')on conflict do nothing;
 insert into hd_sql_events values('00000000-0000-4000-8000-000000000099','a_matin')on conflict do nothing;
 if(select count(*) from hd_sql_events)<>1 then raise exception 'Événement doublonné';end if;
end$$;
reset role;
insert into hd_sql_reminders(occurrence_id,canal,creneau)values('a_matin','push',now()),('a_midi','push',now());
-- Une préparation n'annule rien. Puis seule la réalisation du matin l'annule.
update hd_sql_reminders r set etat='annule' where exists(select 1 from hd_sql_states s where s.occurrence_id=r.occurrence_id and s.etat='realisee');
do $$begin if exists(select 1 from hd_sql_reminders where etat<>'planifie')then raise exception 'Rappel annulé par préparation';end if;end$$;
update hd_sql_states set etat='realisee' where occurrence_id='a_matin';
update hd_sql_reminders r set etat='annule' where exists(select 1 from hd_sql_states s where s.occurrence_id=r.occurrence_id and s.etat='realisee');
do $$begin
 if(select etat from hd_sql_reminders where occurrence_id='a_matin')<>'annule' then raise exception 'Matin non annulé';end if;
 if(select etat from hd_sql_reminders where occurrence_id='a_midi')<>'planifie' then raise exception 'Midi annulé à tort';end if;
end$$;
-- Révocation : lecture et nouvelle écriture refusées, historique non supprimé.
update hd_sql_rights set etat='revoque' where right_id=1;
set local role authenticated;
do $$begin
 if exists(select 1 from hd_sql_occurrences)then raise exception 'Accès après révocation';end if;
 begin insert into hd_sql_events values('00000000-0000-4000-8000-000000000098','a_midi');raise exception 'Événement après révocation';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin
 if(select count(*) from hd_sql_states)<>2 then raise exception 'Historique effacé';end if;
end$$;
rollback;
