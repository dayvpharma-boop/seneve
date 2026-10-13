-- SÉNEVÉ 008 — Journal privé et demande d'aide
-- Le journal reste lisible par son seul auteur. Rien n'en sort sans un geste explicite du participant :
--   * usage_ia_autorise (par note) : le coach IA pourra lire cette note ;
--   * request_help(p_entry_ids) : copie des notes choisies dans la demande d'aide, lue par l'équipe.

-- 1) Journal : contrôles d'intégrité --------------------------------------------------------------
alter table seneve.journal_entries
  add constraint journal_texte_longueur check (char_length(btrim(texte)) between 1 and 5000);

create or replace function seneve.tg_journal_controle()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_enr seneve.enrollments%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.participant_id <> old.participant_id or new.entry_id <> old.entry_id or new.cree_le <> old.cree_le then
      raise exception 'Champ non modifiable.' using errcode = '42501';
    end if;
    new.modifie_le := now();
  else
    new.cree_le := now();
    new.modifie_le := now();
  end if;
  if new.enrollment_id is not null then
    select * into v_enr from seneve.enrollments
     where enrollment_id = new.enrollment_id and participant_id = new.participant_id;
    if not found then
      raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
    end if;
  end if;
  if new.activity_id is not null then
    if new.enrollment_id is null or not exists (
         select 1 from seneve.activities a join seneve.contents c using (content_id)
          where a.activity_id = new.activity_id
            and c.programme_id = v_enr.programme_id and c.version = v_enr.version) then
      raise exception 'Activité non autorisée pour cette inscription.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger journal_controle before insert or update on seneve.journal_entries
  for each row execute function seneve.tg_journal_controle();

create index if not exists journal_par_participant on seneve.journal_entries (participant_id, cree_le desc);

-- 2) Demande d'aide : uniquement par fonction (contrôles, anti-doublon, audit, tâche n8n) ---------
revoke insert on seneve.help_requests from authenticated;
drop policy if exists aide_participant_cree on seneve.help_requests;

alter table seneve.help_requests
  add constraint aide_motif_longueur check (char_length(btrim(motif)) between 1 and 2000);

create or replace function seneve.request_help(
  p_client_request_id uuid,
  p_motif text,
  p_enrollment_id uuid default null,
  p_entry_ids uuid[] default '{}')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_existante seneve.help_requests%rowtype;
  v_extraits text;
  v_nb_notes int;
  v_recentes int;
  v_id uuid;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if p_client_request_id is null then
    raise exception 'Identifiant de demande manquant.' using errcode = '22023';
  end if;

  -- Nouvel envoi de la même demande (connexion coupée, double clic) : on renvoie la demande déjà créée.
  select * into v_existante from seneve.help_requests where client_request_id = p_client_request_id;
  if found then
    if v_existante.participant_id <> v_participant then
      raise exception 'Identifiant de demande déjà utilisé.' using errcode = '23505';
    end if;
    return jsonb_build_object('request_id', v_existante.request_id, 'etat', v_existante.etat, 'repetition', true);
  end if;

  if char_length(btrim(coalesce(p_motif, ''))) not between 1 and 2000 then
    raise exception 'Explique ta demande en 2000 caractères au plus.' using errcode = '22023';
  end if;
  if p_enrollment_id is not null and not exists (
       select 1 from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant) then
    raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
  end if;

  select count(*) into v_recentes from seneve.help_requests
   where participant_id = v_participant and cree_le > now() - interval '24 hours';
  if v_recentes >= 10 then
    raise exception 'Trop de demandes aujourd''hui. Réessaie demain.' using errcode = 'P0001';
  end if;

  -- Seules les notes de ce participant, choisies par lui, sont copiées dans la demande.
  p_entry_ids := coalesce(p_entry_ids, '{}');
  select count(*), string_agg(to_char(j.cree_le at time zone 'Africa/Kinshasa', 'DD/MM/YYYY') || ' — ' || j.texte, E'\n\n' order by j.cree_le)
    into v_nb_notes, v_extraits
    from seneve.journal_entries j
   where j.participant_id = v_participant and j.entry_id = any (p_entry_ids);
  if v_nb_notes <> cardinality(array(select distinct unnest(p_entry_ids))) then
    raise exception 'Note de journal introuvable pour ce compte.' using errcode = '42501';
  end if;

  insert into seneve.help_requests (client_request_id, participant_id, enrollment_id, motif, extraits_partages)
  values (p_client_request_id, v_participant, p_enrollment_id, btrim(p_motif), v_extraits)
  returning request_id into v_id;

  insert into seneve.jobs (type, cle_logique, charge)
  values ('aide_demandee', 'aide:' || v_id::text, jsonb_build_object('request_id', v_id));

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, 'demande_aide_creee', 'help_request:' || v_id::text, 'ok',
          jsonb_build_object('notes_partagees', v_nb_notes));

  return jsonb_build_object('request_id', v_id, 'etat', 'recue', 'repetition', false);
end $$;

create or replace function seneve.cancel_help_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_req seneve.help_requests%rowtype;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  select * into v_req from seneve.help_requests
   where request_id = p_request_id and participant_id = v_participant for update;
  if not found then
    raise exception 'Demande introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_req.etat = 'annulee' then
    return jsonb_build_object('request_id', p_request_id, 'etat', 'annulee', 'repetition', true);
  end if;
  if v_req.etat = 'resolue' then
    raise exception 'Cette demande est déjà résolue.' using errcode = 'P0001';
  end if;
  update seneve.help_requests set etat = 'annulee', modifie_le = now() where request_id = p_request_id;
  -- Si l'alerte n'est pas encore partie, elle n'a plus lieu d'être.
  update seneve.jobs set etat = 'annulee'
   where cle_logique = 'aide:' || p_request_id::text and etat = 'en_attente';
  insert into seneve.audit_events (acteur, action, objet, resultat)
  values ('participant:' || v_participant::text, 'demande_aide_annulee', 'help_request:' || p_request_id::text, 'ok');
  return jsonb_build_object('request_id', p_request_id, 'etat', 'annulee', 'repetition', false);
end $$;

-- 3) Lecture pour l'alerte n8n (clé de service uniquement) ----------------------------------------
-- Réserve les alertes en attente ; une alerte réservée depuis plus de 15 min sans suite est reprise.
create or replace function seneve.claim_help_alerts(p_limite int default 10)
returns table (job_id uuid, request_id uuid, prenom text, langue text, programme_id text,
               motif text, extraits_partages text, cree_le timestamptz, tentatives int,
               email text, whatsapp text)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'aide_demandee'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '15 minutes'))
          and x.echeance <= now() and x.tentatives < 5
        order by x.cree_le limit greatest(1, least(p_limite, 50))
        for update skip locked)
    returning j.job_id, (j.charge->>'request_id')::uuid as rid, j.tentatives)
  select pris.job_id, h.request_id, p.prenom, p.langue, e.programme_id,
         h.motif, h.extraits_partages, h.cree_le, pris.tentatives,
         u.email::text,
         (select c.identite_canal from seneve.channel_links c
           where c.participant_id = h.participant_id and c.canal = 'whatsapp' and c.etat = 'verifiee'
           order by c.verifiee_le desc limit 1)
    from pris join seneve.help_requests h on h.request_id = pris.rid
    join seneve.participants p on p.participant_id = h.participant_id
    left join auth.users u on u.id = p.auth_user_id
    left join seneve.enrollments e on e.enrollment_id = h.enrollment_id;
end $$;

create or replace function seneve.finish_help_alert(p_job_id uuid, p_ok boolean, p_erreur text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update seneve.jobs
     set etat = case when p_ok then 'terminee' when tentatives >= 5 then 'a_examiner' else 'en_attente' end,
         erreur = case when p_ok then null else left(coalesce(p_erreur, 'erreur inconnue'), 500) end,
         echeance = case when p_ok then echeance else now() + interval '10 minutes' end
   where job_id = p_job_id and type = 'aide_demandee' and etat = 'en_traitement';
end $$;

revoke all on function seneve.request_help(uuid, text, uuid, uuid[]) from public, anon;
revoke all on function seneve.cancel_help_request(uuid) from public, anon;
revoke all on function seneve.claim_help_alerts(int) from public, anon, authenticated;
revoke all on function seneve.finish_help_alert(uuid, boolean, text) from public, anon, authenticated;
revoke all on function seneve.tg_journal_controle() from public, anon, authenticated;
grant execute on function seneve.request_help(uuid, text, uuid, uuid[]) to authenticated;
grant execute on function seneve.cancel_help_request(uuid) to authenticated;
grant execute on function seneve.claim_help_alerts(int) to service_role;
grant execute on function seneve.finish_help_alert(uuid, boolean, text) to service_role;
