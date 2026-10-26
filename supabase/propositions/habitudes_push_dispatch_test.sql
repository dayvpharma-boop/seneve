-- Déploiement TEST seulement. Pas de cron, aucun envoi, interrupteur fermé.
create table seneve_private.hd_push_dispatch_config(id boolean primary key default true check(id),actif boolean not null default false,participant_pilote uuid references seneve.participants(participant_id));
insert into seneve_private.hd_push_dispatch_config(id,actif)values(true,false);
create table seneve_private.hd_push_delivery_attempts(
 reminder_id uuid primary key references seneve.hd_activity_reminders(reminder_id),
 request_id uuid not null unique,
 etat text not null check(etat in('reserve','autorise','bloque','accepte','echec')),
 cree_le timestamptz not null default clock_timestamp(),termine_le timestamptz
);
alter table seneve_private.hd_push_dispatch_config enable row level security;
alter table seneve_private.hd_push_delivery_attempts enable row level security;
revoke all on seneve_private.hd_push_dispatch_config,seneve_private.hd_push_delivery_attempts from public,anon,authenticated,service_role;

create function seneve_private.hd_push_dispatch_enabled()returns boolean language sql stable security definer set search_path='' as $$select coalesce((select actif and participant_pilote is not null from seneve_private.hd_push_dispatch_config where id),false)$$;
create function seneve_private.hd_claim_push_deliveries(p_limite integer default 10)returns jsonb language plpgsql security definer set search_path='' as $$
declare r record;req uuid;j jsonb;v_result jsonb:='[]';n int:=0;
begin
 if not seneve_private.hd_push_dispatch_enabled()then return v_result;end if;
 if p_limite is null or p_limite<1 or p_limite>25 then raise exception 'Limite invalide'using errcode='22023';end if;
 for r in select reminder_id from seneve.hd_activity_reminders x where x.etat='planifie'and x.canal='push'and x.creneau<=now()and x.enrollment_id in(select e.enrollment_id from seneve.enrollments e where e.participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id))and not exists(select 1 from seneve.hd_reminder_reservations a where a.reminder_id=x.reminder_id)order by x.creneau,x.reminder_id limit 250 loop
  req:=gen_random_uuid();j:=seneve.hd_reserve_reminder(r.reminder_id,req);
  if coalesce((j->>'reserve')::boolean,false)then
   insert into seneve_private.hd_push_delivery_attempts(reminder_id,request_id,etat)values(r.reminder_id,req,'reserve')on conflict do nothing;
   if found then v_result:=v_result||jsonb_build_array(jsonb_build_object('reminder_id',r.reminder_id,'request_id',req));n:=n+1;end if;
  end if;
  exit when n>=p_limite;
 end loop;
 return v_result;
end$$;
create function seneve_private.hd_authorize_push_delivery(p_reminder_id uuid,p_request_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r seneve.hd_activity_reminders%rowtype;a seneve_private.hd_push_delivery_attempts%rowtype;j jsonb;devices jsonb;lang text;
begin
 if not seneve_private.hd_push_dispatch_enabled()then return jsonb_build_object('autorise',false);end if;
 select *into r from seneve.hd_activity_reminders where reminder_id=p_reminder_id;
 if not found or not exists(select 1 from seneve.enrollments e where e.enrollment_id=r.enrollment_id and e.participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id))then return jsonb_build_object('autorise',false);end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.enrollment_id::text||'|'||r.activity_id::text,0));
 select *into a from seneve_private.hd_push_delivery_attempts where reminder_id=p_reminder_id and request_id=p_request_id for update;
 if not found or a.etat<>'reserve'then return jsonb_build_object('autorise',false);end if;
 j:=seneve.hd_reminder_precheck(p_reminder_id);
 if not coalesce((j->>'eligible_interne')::boolean,false)then
  update seneve_private.hd_push_delivery_attempts set etat='bloque',termine_le=clock_timestamp()where reminder_id=p_reminder_id;
  return jsonb_build_object('autorise',false);
 end if;
 select e.langue,(select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth))from seneve.push_appareils p where p.participant_id=e.participant_id)into lang,devices from seneve.enrollments e where e.enrollment_id=r.enrollment_id;
 if devices is null then return jsonb_build_object('autorise',false);end if;
 update seneve_private.hd_push_delivery_attempts set etat='autorise'where reminder_id=p_reminder_id;
 return jsonb_build_object('autorise',true,'langue',lang,'appareils',devices);
end$$;
create function seneve_private.hd_push_delivery_allowed(p_reminder_id uuid,p_request_id uuid)returns boolean language sql stable security definer set search_path='' as $$
 select seneve_private.hd_push_dispatch_enabled()and exists(select 1 from seneve.hd_activity_reminders r join seneve.enrollments e using(enrollment_id) where r.reminder_id=p_reminder_id and e.participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id))and exists(select 1 from seneve_private.hd_push_delivery_attempts a where a.reminder_id=p_reminder_id and a.request_id=p_request_id and a.etat='autorise')and coalesce((seneve.hd_reminder_precheck(p_reminder_id)->>'eligible_interne')::boolean,false)
$$;
create function seneve_private.hd_finish_push_delivery(p_reminder_id uuid,p_request_id uuid,p_accepte boolean)returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_accepte is null then return false;end if;
 update seneve_private.hd_push_delivery_attempts set etat=case when p_accepte then 'accepte'else 'echec'end,termine_le=clock_timestamp()where reminder_id=p_reminder_id and request_id=p_request_id and etat='autorise';
 if not found then return false;end if;
 update seneve.hd_activity_reminders set etat=case when p_accepte then 'accepte'else etat end,motif=case when p_accepte then 'push_accepte_fournisseur'else 'push_echec_sans_rejeu'end,modifie_le=now()where reminder_id=p_reminder_id and etat='planifie';
 return true;
end$$;

create function seneve.hd_push_dispatch_enabled()returns boolean language sql security invoker set search_path='' as $$select seneve_private.hd_push_dispatch_enabled()$$;
create function seneve.hd_claim_push_deliveries(p_limite integer default 10)returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_claim_push_deliveries(p_limite)$$;
create function seneve.hd_authorize_push_delivery(p_reminder_id uuid,p_request_id uuid)returns jsonb language sql security invoker set search_path='' as $$select seneve_private.hd_authorize_push_delivery(p_reminder_id,p_request_id)$$;
create function seneve.hd_push_delivery_allowed(p_reminder_id uuid,p_request_id uuid)returns boolean language sql security invoker set search_path='' as $$select seneve_private.hd_push_delivery_allowed(p_reminder_id,p_request_id)$$;
create function seneve.hd_finish_push_delivery(p_reminder_id uuid,p_request_id uuid,p_accepte boolean)returns boolean language sql security invoker set search_path='' as $$select seneve_private.hd_finish_push_delivery(p_reminder_id,p_request_id,p_accepte)$$;
do $$declare s text;sig text;begin
 foreach s in array array['seneve','seneve_private']loop
  foreach sig in array array['hd_push_dispatch_enabled()','hd_claim_push_deliveries(integer)','hd_authorize_push_delivery(uuid,uuid)','hd_push_delivery_allowed(uuid,uuid)','hd_finish_push_delivery(uuid,uuid,boolean)']loop
   execute 'revoke all on function '||s||'.'||sig||' from public,anon,authenticated,service_role';
   execute 'grant execute on function '||s||'.'||sig||' to service_role';
  end loop;
 end loop;
end$$;
grant usage on schema seneve_private to service_role;
