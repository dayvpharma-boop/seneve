-- 060 : dimanche, jour de repos (décision de Dr Justin, 03/11/2026, option A).
-- Pas de rappel le dimanche pour : réveil, coucher, exercice, lecture professionnelle, prédication,
-- développement personnel. Ces habitudes (et la prière de midi, la Bible du soir) sont facultatives
-- ce jour-là côté application (src/lib/habitudes-dimanche.ts).
create or replace function seneve_private.hd_expected_push_slots(p_enrollment_id uuid, p_date date)
 returns table(activity_id uuid, creneau timestamp with time zone)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;cfg seneve.hd_delivery_preferences%rowtype;accord boolean;jm int;
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
 jm:=seneve_private.hd_dime_jour_mois(e.participant_id,p_date);
 return query
 with modeles as(select t.*from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue),
 pers as(select s.*from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.valide_du<=p_date and(s.valide_au is null or s.valide_au>=p_date)),
 rdv as(select s.habit_key,s.creneau_id,s.heure_locale from pers s where s.fuseau=z and extract(isodow from p_date)::smallint=any(s.jours_iso)and not(s.habit_key='dime'and jm is not null)
 union all select t.habit_key,'proposition',t.heure_proposee from modeles t where t.heure_proposee is not null and extract(isodow from p_date)::smallint=any(t.jours_iso)and not exists(select 1 from pers s where s.habit_key=t.habit_key)and not(t.habit_key='dime'and jm is not null)
 union all (select 'dime'::text,coalesce(s.creneau_id,'proposition'),coalesce(s.heure_locale,t.heure_proposee)from modeles t left join lateral(select x.creneau_id,x.heure_locale from pers x where x.habit_key='dime'and x.fuseau=z order by x.creneau_id limit 1)s on true
  where t.habit_key='dime'and jm is not null and extract(day from p_date)::int=jm and coalesce(s.heure_locale,t.heure_proposee)is not null)),
 rangs as(select r.*,row_number()over(partition by r.habit_key order by r.heure_locale,r.creneau_id)rang,count(*)over(partition by r.habit_key)n from rdv r where not(r.habit_key=any(cfg.habitudes_coupees))
  -- 060 : dimanche, jour de repos : pas de rappel pour les habitudes en pause.
  and not(extract(isodow from p_date)=7 and r.habit_key in('reveil','coucher','exercice','lecture_pro','predication','lecture_personnelle'))),
 slots as(select a.activity_id aid,(p_date+r.heure_locale)at time zone z instant,r.heure_locale from rangs r join seneve.contents c on c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue and seneve.hd_date_du_jour(e.enrollment_id,c.jour)=p_date
 join seneve.activities a on a.content_id=c.content_id and a.type_activite='action'and(
 (a.note_source='RECETTE_HD_QUOTIDIEN_V1:'||r.habit_key and r.n=1 and r.habit_key not like 'culte_%')or
 (a.note_source='RECETTE_HD_CULTE_V1:'||r.habit_key||':'||r.rang and r.habit_key like 'culte_%')or
 (a.note_source='RECETTE_HD_DIME_V1:dime'and r.habit_key='dime'and r.rang=1))),
 base_slots as (select distinct s.aid,s.instant from slots s where seneve.hd_droit_a(e.enrollment_id,s.instant)
 and(s.instant at time zone z)::time=s.heure_locale
 and not exists(select 1 from seneve.activity_state st where st.enrollment_id=e.enrollment_id and st.activity_id=s.aid and st.etat='realisee')
 and not exists(select 1 from seneve.hd_reminder_skips sk where sk.enrollment_id=e.enrollment_id and sk.activity_id=s.aid))
 select bs.aid, g.instant from base_slots bs
 cross join lateral generate_series(bs.instant, case when exists(select 1 from seneve_private.hd_push_dispatch_config where id and relances_30min_actives)then ((p_date+1)::timestamp at time zone z)-interval '1 microsecond' else bs.instant end, interval '30 minutes') g(instant)
 where seneve.hd_droit_a(e.enrollment_id,g.instant);
end$function$;
