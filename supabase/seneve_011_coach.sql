-- SÉNEVÉ 011 — Coach IA (texte).
-- Décisions de Dr Justin Tshims (13 octobre 2026) : moteur OpenAI, 5 messages par participant et par jour
-- (jour de Kinshasa ; un message en échec ne compte pas), conversations conservées jusqu'à ce que le
-- participant les efface.
-- * Le participant écrit uniquement par coach_ask (session, inscription active, quota, anti-doublon).
-- * n8n prépare la réponse avec claim_coach_jobs : contenus publiés du jour de l'inscription, conversation
--   récente et SEULES les notes de journal autorisées pour l'IA. Il enregistre la réponse par finish_coach_job.
-- * Aucune table n'est ouverte en écriture au participant ; le coach ne modifie ni progression ni droits.

create table if not exists seneve.coach_messages (
  message_id uuid primary key default gen_random_uuid(),
  client_message_id uuid unique,
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  enrollment_id uuid references seneve.enrollments(enrollment_id) on delete set null,
  role text not null check (role in ('participant', 'coach')),
  texte text not null check (char_length(btrim(texte)) between 1 and 6000),
  etat text not null default 'enregistre' check (etat in ('enregistre', 'en_attente', 'en_traitement', 'repondu', 'echec')),
  question_id uuid references seneve.coach_messages(message_id) on delete cascade,
  cree_le timestamptz not null default now()
);
create index if not exists coach_par_participant on seneve.coach_messages (participant_id, cree_le);
alter table seneve.coach_messages enable row level security;
revoke all on seneve.coach_messages from anon, authenticated;
grant select on seneve.coach_messages to authenticated;
create policy coach_participant_lit on seneve.coach_messages for select to authenticated
  using (participant_id = (select seneve.current_participant_id()));

-- Poser une question au coach ------------------------------------------------------------------------
create or replace function seneve.coach_ask(p_client_message_id uuid, p_enrollment_id uuid, p_texte text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_exist seneve.coach_messages%rowtype;
  v_enr seneve.enrollments%rowtype;
  v_jour date := (now() at time zone 'Africa/Kinshasa')::date;
  v_utilises int;
  v_id uuid;
  v_quota constant int := 5;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
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
end $$;

-- Quota restant aujourd'hui (affichage) --------------------------------------------------------------
create or replace function seneve.coach_quota()
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('quota', 5, 'restants', greatest(0, 5 - count(*)::int))
    from seneve.coach_messages
   where participant_id = seneve.current_participant_id() and role = 'participant' and etat <> 'echec'
     and (cree_le at time zone 'Africa/Kinshasa')::date = (now() at time zone 'Africa/Kinshasa')::date
$$;

-- Effacer sa conversation (définitif) ----------------------------------------------------------------
create or replace function seneve.coach_clear()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_n int;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  update seneve.jobs set etat = 'annulee'
   where type = 'coach_repondre' and etat in ('en_attente', 'en_traitement')
     and (charge->>'message_id')::uuid in (select message_id from seneve.coach_messages where participant_id = v_participant);
  delete from seneve.coach_messages where participant_id = v_participant;
  get diagnostics v_n = row_count;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, 'coach_conversation_effacee', 'participant:' || v_participant::text, 'ok',
          jsonb_build_object('messages', v_n));
  return jsonb_build_object('effaces', v_n);
end $$;

-- n8n : réserver les questions en attente, avec le contexte autorisé ---------------------------------
create or replace function seneve.claim_coach_jobs(p_limite int default 5)
returns table (job_id uuid, message_id uuid, tentatives int, question text, prenom text, langue text,
               programme_nom text, jour int, duree int, contenus jsonb, activites jsonb,
               historique jsonb, notes_autorisees jsonb)
language plpgsql security definer set search_path to '' as $$
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
                       order by j.cree_le desc limit 5) j), '[]'::jsonb);
end $$;

-- n8n : enregistrer la réponse (ou l'échec) ----------------------------------------------------------
create or replace function seneve.finish_coach_job(p_job_id uuid, p_ok boolean, p_reponse text default null, p_erreur text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_job seneve.jobs%rowtype;
  v_q seneve.coach_messages%rowtype;
begin
  select * into v_job from seneve.jobs where job_id = p_job_id and type = 'coach_repondre' and etat = 'en_traitement' for update;
  if not found then return; end if;
  select * into v_q from seneve.coach_messages where message_id = (v_job.charge->>'message_id')::uuid for update;
  if not found then
    update seneve.jobs set etat = 'annulee', erreur = 'message effacé' where job_id = p_job_id;
    return;
  end if;
  if p_ok and char_length(btrim(coalesce(p_reponse, ''))) between 1 and 6000 then
    insert into seneve.coach_messages (participant_id, enrollment_id, role, texte, etat, question_id)
    values (v_q.participant_id, v_q.enrollment_id, 'coach', btrim(p_reponse), 'enregistre', v_q.message_id);
    update seneve.coach_messages set etat = 'repondu' where message_id = v_q.message_id;
    update seneve.jobs set etat = 'terminee', erreur = null where job_id = p_job_id;
  elsif v_job.tentatives >= 3 then
    -- Échec définitif : le message ne compte pas dans le quota du jour.
    update seneve.coach_messages set etat = 'echec' where message_id = v_q.message_id;
    update seneve.jobs set etat = 'a_examiner', erreur = left(coalesce(p_erreur, 'réponse vide'), 500) where job_id = p_job_id;
  else
    update seneve.coach_messages set etat = 'en_attente' where message_id = v_q.message_id;
    update seneve.jobs set etat = 'en_attente', erreur = left(coalesce(p_erreur, 'réponse vide'), 500),
           echeance = now() + interval '1 minute' where job_id = p_job_id;
  end if;
end $$;

revoke all on function seneve.coach_ask(uuid, uuid, text) from public, anon;
revoke all on function seneve.coach_quota() from public, anon;
revoke all on function seneve.coach_clear() from public, anon;
revoke all on function seneve.claim_coach_jobs(int) from public, anon, authenticated;
revoke all on function seneve.finish_coach_job(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function seneve.coach_ask(uuid, uuid, text) to authenticated;
grant execute on function seneve.coach_quota() to authenticated;
grant execute on function seneve.coach_clear() to authenticated;
grant execute on function seneve.claim_coach_jobs(int) to service_role;
grant execute on function seneve.finish_coach_job(uuid, boolean, text, text) to service_role;
