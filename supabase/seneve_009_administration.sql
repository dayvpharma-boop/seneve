-- SÉNEVÉ 009 — Interface administrateur : traitement des demandes d'aide et gestion de l'équipe.
-- Règles (cahier des charges, numéros 5, 6 et 9) :
--   * administrateur : voit toutes les demandes, les confie, gère les rôles ;
--   * accompagnateur : ne voit et ne traite que les demandes qui lui sont confiées ;
--   * personne de l'équipe n'accède au journal : seuls les extraits joints par le participant sont visibles ;
--   * chaque modification est tracée dans audit_events (sans recopier le contenu des messages).
-- Tout passe par des fonctions contrôlées : aucune table n'est ouverte en écriture à l'équipe.

-- 1) Qui suis-je ? (affichage de l'interface) -----------------------------------------------------
create or replace function seneve.staff_me()
returns jsonb language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'roles', coalesce((select jsonb_agg(role order by role) from seneve.staff_roles
                        where auth_user_id = (select auth.uid())
                          and role in ('administrateur', 'accompagnateur')), '[]'::jsonb),
    'admin', seneve.has_role('administrateur'))
$$;

-- 2) Liste des demandes visibles par la personne connectée ----------------------------------------
create or replace function seneve.staff_list_help_requests()
returns table (request_id uuid, cree_le timestamptz, modifie_le timestamptz, etat text, motif text,
               extraits_partages text, reponse text, affecte_a uuid, affecte_email text,
               prenom text, langue text, programme_id text, email text, whatsapp text)
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
           order by c.verifiee_le desc limit 1)
    from seneve.help_requests h
    join seneve.participants p on p.participant_id = h.participant_id
    left join auth.users u on u.id = p.auth_user_id
    left join auth.users ua on ua.id = h.affecte_a
    left join seneve.enrollments e on e.enrollment_id = h.enrollment_id
   where v_admin or h.affecte_a = v_uid
   order by h.cree_le desc
   limit 500;
end $$;

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

  if v_etat is distinct from v_req.etat then v_changes := v_changes || 'etat'; end if;
  if v_reponse is distinct from v_req.reponse then v_changes := v_changes || 'reponse'; end if;
  if v_affecte is distinct from v_req.affecte_a then v_changes := v_changes || 'affectation'; end if;
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

-- 4) Équipe : liste et gestion des rôles (administrateur seulement) -------------------------------
create or replace function seneve.staff_list_team()
returns table (auth_user_id uuid, email text, prenom text, roles text[])
language plpgsql stable security definer set search_path to '' as $$
#variable_conflict use_column
begin
  if not seneve.has_role('administrateur') then
    raise exception 'Accès réservé à l''administrateur.' using errcode = '42501';
  end if;
  return query
  select s.auth_user_id, u.email::text, max(p.prenom), array_agg(s.role order by s.role)
    from seneve.staff_roles s
    join auth.users u on u.id = s.auth_user_id
    left join seneve.participants p on p.auth_user_id = s.auth_user_id
   where s.role in ('administrateur', 'accompagnateur')
   group by s.auth_user_id, u.email
   order by u.email;
end $$;

-- Donne ou retire un rôle à une personne qui a déjà un compte SÉNEVÉ (identifiée par son e-mail).
create or replace function seneve.staff_set_role(p_email text, p_role text, p_actif boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_cible uuid;
  v_restants int;
begin
  if not seneve.has_role('administrateur') then
    raise exception 'Accès réservé à l''administrateur.' using errcode = '42501';
  end if;
  if p_role not in ('administrateur', 'accompagnateur') then
    raise exception 'Rôle non autorisé.' using errcode = '22023';
  end if;
  select id into v_cible from auth.users where lower(email) = lower(btrim(coalesce(p_email, '')));
  if v_cible is null then
    raise exception 'Aucun compte SÉNEVÉ avec cet e-mail. La personne doit d''abord créer son compte.' using errcode = 'P0002';
  end if;
  if p_actif then
    insert into seneve.staff_roles (auth_user_id, role) values (v_cible, p_role)
    on conflict (auth_user_id, role) do nothing;
  else
    if p_role = 'administrateur' then
      select count(*) into v_restants from seneve.staff_roles where role = 'administrateur' and auth_user_id <> v_cible;
      if v_restants = 0 then
        raise exception 'Il doit rester au moins un administrateur.' using errcode = 'P0001';
      end if;
    end if;
    if p_role = 'accompagnateur' and exists (
         select 1 from seneve.help_requests where affecte_a = v_cible and etat not in ('resolue', 'annulee')) then
      raise exception 'Cette personne a encore des demandes en cours : confie-les d''abord à quelqu''un d''autre.' using errcode = 'P0001';
    end if;
    delete from seneve.staff_roles where auth_user_id = v_cible and role = p_role;
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || v_uid::text, case when p_actif then 'role_donne' else 'role_retire' end,
          'auth_user:' || v_cible::text, 'ok', jsonb_build_object('role', p_role));
  return jsonb_build_object('auth_user_id', v_cible, 'role', p_role, 'actif', p_actif);
end $$;

-- 5) Droits ---------------------------------------------------------------------------------------
revoke all on function seneve.staff_me() from public, anon;
revoke all on function seneve.staff_list_help_requests() from public, anon;
revoke all on function seneve.staff_update_help_request(uuid, timestamptz, text, text, uuid) from public, anon;
revoke all on function seneve.staff_list_team() from public, anon;
revoke all on function seneve.staff_set_role(text, text, boolean) from public, anon;
grant execute on function seneve.staff_me() to authenticated;
grant execute on function seneve.staff_list_help_requests() to authenticated;
grant execute on function seneve.staff_update_help_request(uuid, timestamptz, text, text, uuid) to authenticated;
grant execute on function seneve.staff_list_team() to authenticated;
grant execute on function seneve.staff_set_role(text, text, boolean) to authenticated;

-- 6) Premier administrateur : Dr Justin Tshims (décision du 13 octobre 2026) -----------------------
insert into seneve.staff_roles (auth_user_id, role)
select id, 'administrateur' from auth.users where lower(email) = 'dayvpharma@gmail.com'
on conflict (auth_user_id, role) do nothing;
