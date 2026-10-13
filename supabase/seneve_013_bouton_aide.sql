-- SÉNEVÉ 013 — Le bouton « J'ai besoin d'aide » sous l'action du jour prévient l'équipe.
-- record_progress(..., 'aide_demandee') crée désormais une demande d'aide (help_requests) et son alerte
-- (job 'aide_demandee'), exactement comme la page /aide. Le circuit existant fait le reste :
-- e-mail d'alerte à l'équipe, traitement dans l'administration, e-mail au participant une fois résolue.
-- Rien n'est partagé du journal : la demande contient seulement le jour et la consigne de l'action.
-- Idempotent : la demande reprend l'identifiant de l'événement (un nouvel envoi ne crée pas de doublon),
-- et une seule demande automatique par action (si l'aide était déjà signalée, rien de nouveau).

create or replace function seneve.record_progress(p_enrollment_id uuid, p_activity_id uuid, p_client_event_id uuid, p_etat text, p_canal text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_participant uuid := seneve.current_participant_id();
  v_enr   seneve.enrollments%rowtype;
  v_empreinte text;
  v_existant  seneve.progress_events%rowtype;
  v_event_id  uuid;
  v_etat  seneve.activity_state%rowtype;
  v_rang_nouveau int;
  v_aide_avant boolean;
  v_jour int;
  v_consigne text;
  v_recentes int;
  v_request_id uuid;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if p_etat not in ('preparee','partielle','realisee','aide_demandee') then
    raise exception 'État inconnu.' using errcode = '22023';
  end if;
  if p_canal not in ('web','whatsapp','mobile') then
    raise exception 'Canal inconnu.' using errcode = '22023';
  end if;

  select * into v_enr from seneve.enrollments
   where enrollment_id = p_enrollment_id and participant_id = v_participant;
  if not found then
    raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_enr.etat <> 'active' then
    raise exception 'Cette inscription n''est pas active.' using errcode = '42501';
  end if;
  select c.jour, a.consigne into v_jour, v_consigne
    from seneve.activities a join seneve.contents c using (content_id)
   where a.activity_id = p_activity_id
     and c.programme_id = v_enr.programme_id and c.version = v_enr.version;
  if not found then
    raise exception 'Activité non autorisée pour cette inscription.' using errcode = '42501';
  end if;

  v_empreinte := md5(p_enrollment_id::text || '|' || p_activity_id::text || '|' || p_etat || '|' || p_canal);

  insert into seneve.progress_events (client_event_id, enrollment_id, activity_id, nouvel_etat, canal, empreinte)
  values (p_client_event_id, p_enrollment_id, p_activity_id, p_etat, p_canal, v_empreinte)
  on conflict (client_event_id) do nothing
  returning event_id into v_event_id;

  if v_event_id is null then
    select * into v_existant from seneve.progress_events where client_event_id = p_client_event_id;
    if v_existant.empreinte <> v_empreinte then
      raise exception 'Cet identifiant d''événement a déjà servi pour une autre action.' using errcode = '23505';
    end if;
    select * into v_etat from seneve.activity_state
     where enrollment_id = p_enrollment_id and activity_id = p_activity_id;
    return jsonb_build_object('event_id', v_existant.event_id, 'etat', v_etat.etat,
                              'aide_demandee', v_etat.aide_demandee, 'repetition', true);
  end if;

  select s.aide_demandee into v_aide_avant from seneve.activity_state s
   where s.enrollment_id = p_enrollment_id and s.activity_id = p_activity_id;
  v_aide_avant := coalesce(v_aide_avant, false);

  v_rang_nouveau := case p_etat when 'preparee' then 1 when 'partielle' then 2 when 'realisee' then 3 else 0 end;
  insert into seneve.activity_state as s (enrollment_id, activity_id, etat, aide_demandee, realisee_le)
  values (p_enrollment_id, p_activity_id,
          case when p_etat = 'aide_demandee' then 'non_commencee' else p_etat end,
          p_etat = 'aide_demandee',
          case when p_etat = 'realisee' then now() end)
  on conflict (enrollment_id, activity_id) do update set
    etat = case when v_rang_nouveau >
                     (case s.etat when 'preparee' then 1 when 'partielle' then 2 when 'realisee' then 3 else 0 end)
                then excluded.etat else s.etat end,
    aide_demandee = s.aide_demandee or excluded.aide_demandee,
    realisee_le = coalesce(s.realisee_le, excluded.realisee_le),
    modifie_le = now()
  returning * into v_etat;

  insert into seneve.jobs (type, cle_logique, charge)
  values ('reevaluer_rappels', 'progress:' || v_event_id::text,
          jsonb_build_object('enrollment_id', p_enrollment_id, 'activity_id', p_activity_id, 'event_id', v_event_id));

  -- Nouveau : première demande d'aide sur cette action → demande transmise à l'équipe.
  if p_etat = 'aide_demandee' and not v_aide_avant then
    select count(*) into v_recentes from seneve.help_requests
     where participant_id = v_participant and cree_le > now() - interval '24 hours';
    if v_recentes < 10 then
      insert into seneve.help_requests (client_request_id, participant_id, enrollment_id, motif)
      values (p_client_event_id, v_participant, p_enrollment_id,
              left('A appuyé sur « J''ai besoin d''aide » pour l''action du jour ' || v_jour || ' : ' || btrim(v_consigne), 2000))
      on conflict do nothing
      returning request_id into v_request_id;
      if v_request_id is not null then
        insert into seneve.jobs (type, cle_logique, charge)
        values ('aide_demandee', 'aide:' || v_request_id::text, jsonb_build_object('request_id', v_request_id));
        insert into seneve.audit_events (acteur, action, objet, resultat, details)
        values ('participant:' || v_participant::text, 'demande_aide_creee', 'help_request:' || v_request_id::text, 'ok',
                jsonb_build_object('origine', 'bouton_action', 'activity_id', p_activity_id, 'canal', p_canal));
      end if;
    end if;
  end if;

  return jsonb_build_object('event_id', v_event_id, 'etat', v_etat.etat,
                            'aide_demandee', v_etat.aide_demandee, 'repetition', false,
                            'demande_aide', v_request_id);
end $function$;
