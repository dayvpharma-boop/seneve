-- File de rappels HD en TEST. Aucun expéditeur, tâche planifiée ou message créé.
create table seneve.hd_activity_reminders (
 reminder_id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references seneve.enrollments(enrollment_id),
 activity_id uuid not null references seneve.activities(activity_id),
 canal text not null check(canal in ('push','whatsapp','email')),
 creneau timestamptz not null,
 etat text not null default 'planifie' check(etat in ('planifie','annule','accepte')),
 motif text, cree_le timestamptz not null default now(), modifie_le timestamptz not null default now(),
 unique(enrollment_id,activity_id,canal,creneau)
);
create index hd_activity_reminders_activity_idx on seneve.hd_activity_reminders(activity_id);
alter table seneve.hd_activity_reminders enable row level security;
revoke all on seneve.hd_activity_reminders from public,anon,authenticated,service_role;
grant select on seneve.hd_activity_reminders to authenticated;
grant select,insert,update on seneve.hd_activity_reminders to service_role;
grant select on seneve.hd_programme_links,seneve.hd_access_periods to service_role;
create policy hd_reminders_owner_read on seneve.hd_activity_reminders for select to authenticated using(
 enrollment_id in(select enrollment_id from seneve.enrollments where participant_id=(select seneve.current_participant_id())));
create function seneve.hd_validate_activity_reminder() returns trigger language plpgsql security invoker set search_path='' as $$
declare e seneve.enrollments%rowtype; v_jour integer; v_fuseau text;
begin
 select * into e from seneve.enrollments where enrollment_id=new.enrollment_id;
 if not found or e.etat<>'active' then raise exception 'Inscription HD inactive ou inconnue.' using errcode='23514';end if;
 if not exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif)then
  raise exception 'Programme HD non actif.' using errcode='23514';end if;
 select c.jour into v_jour from seneve.activities a join seneve.contents c on c.content_id=a.content_id
  where a.activity_id=new.activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue;
 if not found then
  raise exception 'Activité étrangère à cette inscription.' using errcode='23514';end if;
 select coalesce(p.preferences #>> '{rappels,fuseau}',p.fuseau)into v_fuseau from seneve.participants p where p.participant_id=e.participant_id;
 if(new.creneau at time zone v_fuseau)::date<>e.date_debut+v_jour-1 then raise exception 'Créneau hors journée de cette activité.' using errcode='23514';end if;
 if not exists(select 1 from seneve.hd_access_periods p join seneve.entitlements d on d.entitlement_id=p.entitlement_id
  where p.enrollment_id=e.enrollment_id and p.participant_id=e.participant_id and d.participant_id=e.participant_id
   and d.etat='actif' and d.fin is not null and new.creneau>=p.debut and new.creneau<p.fin_exclue
   and new.creneau>=d.debut and new.creneau<d.fin)then
  raise exception 'Le créneau du rappel ne possède pas de droit.' using errcode='23514';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.enrollment_id::text||'|'||new.activity_id::text,0));
 if exists(select 1 from seneve.activity_state s where s.enrollment_id=new.enrollment_id and s.activity_id=new.activity_id and s.etat='realisee') and new.etat='planifie' then
  new.etat:='annule';new.motif:='activite_deja_realisee';
 end if;
 return new;
end$$;
revoke all on function seneve.hd_validate_activity_reminder() from public,anon,authenticated;
create trigger hd_reminder_validate before insert on seneve.hd_activity_reminders for each row execute function seneve.hd_validate_activity_reminder();
-- Sécurité renforcée : le trigger d'annulation s'exécute après l'état accepté.
-- Pas de texte privé, de token fournisseur ou d'envoi dans ce traitement.
create function seneve.hd_cancel_completed_reminders() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.etat='realisee' then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.enrollment_id::text||'|'||new.activity_id::text,0));
  update seneve.hd_activity_reminders set etat='annule',motif='activite_realisee',modifie_le=now()
   where enrollment_id=new.enrollment_id and activity_id=new.activity_id and etat='planifie';
 end if;
 return new;
end$$;
revoke all on function seneve.hd_cancel_completed_reminders() from public,anon,authenticated;
create trigger hd_cancel_completed_reminders after insert or update on seneve.activity_state for each row execute function seneve.hd_cancel_completed_reminders();
