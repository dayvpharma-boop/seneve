-- 058 : la dîme devient une habitude à cocher dans Habitudes & Défis (décision de Dr Justin, 03/11/2026).
-- Commerçant : chaque semaine (planning habituel, dimanche 12:00 proposé).
-- Salarié : une fois par mois, au jour choisi (participants.preferences.dime = {"rythme":"mois","jour_mois":n} ;
-- le dernier jour du mois si le mois est plus court). Elle compte comme les cultes : publiée chaque jour,
-- prise en compte seulement le jour prévu.
-- À installer APRÈS la mise en ligne de l'application qui accepte une 17e activité par jour.

-- 1. Modèle d'habitude (français et anglais).
insert into seneve.hd_habit_templates (module_id, version, langue, habit_key, libelle, heure_proposee, jours_iso, duree_min, duree_max)
select m.module_id, m.version, m.langue, 'dime', case m.langue when 'en' then 'Tithe' else 'Dîme' end, '12:00', '{7}', null, null
  from (select distinct module_id, version, langue from seneve.hd_habit_templates where habit_key = 'culte_dimanche') m
on conflict do nothing;

-- 2. Une activité « Dîme » par jour, dans les deux parcours, à côté du culte du dimanche.
insert into seneve.activities (content_id, type_activite, consigne, obligatoire, critere_realisation, note_source)
select a.content_id, 'action',
       case c.langue when 'en' then 'Tithe' else 'Dîme' end, true,
       case c.langue when 'en' then 'Declare only what you actually gave, according to your income.'
                    else 'Déclare seulement ce que tu as réellement donné, selon tes revenus.' end,
       'RECETTE_HD_DIME_V1:dime'
  from seneve.activities a join seneve.contents c using (content_id)
 where c.programme_id in ('HABITUDES_DEFIS_30J_FR_V1', 'HABITUDES_DEFIS_30J_EN_V1')
   and a.note_source = 'RECETTE_HD_CULTE_V1:culte_dimanche:1'
   and not exists (select 1 from seneve.activities d where d.content_id = a.content_id and d.note_source = 'RECETTE_HD_DIME_V1:dime');

-- 3. Rythme choisi par la personne.
create or replace function seneve.hd_dime_regler(p_rythme text, p_jour_mois integer default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_p uuid := seneve.current_participant_id(); v jsonb;
begin
  if auth.uid() is null or v_p is null then raise exception 'Compte requis' using errcode = '42501'; end if;
  if p_rythme = 'semaine' then v := jsonb_build_object('rythme', 'semaine');
  elsif p_rythme = 'mois' and p_jour_mois between 1 and 31 then v := jsonb_build_object('rythme', 'mois', 'jour_mois', p_jour_mois);
  else raise exception 'Rythme de dîme invalide' using errcode = '22023'; end if;
  update seneve.participants set preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), '{dime}', v), modifie_le = now()
   where participant_id = v_p;
  return v;
end $function$;
revoke all on function seneve.hd_dime_regler(text, integer) from public, anon;
grant execute on function seneve.hd_dime_regler(text, integer) to authenticated;

-- Jour de dîme mensuelle pour une date locale (null si la personne est au rythme hebdomadaire).
create or replace function seneve_private.hd_dime_jour_mois(p_participant uuid, p_date date)
 returns integer
 language sql
 stable security definer
 set search_path to ''
as $function$
  select least((p.preferences#>>'{dime,jour_mois}')::int,
               extract(day from (date_trunc('month', p_date) + interval '1 month - 1 day'))::int)
    from seneve.participants p
   where p.participant_id = p_participant and p.preferences#>>'{dime,rythme}' = 'mois'
     and (p.preferences#>>'{dime,jour_mois}') ~ '^([1-9]|[12][0-9]|3[01])$'
$function$;
revoke all on function seneve_private.hd_dime_jour_mois(uuid, date) from public, anon, authenticated;

-- 4. Le planning renvoie aussi le rythme de la dîme.
create or replace function seneve_private.hd_schedule_settings(p_enrollment_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;z text;j date;d jsonb;
begin
 if auth.uid()is null then raise exception 'Compte requis'using errcode='42501';end if;
 select * into e from seneve.enrollments where enrollment_id=p_enrollment_id
 and participant_id=(select seneve.current_participant_id());
 if not found or not seneve.hd_has_current_right(p_enrollment_id)then raise exception 'Planning non accessible'using errcode='42501';end if;
 select * into strict l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
 select coalesce(preferences#>>'{rappels,fuseau}',fuseau),preferences->'dime' into z,d from seneve.participants where participant_id=e.participant_id;
 if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z)then raise exception 'Fuseau invalide'using errcode='22023';end if;
 j:=(now()at time zone z)::date;
 return jsonb_build_object('enrollment_id',e.enrollment_id,'fuseau',z,'date_locale',j,'modifications_a_partir_du',j+1,
 'modeles',(select coalesce(jsonb_agg(to_jsonb(t)order by t.habit_key),'[]'::jsonb)from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue),
 'horaires',(select coalesce(jsonb_agg(to_jsonb(s)order by s.habit_key,s.valide_du,s.creneau_id),'[]'::jsonb)from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue),
 'revisions',(select coalesce(jsonb_agg(jsonb_build_object('habit_key',h.habit_key,'revision',h.revision,'effectif_du',h.effectif_du)),'[]'::jsonb)from seneve_private.hd_schedule_heads h where h.participant_id=e.participant_id and h.module_id=l.module_id and h.version=l.module_version and h.langue=e.langue),
 'dime',case when d->>'rythme'='mois' then d else jsonb_build_object('rythme','semaine') end);
end$function$;

-- 5. Le serveur n'accepte la dîme que le jour prévu (comme les cultes).
create or replace function seneve.hd_progress_access_guard()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare e seneve.enrollments%rowtype;l seneve.hd_programme_links%rowtype;
 source text;j date;habit text;rang int;z text;n int;jm int;
begin
 select * into e from seneve.enrollments where enrollment_id=new.enrollment_id;
 if exists(select 1 from seneve.hd_programme_links x where x.programme_id=e.programme_id and x.version=e.version and x.langue=e.langue)
 and not seneve.hd_has_current_right(new.enrollment_id) then
  raise exception 'Droit Habitudes et Défis absent, expiré ou révoqué.' using errcode='42501';
 end if;
 if e.programme_id in ('HD_RECETTE_INSCRIPTION_FR_20261026','HABITUDES_DEFIS_30J_FR_V1','HABITUDES_DEFIS_30J_EN_V1') then
  select a.note_source,seneve.hd_date_du_jour(e.enrollment_id,c.jour) into source,j from seneve.activities a join seneve.contents c using(content_id)
  where a.activity_id=new.activity_id and c.programme_id=e.programme_id and c.version=e.version and c.langue=e.langue;
  if source like 'RECETTE_HD_CULTE_V1:%' or source='RECETTE_HD_DIME_V1:dime' then
   if source='RECETTE_HD_DIME_V1:dime' then habit:='dime';rang:=1;
   elsif source!~'^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):[1-7]$' then raise exception 'Créneau de culte invalide'using errcode='42501';
   else habit:=split_part(source,':',2);rang:=split_part(source,':',3)::int;end if;
   select * into strict l from seneve.hd_programme_links where programme_id=e.programme_id and version=e.version and langue=e.langue and actif;
   select coalesce(preferences#>>'{rappels,fuseau}',fuseau)into z from seneve.participants where participant_id=e.participant_id;
   jm:=case when habit='dime' then seneve_private.hd_dime_jour_mois(e.participant_id,j) end;
   if jm is not null then
    n:=case when extract(day from j)::int=jm then 1 else 0 end;
   elsif exists(select 1 from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.habit_key=habit and s.valide_du<=j and (s.valide_au is null or s.valide_au>=j))then
    select count(*)into n from seneve.hd_habit_schedules s where s.participant_id=e.participant_id and s.module_id=l.module_id and s.version=l.module_version and s.langue=e.langue and s.habit_key=habit and s.valide_du<=j and (s.valide_au is null or s.valide_au>=j)and extract(isodow from j)::smallint=any(s.jours_iso)and s.fuseau=z;
   else
    select count(*)into n from seneve.hd_habit_templates t where t.module_id=l.module_id and t.version=l.module_version and t.langue=e.langue and t.habit_key=habit and t.heure_proposee is not null and extract(isodow from j)::smallint=any(t.jours_iso);
   end if;
   if rang>n then raise exception 'Aucun culte personnel pour ce créneau et cette journée'using errcode='42501';end if;
  end if;
 end if;
 return new;
end$function$;

-- 6. Rappels : la dîme sonne le jour prévu (semaine ou mois).
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
 rangs as(select r.*,row_number()over(partition by r.habit_key order by r.heure_locale,r.creneau_id)rang,count(*)over(partition by r.habit_key)n from rdv r where not(r.habit_key=any(cfg.habitudes_coupees))),
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

-- 7. La page Notifications nomme aussi la dîme.
create or replace function seneve.mes_notifications(p_limite integer default 50)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_p uuid := seneve.current_participant_id();
  v_vu timestamptz;
  v_seuil_rappels timestamptz;
  v_elements jsonb;
  v_non_lues int;
  v_depuis timestamptz := now() - interval '60 days';
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if p_limite is null or p_limite < 1 or p_limite > 100 then raise exception 'Limite invalide' using errcode = '22023'; end if;
  select vu_jusqu_a into v_vu from seneve.notifications_vues where participant_id = v_p;
  v_seuil_rappels := coalesce(v_vu, now() - interval '24 hours');

  with mes_inscriptions as (
    select e.enrollment_id, e.programme_id, e.langue from seneve.enrollments e
     where e.participant_id = v_p and e.etat <> 'annulee'
  ), mes_langues as (
    select langue from mes_inscriptions
    union select coalesce((select langue from seneve.participants where participant_id = v_p), 'fr')
  ), tout as (
    select 'annonce'::text as type, a.annonce_id::text as id, a.publie_le as date,
           (v_vu is null or a.publie_le > v_vu) as nouveau,
           jsonb_build_object('titre', a.titre, 'texte', a.texte, 'langue', a.langue, 'image', a.image_path, 'video', a.video_url,
                              'bouton_texte', a.bouton_texte, 'bouton_lien', a.bouton_lien, 'fin', a.fin_le) as contenu
      from seneve.annonces a
     where a.retire_le is null and a.publie_le <= now() and a.publie_le >= v_depuis
       and (a.fin_le is null or a.fin_le > now())
       and a.langue in (select langue from mes_langues)
       and (a.cible = 'tous' or a.programme_id in (select programme_id from mes_inscriptions))
    union all
    select 'reponse', m.message_id::text, m.cree_le, (v_vu is null or m.cree_le > v_vu),
           jsonb_build_object('texte', m.texte, 'request_id', h.request_id)
      from seneve.help_messages m join seneve.help_requests h on h.request_id = m.request_id
     where h.participant_id = v_p and m.auteur = 'equipe' and m.cree_le >= v_depuis
    union all
    select 'rappel_moment', c.communication_id::text, coalesce(c.modifie_le, c.creneau), coalesce(c.modifie_le, c.creneau) > v_seuil_rappels,
           jsonb_build_object('moment', replace(c.motif, 'rappel_', ''))
      from seneve.communications c join mes_inscriptions i on i.enrollment_id = c.enrollment_id
     where c.canal = 'push' and c.etat = 'accepte' and c.motif in ('rappel_matin','rappel_midi','rappel_soir')
       and coalesce(c.modifie_le, c.creneau) >= v_depuis
    union all
    select 'rappel_habitude', r.reminder_id::text, r.modifie_le, r.modifie_le > v_seuil_rappels,
           jsonb_build_object('activity_id', r.activity_id,
             'habit_key', coalesce(substring(a.note_source from '^RECETTE_HD_QUOTIDIEN_V1:([a-z_]+)$'),
                                   substring(a.note_source from '^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):'),
                                   substring(a.note_source from '^RECETTE_HD_DIME_V1:(dime)$')))
      from seneve.hd_activity_reminders r
      join mes_inscriptions i on i.enrollment_id = r.enrollment_id
      left join seneve.activities a on a.activity_id = r.activity_id
     where r.canal = 'push' and r.etat = 'accepte' and r.modifie_le >= v_depuis
  )
  select (select count(*) from tout where nouveau),
         (select coalesce(jsonb_agg(jsonb_build_object('type', x.type, 'id', x.id, 'date', x.date, 'nouveau', x.nouveau) || x.contenu order by x.date desc, x.id), '[]'::jsonb)
            from (select * from tout order by date desc, id limit p_limite) x)
    into v_non_lues, v_elements;

  return jsonb_build_object('vu_jusqu_a', v_vu, 'non_lues', v_non_lues, 'elements', v_elements);
end $function$;
