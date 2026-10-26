-- TEST seulement. Préparation aujourd'hui/demain pour le seul pilote. Aucun cron ni envoi.
create function seneve_private.hd_expected_push_slots(p_enrollment_id uuid,p_date date)
returns table(activity_id uuid,creneau timestamptz)language plpgsql stable security definer set search_path='' as $$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;cfg seneve.hd_delivery_preferences%rowtype;accord boolean;
begin
 select *into e from seneve.enrollments where enrollment_id=p_enrollment_id and etat='active'and participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id);
 if not found then return;end if;
 select *into l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 if not found then return;end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
 select *into cfg from seneve.hd_delivery_preferences where participant_id=e.participant_id;
 if not found or not cfg.actif or not('push'=any(cfg.canaux))or cfg.fuseau is distinct from z or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then return;end if;
 select bool_and(c.etat='accorde'and c.preuve is not null and c.version_texte is not null)into accord from seneve.consents c where c.participant_id=e.participant_id and c.canal='push'and c.finalite='rappels'and c.decide_le=(select max(d.decide_le)from seneve.consents d where d.participant_id=e.participant_id and d.canal='push'and d.finalite='rappels'and d.decide_le<=now());
 if not coalesce(accord,false)or not exists(select 1 from seneve.push_appareils where participant_id=e.participant_id)then return;end if;
 return query
 with modeles as(select t.*from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue),
 pers as(select s.*from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.valide_du<=p_date and(s.valide_au is null or s.valide_au>=p_date)),
 rdv as(select s.habit_key,s.creneau_id,s.heure_locale from pers s where s.fuseau=z and extract(isodow from p_date)::smallint=any(s.jours_iso)
 union all select t.habit_key,'proposition',t.heure_proposee from modeles t where t.heure_proposee is not null and extract(isodow from p_date)::smallint=any(t.jours_iso)and not exists(select 1 from pers s where s.habit_key=t.habit_key)),
 rangs as(select r.*,row_number()over(partition by r.habit_key order by r.heure_locale,r.creneau_id)rang,count(*)over(partition by r.habit_key)n from rdv r),
 slots as(select a.activity_id aid,(p_date+r.heure_locale)at time zone z instant,r.heure_locale from rangs r join seneve.contents c on c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and seneve.hd_date_du_jour(e.enrollment_id,c.jour)=p_date
 join seneve.activities a on a.content_id=c.content_id and a.type_activite='action'and(
 (a.note_source='RECETTE_HD_QUOTIDIEN_V1:'||r.habit_key and r.n=1 and r.habit_key not like 'culte_%')or
 (a.note_source='RECETTE_HD_CULTE_V1:'||r.habit_key||':'||r.rang and r.habit_key like 'culte_%')))
 select distinct s.aid,s.instant from slots s where seneve.hd_droit_a(e.enrollment_id,s.instant)
 and(s.instant at time zone z)::time=s.heure_locale
 and not exists(select 1 from seneve.activity_state st where st.enrollment_id=e.enrollment_id and st.activity_id=s.aid and st.etat='realisee');
end$$;
revoke all on function seneve_private.hd_expected_push_slots(uuid,date)from public,anon,authenticated,service_role;

create function seneve_private.hd_push_slot_expected(p_reminder_id uuid)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from seneve.hd_activity_reminders r join seneve.enrollments e using(enrollment_id)join seneve.participants p using(participant_id)
 cross join lateral seneve_private.hd_expected_push_slots(r.enrollment_id,(r.creneau at time zone coalesce(p.preferences#>>'{rappels,fuseau}',p.fuseau))::date)x
 where r.reminder_id=p_reminder_id and r.canal='push'and x.activity_id=r.activity_id and x.creneau=r.creneau)
$$;
revoke all on function seneve_private.hd_push_slot_expected(uuid)from public,anon,authenticated,service_role;

create function seneve_private.hd_prepare_push_day(p_enrollment_id uuid,p_date date)returns jsonb language plpgsql security definer set search_path=''as $$
declare e seneve.enrollments%rowtype;z text;t record;crees int;annules int;retard int;slots jsonb;
begin
 select *into e from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id);
 if not found then raise exception 'Inscription hors pilote'using errcode='42501';end if;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 if p_date is null or p_date not in((now()at time zone z)::date,(now()at time zone z)::date+1)then raise exception 'Aujourd’hui ou demain uniquement'using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hd-plan|'||e.enrollment_id||'|'||p_date,0));
 -- Tous les verrous d'activité sont pris avant les modifications de lignes : même ordre que l'annulation.
 for t in select a.activity_id from seneve.activities a join seneve.contents c using(content_id)where c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and seneve.hd_date_du_jour(e.enrollment_id,c.jour)=p_date order by a.activity_id loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(e.enrollment_id::text||'|'||t.activity_id::text,0));
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('activity_id',x.activity_id,'creneau',x.creneau)),'[]'::jsonb)into slots from seneve_private.hd_expected_push_slots(e.enrollment_id,p_date)x;
 select max_retard_minutes into retard from seneve.hd_delivery_preferences where participant_id=e.participant_id;
 update seneve.hd_activity_reminders r set etat='annule',motif='planning_actualise_ou_depasse',modifie_le=now()where r.enrollment_id=e.enrollment_id and r.canal='push'and r.etat='planifie'and(r.creneau at time zone z)::date=p_date and(
 r.creneau<clock_timestamp()-make_interval(mins=>coalesce(retard,1))or not exists(select 1 from jsonb_to_recordset(slots)as x(activity_id uuid,creneau timestamptz) where x.activity_id=r.activity_id and x.creneau=r.creneau));
 get diagnostics annules=row_count;
 insert into seneve.hd_activity_reminders(enrollment_id,activity_id,canal,creneau)
 select e.enrollment_id,x.activity_id,'push',x.creneau from jsonb_to_recordset(slots)as x(activity_id uuid,creneau timestamptz) where x.creneau>=clock_timestamp()
 and not exists(select 1 from seneve.hd_activity_reminders r join seneve.hd_reminder_reservations a using(reminder_id)where r.enrollment_id=e.enrollment_id and r.activity_id=x.activity_id and r.canal='push')on conflict do nothing;
 get diagnostics crees=row_count;
 return jsonb_build_object('crees',crees,'annules',annules);
end$$;
revoke all on function seneve_private.hd_prepare_push_day(uuid,date)from public,anon,authenticated,service_role;

create function seneve_private.hd_prepare_push_pilot()returns jsonb language plpgsql security definer set search_path=''as $$
declare eid uuid;z text;j date;a jsonb;b jsonb;
begin
 select e.enrollment_id,coalesce(p.preferences#>>'{rappels,fuseau}',p.fuseau)into eid,z from seneve.enrollments e join seneve.participants p using(participant_id)join seneve.hd_programme_links l on l.programme_id=e.programme_id and l.version=e.version and l.langue=e.langue and l.actif
 where e.participant_id=(select participant_pilote from seneve_private.hd_push_dispatch_config where id)and e.etat='active'
 order by (e.programme_id='HABITUDES_DEFIS_30J_FR_V1')desc,e.date_debut desc,e.enrollment_id desc limit 1;
 if eid is null then return jsonb_build_object('prepare',false);end if;
 j:=(now()at time zone z)::date;a:=seneve_private.hd_prepare_push_day(eid,j);b:=seneve_private.hd_prepare_push_day(eid,j+1);
 return jsonb_build_object('prepare',true,'crees',(a->>'crees')::int+(b->>'crees')::int,'annules',(a->>'annules')::int+(b->>'annules')::int);
end$$;
revoke all on function seneve_private.hd_prepare_push_pilot()from public,anon,authenticated,service_role;
create function seneve.hd_prepare_push_pilot()returns jsonb language sql security invoker set search_path=''as $$select seneve_private.hd_prepare_push_pilot()$$;
revoke all on function seneve.hd_prepare_push_pilot()from public,anon,authenticated,service_role;
grant execute on function seneve_private.hd_prepare_push_pilot(),seneve.hd_prepare_push_pilot()to service_role;

-- Refuser un ancien créneau même si le participant n'a pas rouvert son application.
do $$declare d text;old text;begin
 d:=pg_get_functiondef('seneve_private.hd_authorize_push_delivery(uuid,uuid)'::regprocedure);
 old:='if not coalesce((j->>''eligible_interne'')::boolean,false)then';
 if strpos(d,old)=0 then raise exception 'Garde d’autorisation inattendue';end if;
 execute replace(d,old,'if not coalesce((j->>''eligible_interne'')::boolean,false)or not seneve_private.hd_push_slot_expected(p_reminder_id)then');
 d:=pg_get_functiondef('seneve_private.hd_push_delivery_allowed(uuid,uuid)'::regprocedure);
 old:='and coalesce((seneve.hd_reminder_precheck(p_reminder_id)->>''eligible_interne'')::boolean,false)';
 if strpos(d,old)=0 then raise exception 'Contrôle final inattendu';end if;
 execute replace(d,old,old||'and seneve_private.hd_push_slot_expected(p_reminder_id)');
end$$;
