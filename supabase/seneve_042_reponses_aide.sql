-- SÉNEVÉ 042 — Échanges dans une demande d'aide (demande de Dr Justin du 22/10/2026).
-- Le participant peut répondre à l'équipe dans la même demande (maquette corrigée « Aide & Contact —
-- Partage de notes & Réponse »). Chaque réponse enregistrée de l'équipe et chaque réponse du participant
-- deviennent un message daté. Une réponse du participant à une demande « En attente de ta réponse » ou
-- « Résolue » la remet à traiter et prévient l'équipe (même alerte e-mail que pour une nouvelle demande).

-- 1. Messages d'une demande. Lecture : le participant pour ses propres demandes ; l'équipe passe par ses fonctions.
create table if not exists seneve.help_messages (
  message_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references seneve.help_requests(request_id) on delete cascade,
  auteur text not null check (auteur in ('participant', 'equipe')),
  texte text not null check (char_length(btrim(texte)) between 1 and 4000),
  client_message_id uuid unique,
  -- Heure réelle de chaque message (deux messages d'une même opération restent dans l'ordre).
  cree_le timestamptz not null default clock_timestamp()
);
create index if not exists help_messages_demande on seneve.help_messages (request_id, cree_le);
alter table seneve.help_messages enable row level security;
drop policy if exists help_messages_participant_lit on seneve.help_messages;
create policy help_messages_participant_lit on seneve.help_messages for select to authenticated
  using (exists (select 1 from seneve.help_requests h
                  where h.request_id = help_messages.request_id
                    and h.participant_id = (select seneve.current_participant_id())));
revoke all on seneve.help_messages from public, anon, authenticated;
grant select on seneve.help_messages to authenticated;
grant all on seneve.help_messages to service_role;

-- Les réponses déjà données deviennent le premier message de l'équipe (rien n'est effacé).
insert into seneve.help_messages (request_id, auteur, texte, cree_le)
select h.request_id, 'equipe', h.reponse, h.modifie_le
  from seneve.help_requests h
 where nullif(btrim(coalesce(h.reponse, '')), '') is not null
   and not exists (select 1 from seneve.help_messages m where m.request_id = h.request_id);

-- 2. Le participant répond (une seule fois par identifiant d'envoi, même après un double appui).
create or replace function seneve.reply_help_request(p_request_id uuid, p_client_message_id uuid, p_texte text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_req seneve.help_requests%rowtype;
  v_texte text := btrim(coalesce(p_texte, ''));
  v_message uuid;
  v_etat text;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if p_client_message_id is null then
    raise exception 'Identifiant d''envoi manquant.' using errcode = '22023';
  end if;
  select m.message_id into v_message from seneve.help_messages m
    join seneve.help_requests h on h.request_id = m.request_id
   where m.client_message_id = p_client_message_id and h.participant_id = v_participant;
  if found then
    select etat into v_etat from seneve.help_requests where request_id = p_request_id;
    return jsonb_build_object('request_id', p_request_id, 'message_id', v_message, 'etat', v_etat, 'repetition', true);
  end if;
  if char_length(v_texte) < 1 or char_length(v_texte) > 2000 then
    raise exception 'La réponse doit compter de 1 à 2000 caractères.' using errcode = '22023';
  end if;
  select * into v_req from seneve.help_requests
   where request_id = p_request_id and participant_id = v_participant for update;
  if not found then
    raise exception 'Demande introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_req.etat = 'annulee' then
    raise exception 'Cette demande a été annulée.' using errcode = 'P0001';
  end if;

  insert into seneve.help_messages (request_id, auteur, texte, client_message_id)
  values (p_request_id, 'participant', v_texte, p_client_message_id)
  returning message_id into v_message;

  -- Une demande qui attendait le participant, ou déjà résolue, revient à l'équipe.
  v_etat := v_req.etat;
  if v_req.etat in ('attente_participant', 'resolue') then
    v_etat := case when v_req.affecte_a is null then 'recue' else 'en_cours' end;
    update seneve.jobs set etat = 'annulee'
     where type = 'aide_resolue' and etat = 'en_attente' and charge->>'request_id' = p_request_id::text;
  end if;
  update seneve.help_requests set etat = v_etat, modifie_le = clock_timestamp() where request_id = p_request_id;

  -- Alerte e-mail à l'équipe (même automatisation que pour une nouvelle demande).
  insert into seneve.jobs (type, cle_logique, charge)
  values ('aide_demandee', 'aide:' || p_request_id::text || ':reponse:' || v_message::text,
          jsonb_build_object('request_id', p_request_id, 'message_id', v_message))
  on conflict (cle_logique) do nothing;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, 'demande_aide_reponse', 'help_request:' || p_request_id::text, 'ok',
          jsonb_build_object('etat', v_etat));
  return jsonb_build_object('request_id', p_request_id, 'message_id', v_message, 'etat', v_etat, 'repetition', false);
end $$;
revoke all on function seneve.reply_help_request(uuid, uuid, text) from public, anon;
grant execute on function seneve.reply_help_request(uuid, uuid, text) to authenticated;

-- 3. Chaque réponse enregistrée par l'équipe devient aussi un message de l'échange.
create or replace function seneve.staff_update_help_request(p_request_id uuid, p_modifie_le timestamp with time zone, p_etat text, p_reponse text, p_affecte_a uuid DEFAULT NULL::uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := seneve.has_role('administrateur');
  v_req seneve.help_requests%rowtype;
  v_etat text := p_etat;
  v_reponse text := nullif(btrim(coalesce(p_reponse, '')), '');
  v_affecte uuid;
  v_changes text[] := '{}';
begin
  if v_uid is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if not v_admin and not seneve.has_role('accompagnateur') then
    raise exception 'Accès réservé à l''équipe d''accompagnement.' using errcode = '42501';
  end if;
  select * into v_req from seneve.help_requests where request_id = p_request_id for update;
  if not found or (not v_admin and v_req.affecte_a is distinct from v_uid) then
    raise exception 'Demande introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_req.etat = 'annulee' then
    raise exception 'Cette demande a été annulée par le participant.' using errcode = 'P0001';
  end if;
  if p_modifie_le is null or date_trunc('milliseconds', v_req.modifie_le) <> date_trunc('milliseconds', p_modifie_le) then
    raise exception 'Cette demande a été modifiée entre-temps. Recharge la page.' using errcode = '40001';
  end if;
  if v_etat not in ('recue', 'affectee', 'en_cours', 'attente_participant', 'resolue') then
    raise exception 'État non autorisé.' using errcode = '22023';
  end if;
  if v_reponse is not null and char_length(v_reponse) > 4000 then
    raise exception 'La réponse dépasse 4000 caractères.' using errcode = '22023';
  end if;
  v_affecte := case when v_admin then p_affecte_a else v_req.affecte_a end;
  if v_affecte is not null and not exists (
       select 1 from seneve.staff_roles where auth_user_id = v_affecte and role in ('administrateur', 'accompagnateur')) then
    raise exception 'Cette personne ne fait pas partie de l''équipe.' using errcode = '22023';
  end if;
  if v_affecte is not null and v_etat = 'recue' then
    v_etat := 'affectee';
  end if;
  if v_affecte is null and v_etat = 'affectee' then
    v_etat := 'recue';
  end if;
  if v_etat is distinct from v_req.etat then v_changes := array_append(v_changes, 'etat'); end if;
  if v_reponse is distinct from v_req.reponse then v_changes := array_append(v_changes, 'reponse'); end if;
  if v_affecte is distinct from v_req.affecte_a then v_changes := array_append(v_changes, 'affectation'); end if;
  if cardinality(v_changes) = 0 then
    return jsonb_build_object('request_id', p_request_id, 'etat', v_req.etat, 'modifie_le', v_req.modifie_le, 'changements', '[]'::jsonb);
  end if;
  update seneve.help_requests
     set etat = v_etat, reponse = v_reponse, affecte_a = v_affecte, modifie_le = clock_timestamp()
   where request_id = p_request_id
   returning * into v_req;
  -- Nouvelle réponse visible : elle s'ajoute à l'échange avec le participant.
  if 'reponse' = any (v_changes) and v_reponse is not null then
    insert into seneve.help_messages (request_id, auteur, texte) values (p_request_id, 'equipe', v_reponse);
  end if;
  -- E-mail au participant quand la demande passe à « résolue » (une fois par résolution).
  if v_etat = 'resolue' and 'etat' = any (v_changes) then
    insert into seneve.jobs (type, cle_logique, charge)
    values ('aide_resolue', 'aide_resolue:' || p_request_id::text || ':' || extract(epoch from v_req.modifie_le)::text,
            jsonb_build_object('request_id', p_request_id))
    on conflict (cle_logique) do nothing;
  end if;
  -- Demande rouverte avant l'envoi : l'e-mail n'a plus lieu d'être.
  if v_etat <> 'resolue' then
    update seneve.jobs set etat = 'annulee'
     where type = 'aide_resolue' and etat = 'en_attente' and charge->>'request_id' = p_request_id::text;
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || v_uid::text, 'demande_aide_traitee', 'help_request:' || p_request_id::text, 'ok',
          jsonb_build_object('changements', to_jsonb(v_changes), 'etat', v_etat, 'affecte_a', v_affecte));
  return jsonb_build_object('request_id', p_request_id, 'etat', v_req.etat, 'modifie_le', v_req.modifie_le,
                            'changements', to_jsonb(v_changes));
end $$;

-- 4. L'alerte e-mail d'une réponse du participant montre sa réponse, puis la demande d'origine.
create or replace function seneve.claim_help_alerts(p_limite integer DEFAULT 10)
returns table(job_id uuid, request_id uuid, prenom text, langue text, programme_id text, motif text, extraits_partages text, cree_le timestamp with time zone, tentatives integer, email text, whatsapp text)
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
    returning j.job_id, (j.charge->>'request_id')::uuid as rid, (j.charge->>'message_id')::uuid as mid, j.tentatives)
  select pris.job_id, h.request_id, p.prenom, p.langue, e.programme_id,
         case when m.message_id is null then h.motif
              else 'RÉPONSE DU PARTICIPANT dans sa demande d''aide :' || E'\n' || m.texte
                   || E'\n\n— Sa demande d''origine :\n' || h.motif end,
         h.extraits_partages, coalesce(m.cree_le, h.cree_le), pris.tentatives,
         u.email::text,
         (select c.identite_canal from seneve.channel_links c
           where c.participant_id = h.participant_id and c.canal = 'whatsapp' and c.etat = 'verifiee'
           order by c.verifiee_le desc limit 1)
    from pris join seneve.help_requests h on h.request_id = pris.rid
    left join seneve.help_messages m on m.message_id = pris.mid
    join seneve.participants p on p.participant_id = h.participant_id
    left join auth.users u on u.id = p.auth_user_id
    left join seneve.enrollments e on e.enrollment_id = h.enrollment_id;
end $$;

-- 5. L'équipe voit l'échange complet (nouvelle colonne « messages » : la fonction est recréée).
drop function if exists seneve.staff_list_help_requests();
create function seneve.staff_list_help_requests()
returns table(request_id uuid, cree_le timestamp with time zone, modifie_le timestamp with time zone, etat text, motif text, extraits_partages text, reponse text, affecte_a uuid, affecte_email text, prenom text, langue text, programme_id text, email text, whatsapp text, messages jsonb)
language plpgsql stable security definer set search_path to '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := seneve.has_role('administrateur');
begin
  if v_uid is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if not v_admin and not seneve.has_role('accompagnateur') then
    raise exception 'Accès réservé à l''équipe d''accompagnement.' using errcode = '42501';
  end if;
  return query
  select h.request_id, h.cree_le, h.modifie_le, h.etat, h.motif, h.extraits_partages, h.reponse,
         h.affecte_a, ua.email::text, p.prenom, p.langue, e.programme_id, u.email::text,
         (select c.identite_canal from seneve.channel_links c
           where c.participant_id = h.participant_id and c.canal = 'whatsapp' and c.etat = 'verifiee'
           order by c.verifiee_le desc limit 1),
         coalesce((select jsonb_agg(jsonb_build_object('auteur', m.auteur, 'texte', m.texte, 'cree_le', m.cree_le) order by m.cree_le)
                     from seneve.help_messages m where m.request_id = h.request_id), '[]'::jsonb)
    from seneve.help_requests h
    join seneve.participants p on p.participant_id = h.participant_id
    left join auth.users u on u.id = p.auth_user_id
    left join auth.users ua on ua.id = h.affecte_a
    left join seneve.enrollments e on e.enrollment_id = h.enrollment_id
   where v_admin or h.affecte_a = v_uid
   order by h.cree_le desc
   limit 500;
end $$;
revoke all on function seneve.staff_list_help_requests() from public, anon;
grant execute on function seneve.staff_list_help_requests() to authenticated;
