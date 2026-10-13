-- SÉNEVÉ 016 — Demande de séance 1-à-1 (Accompagnement personnel).
-- Décision de Dr Justin du 13/10/2026 (21 h 47) : au jour d'une séance, le participant peut appuyer sur
-- « Demander ma séance ». Une demande arrive dans l'Administration (même circuit que l'aide : alerte e-mail,
-- traitement, e-mail de résolution). Dr Justin contacte la personne pour fixer l'heure.
-- Aucun agenda automatique, aucune heure ni aucun délai promis.
-- Jours des séances : colonne « jours_appels » de la feuille PROGRAMMES (relevée le 13/10/2026).

alter table seneve.programmes add column if not exists jours_seances int[];
update seneve.programmes set jours_seances = '{7,14,21,30}' where programme_id in ('ACHETEUR_ACCOMP30_30J_FR_V1','ACHETEUR_ACCOMP30_30J_EN_V1');
update seneve.programmes set jours_seances = '{30,60,90}' where programme_id in ('ACHETEUR_ACCOMP90_90J_FR_V1','ACHETEUR_ACCOMP90_90J_EN_V1');

-- Identifiant stable d'une séance : une seule demande possible par inscription et par séance.
create or replace function seneve._seance_request_id(p_enrollment_id uuid, p_numero int)
returns uuid language sql immutable set search_path to '' as $$
  select md5('seance|' || p_enrollment_id::text || '|' || p_numero::text)::uuid
$$;

-- État des séances d'une inscription du participant connecté.
create or replace function seneve.seances_etat(p_enrollment_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_enr seneve.enrollments%rowtype;
  v_jours int[];
  v_jour int;
  v_res jsonb := '[]';
  i int;
  v_req seneve.help_requests%rowtype;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant;
  if not found then raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501'; end if;
  select jours_seances into v_jours from seneve.programmes where programme_id = v_enr.programme_id;
  if v_jours is null or cardinality(v_jours) = 0 then return jsonb_build_object('seances', '[]'::jsonb); end if;
  v_jour := ((now() at time zone 'Africa/Kinshasa')::date - v_enr.date_debut) + 1;
  for i in 1 .. cardinality(v_jours) loop
    select * into v_req from seneve.help_requests where client_request_id = seneve._seance_request_id(p_enrollment_id, i);
    v_res := v_res || jsonb_build_object('numero', i, 'jour', v_jours[i],
      'ouverte', v_jour >= v_jours[i] and v_enr.etat = 'active',
      'demande', case when v_req.request_id is null then null else jsonb_build_object('etat', v_req.etat, 'cree_le', v_req.cree_le) end);
  end loop;
  return jsonb_build_object('jour', v_jour, 'seances', v_res);
end $$;

-- Demande d'une séance : crée la demande et son alerte (une seule fois par séance).
create or replace function seneve.seance_demander(p_enrollment_id uuid, p_numero int)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_enr seneve.enrollments%rowtype;
  v_prog seneve.programmes%rowtype;
  v_jour int;
  v_cle uuid;
  v_id uuid;
  v_existante seneve.help_requests%rowtype;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant;
  if not found then raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501'; end if;
  if v_enr.etat <> 'active' then raise exception 'Cette inscription n''est pas active.' using errcode = '42501'; end if;
  select * into v_prog from seneve.programmes where programme_id = v_enr.programme_id;
  if v_prog.jours_seances is null or p_numero is null or p_numero < 1 or p_numero > cardinality(v_prog.jours_seances) then
    raise exception 'Séance inconnue pour ce parcours.' using errcode = '22023';
  end if;
  v_jour := ((now() at time zone 'Africa/Kinshasa')::date - v_enr.date_debut) + 1;
  if v_jour < v_prog.jours_seances[p_numero] then
    raise exception 'Cette séance n''est pas encore ouverte.' using errcode = '42501';
  end if;

  v_cle := seneve._seance_request_id(p_enrollment_id, p_numero);
  select * into v_existante from seneve.help_requests where client_request_id = v_cle;
  if found then
    return jsonb_build_object('request_id', v_existante.request_id, 'etat', v_existante.etat, 'repetition', true);
  end if;

  insert into seneve.help_requests (client_request_id, participant_id, enrollment_id, motif)
  values (v_cle, v_participant, p_enrollment_id,
          format('Demande de séance 1-à-1 n° %s (prévue au jour %s) — %s. À contacter pour fixer l''heure.',
                 p_numero, v_prog.jours_seances[p_numero], coalesce(v_prog.nom, v_enr.programme_id)))
  returning request_id into v_id;
  insert into seneve.jobs (type, cle_logique, charge)
  values ('aide_demandee', 'aide:' || v_id::text, jsonb_build_object('request_id', v_id));
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, 'seance_demandee', 'help_request:' || v_id::text, 'ok',
          jsonb_build_object('enrollment_id', p_enrollment_id, 'seance', p_numero));
  return jsonb_build_object('request_id', v_id, 'etat', 'recue', 'repetition', false);
end $$;

revoke all on function seneve._seance_request_id(uuid, int) from public, anon, authenticated;
revoke all on function seneve.seances_etat(uuid) from public, anon;
revoke all on function seneve.seance_demander(uuid, int) from public, anon;
grant execute on function seneve.seances_etat(uuid) to authenticated;
grant execute on function seneve.seance_demander(uuid, int) to authenticated;
