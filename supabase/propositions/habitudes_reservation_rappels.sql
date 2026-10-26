-- Réservation interne seulement. Aucun fournisseur, expéditeur ou autorisation d'envoi.
create table seneve.hd_reminder_reservations (
 reminder_id uuid primary key references seneve.hd_activity_reminders(reminder_id),
 request_id uuid not null unique,
 reserve_le timestamptz not null default clock_timestamp()
);
alter table seneve.hd_reminder_reservations enable row level security;
revoke all on seneve.hd_reminder_reservations from public,anon,authenticated,service_role;
grant select,insert on seneve.hd_reminder_reservations to service_role;
-- Pas de lecture client ni de reprise automatique après expiration :
-- une réservation incertaine ne doit pas devenir un second envoi.
create function seneve.hd_reserve_reminder(p_reminder_id uuid,p_request_id uuid)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare r seneve.hd_activity_reminders%rowtype; v_request uuid; v_reminder uuid; j jsonb;
begin
 if p_reminder_id is null or p_request_id is null then
  return jsonb_build_object('reserve',false,'autorisation_envoi',false,'motif','identifiants_requis');end if;
 select * into r from seneve.hd_activity_reminders where reminder_id=p_reminder_id;
 if not found then return jsonb_build_object('reserve',false,'autorisation_envoi',false,'motif','rappel_absent');end if;
 -- Même verrou que la création et l'annulation des rappels par activité.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.enrollment_id::text||'|'||r.activity_id::text,0));
 -- Nouvelle lecture du précontrôle après le verrou ; aucun résultat client n'est accepté.
 j:=seneve.hd_reminder_precheck(p_reminder_id);
 if not coalesce((j->>'eligible_interne')::boolean,false)then
  return jsonb_build_object('reserve',false,'autorisation_envoi',false,'motif',j->>'motif');end if;
 insert into seneve.hd_reminder_reservations(reminder_id,request_id)
 values(p_reminder_id,p_request_id)on conflict do nothing;
 -- Les deux contraintes uniques arbitrent aussi deux transactions concurrentes.
 select request_id into v_request from seneve.hd_reminder_reservations where reminder_id=p_reminder_id;
 if v_request=p_request_id then
  return jsonb_build_object('reserve',true,'autorisation_envoi',false,'motif','reservation_interne_sans_envoi');end if;
 select reminder_id into v_reminder from seneve.hd_reminder_reservations where request_id=p_request_id;
 return jsonb_build_object('reserve',false,'autorisation_envoi',false,'motif',case when v_reminder is not null and v_reminder<>p_reminder_id then 'requete_reutilisee_pour_autre_rappel' else 'rappel_deja_reserve' end);
end$$;
revoke all on function seneve.hd_reserve_reminder(uuid,uuid)from public,anon,authenticated;
grant execute on function seneve.hd_reserve_reminder(uuid,uuid)to service_role;
