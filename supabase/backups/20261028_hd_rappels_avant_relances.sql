CREATE OR REPLACE FUNCTION seneve_private.hd_authorize_push_delivery(p_reminder_id uuid, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r seneve.hd_activity_reminders%rowtype;a seneve_private.hd_push_delivery_attempts%rowtype;j jsonb;devices jsonb;lang text;
begin
 if not seneve_private.hd_push_dispatch_enabled()then return jsonb_build_object('autorise',false);end if;
 select *into r from seneve.hd_activity_reminders where reminder_id=p_reminder_id;
 if not found or not exists(select 1 from seneve.enrollments e where e.enrollment_id=r.enrollment_id and seneve_private.hd_push_participant_admis(e.participant_id))then return jsonb_build_object('autorise',false);end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.enrollment_id::text||'|'||r.activity_id::text,0));
 select *into a from seneve_private.hd_push_delivery_attempts where reminder_id=p_reminder_id and request_id=p_request_id for update;
 if not found or a.etat<>'reserve'then return jsonb_build_object('autorise',false);end if;
 j:=seneve.hd_reminder_precheck(p_reminder_id);
 if not coalesce((j->>'eligible_interne')::boolean,false)or not seneve_private.hd_push_slot_expected(p_reminder_id)then
  update seneve_private.hd_push_delivery_attempts set etat='bloque',termine_le=clock_timestamp()where reminder_id=p_reminder_id;
  return jsonb_build_object('autorise',false);
 end if;
 select e.langue,(select jsonb_agg(jsonb_build_object('endpoint',p.endpoint,'p256dh',p.p256dh,'auth',p.auth))from seneve.push_appareils p where p.participant_id=e.participant_id)into lang,devices from seneve.enrollments e where e.enrollment_id=r.enrollment_id;
 if devices is null then return jsonb_build_object('autorise',false);end if;
 update seneve_private.hd_push_delivery_attempts set etat='autorise'where reminder_id=p_reminder_id;
 return jsonb_build_object('autorise',true,'langue',lang,'appareils',devices);
end$function$;

CREATE OR REPLACE FUNCTION seneve_private.hd_expected_push_slots(p_enrollment_id uuid, p_date date)
 RETURNS TABLE(activity_id uuid, creneau timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;cfg seneve.hd_delivery_preferences%rowtype;accord boolean;
begin
 select *into e from seneve.enrollments where enrollment_id=p_enrollment_id and etat='active'and seneve_private.hd_push_participant_admis(participant_id);
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
 rangs as(select r.*,row_number()over(partition by r.habit_key order by r.heure_locale,r.creneau_id)rang,count(*)over(partition by r.habit_key)n from rdv r where not(r.habit_key=any(cfg.habitudes_coupees))),
 slots as(select a.activity_id aid,(p_date+r.heure_locale)at time zone z instant,r.heure_locale from rangs r join seneve.contents c on c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and seneve.hd_date_du_jour(e.enrollment_id,c.jour)=p_date
 join seneve.activities a on a.content_id=c.content_id and a.type_activite='action'and(
 (a.note_source='RECETTE_HD_QUOTIDIEN_V1:'||r.habit_key and r.n=1 and r.habit_key not like 'culte_%')or
 (a.note_source='RECETTE_HD_CULTE_V1:'||r.habit_key||':'||r.rang and r.habit_key like 'culte_%')))
 select distinct s.aid,s.instant from slots s where seneve.hd_droit_a(e.enrollment_id,s.instant)
 and(s.instant at time zone z)::time=s.heure_locale
 and not exists(select 1 from seneve.activity_state st where st.enrollment_id=e.enrollment_id and st.activity_id=s.aid and st.etat='realisee');
end$function$;

CREATE OR REPLACE FUNCTION seneve_private.hd_prepare_push_day(p_enrollment_id uuid, p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e seneve.enrollments%rowtype;z text;t record;crees int;annules int;retard int;slots jsonb;
begin
 select *into e from seneve.enrollments where enrollment_id=p_enrollment_id and seneve_private.hd_push_participant_admis(participant_id);
 if not found then raise exception 'Inscription non admise aux rappels'using errcode='42501';end if;
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
end$function$;

