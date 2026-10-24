-- Definition avant correction du 24 octobre 2026. Aucun secret.
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
       where mo.value is not null
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

  return query
  with pris as (
    update seneve.communications m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.communication_id in (
       select y.communication_id from seneve.communications y
         join seneve.enrollments e on e.enrollment_id = y.enrollment_id
        where y.canal = 'push'
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
end $function$
;
