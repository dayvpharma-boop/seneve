create function seneve_private.hd_coach_excluded(p_enrollment_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from seneve.enrollments e where e.enrollment_id=p_enrollment_id
  and exists(select 1 from seneve.hd_programme_links l where l.programme_id=e.programme_id))
$$;
revoke all on function seneve_private.hd_coach_excluded(uuid)from public,anon,authenticated,service_role;

create or replace function seneve._quota_coach(p_participant uuid)
returns integer language sql stable security definer set search_path='' as $$
 select coalesce(max(pr.quota_coach_jour)filter(where not seneve_private.hd_coach_excluded(e.enrollment_id)),
  case when exists(select 1 from seneve.enrollments h where h.participant_id=p_participant and h.etat='active'and seneve_private.hd_coach_excluded(h.enrollment_id))then 0 else 5 end)
 from seneve.enrollments e join seneve.programmes pr on pr.programme_id=e.programme_id
 where e.participant_id=p_participant and e.etat='active'
$$;

CREATE OR REPLACE FUNCTION seneve.coach_ask(p_client_message_id uuid, p_enrollment_id uuid, p_texte text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_participant uuid := seneve.current_participant_id();
  v_exist seneve.coach_messages%rowtype;
  v_enr seneve.enrollments%rowtype;
  v_jour date := (now() at time zone 'Africa/Kinshasa')::date;
  v_utilises int;
  v_id uuid;
  v_quota int;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if exists(select 1 from seneve.enrollments where enrollment_id=p_enrollment_id and participant_id=v_participant)
     and seneve_private.hd_coach_excluded(p_enrollment_id) then
    raise exception 'Le coach IA est exclu de ce programme.' using errcode='42501';
  end if;
  if p_client_message_id is null then
    raise exception 'Identifiant de message manquant.' using errcode = '22023';
  end if;
  -- Nouvel envoi du même message : on renvoie celui déjà enregistré (aucun doublon, aucun quota consommé).
  select * into v_exist from seneve.coach_messages where client_message_id = p_client_message_id;
  if found then
    if v_exist.participant_id <> v_participant then
      raise exception 'Identifiant de message déjà utilisé.' using errcode = '23505';
    end if;
    if seneve_private.hd_coach_excluded(v_exist.enrollment_id) then
      raise exception 'Le coach IA est exclu de ce programme.' using errcode='42501';
    end if;
    return jsonb_build_object('message_id', v_exist.message_id, 'etat', v_exist.etat, 'repetition', true);
  end if;
  if char_length(btrim(coalesce(p_texte, ''))) not between 1 and 1000 then
    raise exception 'Écris ta question en 1000 caractères au plus.' using errcode = '22023';
  end if;
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant;
  if not found then
    raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_enr.etat <> 'active' then
    raise exception 'Ce parcours n''est pas actif.' using errcode = '42501';
  end if;
  -- Limite du jour : la plus haute parmi les parcours actifs du participant (décision du 15/10/2026).
  v_quota := seneve._quota_coach(v_participant);
  -- Verrou par participant : deux questions envoyées en même temps ne peuvent pas dépasser la limite.
  perform pg_advisory_xact_lock(hashtext('coach:' || v_participant::text));
  select count(*) into v_utilises from seneve.coach_messages
   where participant_id = v_participant and role = 'participant' and etat <> 'echec'
     and (cree_le at time zone 'Africa/Kinshasa')::date = v_jour;
  if v_utilises >= v_quota then
    raise exception 'QUOTA_ATTEINT' using errcode = 'P0001';
  end if;
  insert into seneve.coach_messages (client_message_id, participant_id, enrollment_id, role, texte, etat)
  values (p_client_message_id, v_participant, p_enrollment_id, 'participant', btrim(p_texte), 'en_attente')
  returning message_id into v_id;
  insert into seneve.jobs (type, cle_logique, charge)
  values ('coach_repondre', 'coach:' || v_id::text, jsonb_build_object('message_id', v_id));
  return jsonb_build_object('message_id', v_id, 'etat', 'en_attente', 'repetition', false,
                            'restants', v_quota - v_utilises - 1);
end $function$
;
CREATE OR REPLACE FUNCTION seneve.claim_coach_jobs(p_limite integer DEFAULT 5)
 RETURNS TABLE(job_id uuid, message_id uuid, tentatives integer, question text, prenom text, langue text, programme_nom text, jour integer, duree integer, contenus jsonb, activites jsonb, historique jsonb, notes_autorisees jsonb, objectif text, objectif_racine integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
begin
  -- Dernière tentative restée sans suite : échec définitif (ne compte pas dans le quota).
  with perdus as (
    update seneve.jobs j set etat = 'a_examiner', erreur = coalesce(j.erreur, 'délai dépassé')
     where j.type = 'coach_repondre' and j.etat = 'en_traitement' and j.tentatives >= 3
       and j.reserve_le < now() - interval '5 minutes'
    returning (j.charge->>'message_id')::uuid as mid)
  update seneve.coach_messages m set etat = 'echec' from perdus where m.message_id = perdus.mid;
  -- Questions effacées entre-temps : la tâche n'a plus d'objet.
  update seneve.jobs j set etat = 'annulee', erreur = 'message effacé'
   where j.type = 'coach_repondre' and j.etat = 'en_attente'
     and not exists (select 1 from seneve.coach_messages m where m.message_id = (j.charge->>'message_id')::uuid);
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'coach_repondre'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '5 minutes'))
          and not exists (select 1 from seneve.coach_messages hm
                           where hm.message_id=(x.charge->>'message_id')::uuid
                             and seneve_private.hd_coach_excluded(hm.enrollment_id))
          and x.echeance <= now() and x.tentatives < 3
        order by x.cree_le limit greatest(1, least(p_limite, 20))
        for update skip locked)
    returning j.job_id, (j.charge->>'message_id')::uuid as mid, j.tentatives),
  base as (
    select pris.*, m.texte, m.participant_id, m.cree_le, e.enrollment_id, e.programme_id, e.version, e.date_debut,
           p.prenom, coalesce(e.langue, p.langue) as langue, pr.nom, coalesce(pr.duree_jours, 7) as duree,
           least(coalesce(pr.duree_jours, 7), greatest(1,
             ((now() at time zone 'Africa/Kinshasa')::date - e.date_debut) + 1)) as jour
      from pris
      join seneve.coach_messages m on m.message_id = pris.mid
      join seneve.participants p on p.participant_id = m.participant_id
      left join seneve.enrollments e on e.enrollment_id = m.enrollment_id
      left join seneve.programmes pr on pr.programme_id = e.programme_id)
  update seneve.coach_messages m set etat = 'en_traitement' from base where m.message_id = base.mid
  returning base.job_id, base.mid, base.tentatives, base.texte, base.prenom, base.langue, base.nom, base.jour, base.duree,
    coalesce((select jsonb_agg(jsonb_build_object('moment', c.numero_message, 'theme', c.theme, 'texte_officiel', c.texte_officiel,
                                                  'explication', c.explication, 'reference_livre', c.reference_livre) order by c.numero_message)
                from seneve.contents c
               where c.programme_id = base.programme_id and c.version = base.version and c.jour = base.jour), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('type', a.type_activite, 'consigne', a.consigne))
                from seneve.activities a join seneve.contents c using (content_id)
               where c.programme_id = base.programme_id and c.version = base.version and c.jour = base.jour), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('role', h.role, 'texte', left(h.texte, 1500)) order by h.cree_le)
                from (select * from seneve.coach_messages h
                       where h.participant_id = base.participant_id and h.message_id <> base.mid
                         and h.cree_le < base.cree_le and h.etat in ('repondu', 'enregistre')
                       order by h.cree_le desc limit 8) h), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('date', to_char(j.cree_le at time zone 'Africa/Kinshasa', 'DD/MM/YYYY'),
                                                  'texte', left(j.texte, 1200)) order by j.cree_le desc)
                from (select * from seneve.journal_entries j
                       where j.participant_id = base.participant_id and j.usage_ia_autorise
                       order by j.cree_le desc limit 5) j), '[]'::jsonb),
    (select g.texte from seneve.goals g where g.participant_id = base.participant_id and g.etat = 'confirme' limit 1),
    (select g.racine::int from seneve.goals g where g.participant_id = base.participant_id and g.etat = 'confirme' limit 1);
end $function$
;
create function seneve_private.hd_guard_coach_message()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if seneve_private.hd_coach_excluded(new.enrollment_id)then
  raise exception 'Le coach IA est exclu de ce programme.'using errcode='42501';
 end if;
 return new;
end$$;
revoke all on function seneve_private.hd_guard_coach_message()from public,anon,authenticated,service_role;
create trigger hd_coach_excluded before insert or update of enrollment_id on seneve.coach_messages
for each row execute function seneve_private.hd_guard_coach_message();
