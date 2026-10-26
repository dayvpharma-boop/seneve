-- TEST seulement : HD est exclu du circuit générique, même si sa liaison est inactive.
-- Les signatures et permissions existantes sont conservées.
CREATE OR REPLACE FUNCTION seneve._push_rappel_eligible(p_communication_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
SELECT EXISTS (
 SELECT 1 FROM seneve.communications m
 JOIN seneve.enrollments e ON e.enrollment_id=m.enrollment_id
 JOIN seneve.participants p ON p.participant_id=e.participant_id
 JOIN seneve.programmes pr ON pr.programme_id=e.programme_id
 JOIN seneve.contents ct ON ct.content_id=m.content_id AND ct.programme_id=e.programme_id AND ct.version=e.version
 CROSS JOIN LATERAL (SELECT now() AT TIME ZONE coalesce(p.preferences #>> '{rappels,fuseau}',p.fuseau) AS local_now) l
 CROSS JOIN LATERAL (SELECT replace(m.motif,'rappel_','') AS moment) mo
 WHERE m.communication_id=p_communication_id AND m.canal='push'
 AND m.motif IN ('rappel_matin','rappel_midi','rappel_soir')
 AND not exists (select 1 from seneve.hd_programme_links hd where hd.programme_id=e.programme_id and hd.version=e.version and hd.langue=e.langue)
 AND e.etat='active'
 AND l.local_now::date BETWEEN e.date_debut AND coalesce(e.date_fin_prevue,e.date_debut+coalesce(pr.duree_jours,7)-1)
 AND ct.jour=(l.local_now::date-e.date_debut)+1
 AND ct.jour BETWEEN 1 AND coalesce(pr.duree_jours,7)
 AND m.creneau BETWEEN now()-interval '2 hours' AND now()
 AND (m.creneau AT TIME ZONE coalesce(p.preferences #>> '{rappels,fuseau}',p.fuseau))::date=l.local_now::date
 AND EXISTS (SELECT 1 FROM seneve.push_appareils a WHERE a.participant_id=p.participant_id)
 AND (SELECT c.etat FROM seneve.consents c WHERE c.participant_id=p.participant_id AND c.canal='push' AND c.finalite='rappels' ORDER BY c.decide_le DESC LIMIT 1)='accorde'
 AND coalesce(p.preferences #> '{rappels,moments}','{"matin":"07:30"}'::jsonb)->>mo.moment IS NOT NULL
 AND l.local_now::time >= ((coalesce(p.preferences #> '{rappels,moments}','{"matin":"07:30"}'::jsonb)->>mo.moment)::time)
 AND l.local_now::time < ((coalesce(p.preferences #> '{rappels,moments}','{"matin":"07:30"}'::jsonb)->>mo.moment)::time)+interval '2 hours'
 AND NOT (mo.moment='midi' AND EXISTS (
  SELECT 1 FROM seneve.activity_state st JOIN seneve.activities a ON a.activity_id=st.activity_id JOIN seneve.contents c ON c.content_id=a.content_id
  WHERE st.enrollment_id=e.enrollment_id AND c.jour=ct.jour AND st.etat IN ('preparee','realisee')
 ))
);
$function$;

CREATE OR REPLACE FUNCTION seneve.claim_push_reminders(p_limite integer DEFAULT 50)
 RETURNS TABLE(communication_id uuid, moment text, langue text, appareils jsonb, tentatives integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  update seneve.communications m set etat = 'expire', modifie_le = now()
   where m.canal = 'push' and m.etat in ('planifie','erreur','en_traitement')
     and m.creneau < now() - interval '2 hours';

  insert into seneve.communications (cle_idempotence, enrollment_id, content_id, canal, creneau, etat, motif)
  select 'rappel|' || s.participant_id::text || '|' || s.date_locale::text || '|' || s.moment,
         s.enrollment_id, s.content_id, 'push', now(), 'planifie', 'rappel_' || s.moment
    from (
      select distinct on (p.participant_id, mo.key)
             p.participant_id, mo.key as moment, e.enrollment_id, ct.content_id, x.date_locale
        from seneve.participants p
        cross join lateral jsonb_each_text(coalesce(p.preferences #> '{rappels,moments}', '{"matin":"07:30"}'::jsonb)) mo
        cross join lateral (select (now() at time zone coalesce(p.preferences #>> '{rappels,fuseau}', p.fuseau)) as maintenant_local) l
        join seneve.enrollments e on e.participant_id = p.participant_id and e.etat = 'active'
        join seneve.programmes pr on pr.programme_id = e.programme_id
        cross join lateral (select l.maintenant_local::date as date_locale,
                                   (l.maintenant_local::date - e.date_debut) + 1 as jour,
                                   l.maintenant_local::time as heure) x
        join lateral (select c.content_id from seneve.contents c
                       where c.programme_id = e.programme_id and c.version = e.version and c.jour = x.jour
                       order by c.numero_message limit 1) ct on true
       where not exists (select 1 from seneve.hd_programme_links hd where hd.programme_id=e.programme_id and hd.version=e.version and hd.langue=e.langue)
         and mo.value is not null
         and x.jour between 1 and coalesce(pr.duree_jours, 7)
         and x.heure >= mo.value::time and x.heure < mo.value::time + interval '2 hours'
         and exists (select 1 from seneve.push_appareils a where a.participant_id = p.participant_id)
         and (select c.etat from seneve.consents c
               where c.participant_id = p.participant_id and c.canal = 'push' and c.finalite = 'rappels'
               order by c.decide_le desc limit 1) = 'accorde'
         and not (mo.key = 'midi' and exists (
               select 1 from seneve.activity_state st
                 join seneve.activities a on a.activity_id = st.activity_id
                 join seneve.contents c on c.content_id = a.content_id
                where st.enrollment_id = e.enrollment_id and c.jour = x.jour
                  and st.etat in ('preparee','realisee')))
       order by p.participant_id, mo.key, e.date_debut desc
    ) s
  on conflict (cle_idempotence) do nothing;

  -- Recontrole les notifications en attente et les reprises apres echec.
  -- Ne touche jamais une notification deja acceptee ni une reservation recente.
  update seneve.communications m set etat = 'annule',
    erreur = 'Rappel devenu ineligible avant envoi', modifie_le = now()
   where m.canal = 'push'
     and (m.etat in ('planifie','erreur') or (m.etat='en_traitement' and m.modifie_le < now()-interval '10 minutes'))
     and not seneve._push_rappel_eligible(m.communication_id);

  return query
  with pris as (
    update seneve.communications m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.communication_id in (
       select y.communication_id from seneve.communications y
         join seneve.enrollments e on e.enrollment_id = y.enrollment_id
        where y.canal = 'push'
          and seneve._push_rappel_eligible(y.communication_id)
          and (y.etat = 'planifie'
               or (y.etat in ('en_traitement','erreur') and y.modifie_le < now() - interval '10 minutes'))
          and y.tentatives < 3
          and (select c.etat from seneve.consents c
                where c.participant_id = e.participant_id and c.canal = 'push' and c.finalite = 'rappels'
                order by c.decide_le desc limit 1) = 'accorde'
        order by y.creneau limit greatest(1, least(p_limite, 200))
        for update of y skip locked)
    returning m.communication_id, m.enrollment_id, m.motif, m.tentatives)
  select pris.communication_id, replace(pris.motif, 'rappel_', ''), e.langue,
         coalesce((select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth))
                     from seneve.push_appareils a where a.participant_id = e.participant_id), '[]'::jsonb),
         pris.tentatives
    from pris join seneve.enrollments e on e.enrollment_id = pris.enrollment_id;
end $function$;

CREATE OR REPLACE FUNCTION seneve.claim_morning_emails(p_limite integer DEFAULT 20)
 RETURNS TABLE(communication_id uuid, email text, prenom text, langue text, jour integer, duree integer, theme text, programme text, tentatives integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  update seneve.communications m set etat = 'expire', modifie_le = now()
   where m.motif = 'email_matin' and m.etat in ('planifie','erreur','en_traitement')
     and m.creneau < now() - interval '14 hours';

  insert into seneve.communications (cle_idempotence, enrollment_id, content_id, canal, creneau, etat, motif)
  select 'email_matin|' || e.enrollment_id::text || '|' || x.date_locale::text,
         e.enrollment_id, ct.content_id, 'email', now(), 'planifie', 'email_matin'
    from seneve.enrollments e
    join seneve.participants p on p.participant_id = e.participant_id
    join auth.users u on u.id = p.auth_user_id and coalesce(u.email, '') <> ''
    join seneve.programmes pr on pr.programme_id = e.programme_id
    cross join lateral (select (now() at time zone p.fuseau) as maintenant_local) l
    cross join lateral (select l.maintenant_local::date as date_locale,
                               (l.maintenant_local::date - e.date_debut) + 1 as jour,
                               extract(hour from l.maintenant_local)::int as heure) x
    join lateral (select c.content_id from seneve.contents c
                   where c.programme_id = e.programme_id and c.version = e.version and c.jour = x.jour
                   order by c.numero_message limit 1) ct on true
   where not exists (select 1 from seneve.hd_programme_links hd where hd.programme_id=e.programme_id and hd.version=e.version and hd.langue=e.langue)
     and e.legacy_inscription_id is null
     and e.etat = 'active'
     and x.jour between 1 and coalesce(pr.duree_jours, 7)
     and x.heure between 7 and 20
     and (select c.etat from seneve.consents c
           where c.participant_id = e.participant_id and c.canal = 'email' and c.finalite = 'email_matin'
           order by c.decide_le desc limit 1) = 'accorde'
  on conflict (cle_idempotence) do nothing;

  -- Annuler aussi les rappels HD déjà en attente, sans toucher aux acceptations
  -- fournisseur ni aux traitements récents potentiellement en cours.
  update seneve.communications m set etat='annule',
    erreur='Parcours HD réservé au circuit par activité',modifie_le=now()
   where m.motif='email_matin'
     and (m.etat in('planifie','erreur')or(m.etat='en_traitement'and m.modifie_le<now()-interval '15 minutes'))
     and exists(select 1 from seneve.enrollments e join seneve.hd_programme_links hd
       on hd.programme_id=e.programme_id and hd.version=e.version and hd.langue=e.langue
       where e.enrollment_id=m.enrollment_id);

  return query
  with pris as (
    update seneve.communications m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.communication_id in (
       select y.communication_id from seneve.communications y
         join seneve.enrollments e on e.enrollment_id = y.enrollment_id
        where y.motif = 'email_matin'
          and not exists (select 1 from seneve.hd_programme_links hd where hd.programme_id=e.programme_id and hd.version=e.version and hd.langue=e.langue)
          and (y.etat = 'planifie'
               or (y.etat in ('en_traitement','erreur') and y.modifie_le < now() - interval '15 minutes'))
          and y.tentatives < 3
          and e.etat = 'active'
          and (select c.etat from seneve.consents c
                where c.participant_id = e.participant_id and c.canal = 'email' and c.finalite = 'email_matin'
                order by c.decide_le desc limit 1) = 'accorde'
        order by y.creneau limit greatest(1, least(p_limite, 50))
        for update of y skip locked)
    returning m.communication_id, m.enrollment_id, m.content_id, m.tentatives)
  select pris.communication_id, u.email::text, p.prenom, e.langue, c.jour,
         coalesce(pr.duree_jours, 7), coalesce(c.theme, c.titre, ''), pr.nom, pris.tentatives
    from pris
    join seneve.enrollments e on e.enrollment_id = pris.enrollment_id
    join seneve.participants p on p.participant_id = e.participant_id
    join auth.users u on u.id = p.auth_user_id
    join seneve.programmes pr on pr.programme_id = e.programme_id
    join seneve.contents c on c.content_id = pris.content_id;
end $function$;

