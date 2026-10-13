-- SÉNEVÉ 010 — E-mail au participant quand sa demande d'aide est résolue.
-- * staff_update_help_request prépare une tâche « aide_resolue » quand l'état passe à « résolue » ;
--   si la demande est rouverte avant l'envoi, la tâche est annulée.
-- * n8n réserve ces tâches (claim_resolution_emails), envoie l'e-mail, puis clôture (finish_resolution_email).
-- * Une demande annulée par le participant ou sans e-mail ne reçoit rien.
-- Aucune donnée existante n'est modifiée.

create or replace function seneve.staff_update_help_request(
  p_request_id uuid,
  p_modifie_le timestamptz,
  p_etat text,
  p_reponse text,
  p_affecte_a uuid default null)
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

  -- Seul l'administrateur confie une demande ; l'accompagnateur garde l'affectation existante.
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
          jsonb_build_object('changements', to_jsonb(v_changes), 'etat', v_etat,
                             'affecte_a', v_affecte));

  return jsonb_build_object('request_id', p_request_id, 'etat', v_req.etat, 'modifie_le', v_req.modifie_le,
                            'changements', to_jsonb(v_changes));
end $$;


create or replace function seneve.claim_resolution_emails(p_limite int default 10)
returns table (job_id uuid, request_id uuid, email text, prenom text, langue text,
               motif text, reponse text, cree_le timestamptz, tentatives int)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  -- Plus rien à envoyer si la demande n'est plus résolue ou si la personne n'a pas d'e-mail.
  update seneve.jobs j set etat = 'annulee', erreur = 'demande non résolue ou sans e-mail'
   where j.type = 'aide_resolue' and j.etat = 'en_attente'
     and not exists (
       select 1 from seneve.help_requests h
         join seneve.participants p on p.participant_id = h.participant_id
         join auth.users u on u.id = p.auth_user_id
        where h.request_id = (j.charge->>'request_id')::uuid and h.etat = 'resolue'
          and coalesce(u.email, '') <> '');
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'aide_resolue'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '15 minutes'))
          and x.echeance <= now() and x.tentatives < 5
        order by x.cree_le limit greatest(1, least(p_limite, 50))
        for update skip locked)
    returning j.job_id, (j.charge->>'request_id')::uuid as rid, j.tentatives)
  select pris.job_id, h.request_id, u.email::text, p.prenom, p.langue, h.motif, h.reponse, h.cree_le, pris.tentatives
    from pris join seneve.help_requests h on h.request_id = pris.rid
    join seneve.participants p on p.participant_id = h.participant_id
    join auth.users u on u.id = p.auth_user_id;
end $$;

create or replace function seneve.finish_resolution_email(p_job_id uuid, p_ok boolean, p_erreur text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update seneve.jobs
     set etat = case when p_ok then 'terminee' when tentatives >= 5 then 'a_examiner' else 'en_attente' end,
         erreur = case when p_ok then null else left(coalesce(p_erreur, 'erreur inconnue'), 500) end,
         echeance = case when p_ok then echeance else now() + interval '10 minutes' end
   where job_id = p_job_id and type = 'aide_resolue' and etat = 'en_traitement';
  if p_ok then
    insert into seneve.audit_events (acteur, action, objet, resultat)
    select 'n8n', 'email_resolution_envoye', 'help_request:' || (charge->>'request_id'), 'ok'
      from seneve.jobs where job_id = p_job_id;
  end if;
end $$;

revoke all on function seneve.claim_resolution_emails(int) from public, anon, authenticated;
revoke all on function seneve.finish_resolution_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function seneve.claim_resolution_emails(int) to service_role;
grant execute on function seneve.finish_resolution_email(uuid, boolean, text) to service_role;
