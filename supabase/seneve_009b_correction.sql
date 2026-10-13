-- SÉNEVÉ 009b — Correction : enregistrement d'une demande par l'équipe (erreur « malformed array literal »).
-- Remplace uniquement la fonction staff_update_help_request ; aucune donnée n'est modifiée.

-- 3) Traiter une demande : état, réponse visible du participant, affectation -----------------------
-- p_modifie_le : date de la version lue ; si quelqu'un a modifié la demande entre-temps, rien n'est écrasé.
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

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || v_uid::text, 'demande_aide_traitee', 'help_request:' || p_request_id::text, 'ok',
          jsonb_build_object('changements', to_jsonb(v_changes), 'etat', v_etat,
                             'affecte_a', v_affecte));

  return jsonb_build_object('request_id', p_request_id, 'etat', v_req.etat, 'modifie_le', v_req.modifie_le,
                            'changements', to_jsonb(v_changes));
end $$;

