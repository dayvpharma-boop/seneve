-- SÉNEVÉ 019 — Fin des parcours venant de la feuille INSCRIPTIONS (décision de Dr Justin, 14/10/2026 07:44 : « Oui pour les deux »).
-- 1. Un parcours venant de la feuille (WhatsApp / achat) se ferme aussi dans l'espace web à la fin de sa durée,
--    même si la feuille garde « actif » (SUIVI QUOTIDIEN arrête les messages mais ne change pas le statut).
--    La synchronisation ne le rouvre pas, sauf si la feuille donne une nouvelle date de début qui le remet en cours.
-- 2. La synchronisation recopie une date de début modifiée dans la feuille (mise en attente « un programme à la fois »).
-- La feuille et les workflows WhatsApp ne sont pas modifiés. Rien n'est effacé.

-- Règle commune pour une inscription déjà présente dans la base.
create or replace function seneve._sync_legacy_existante(p_enrollment_id uuid, p_etat text, p_date_debut text)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_enr seneve.enrollments%rowtype;
  v_duree int;
  v_fuseau text;
  v_debut date;
  v_fin date;
  v_cible text;
begin
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id for update;
  select coalesce(duree_jours, 7) into v_duree from seneve.programmes where programme_id = v_enr.programme_id;
  select coalesce(nullif(fuseau, ''), 'Africa/Kinshasa') into v_fuseau from seneve.participants where participant_id = v_enr.participant_id;
  begin
    v_debut := (p_date_debut::timestamptz at time zone 'Africa/Kinshasa')::date;
  exception when others then
    v_debut := v_enr.date_debut;   -- date illisible : on garde la date connue
  end;
  v_debut := coalesce(v_debut, v_enr.date_debut);
  v_fin := v_debut + (v_duree - 1);

  if p_etat in ('active', 'en_pause') and (now() at time zone v_fuseau)::date > v_fin then
    v_cible := 'terminee';         -- durée écoulée : le parcours reste (ou devient) terminé
  else
    v_cible := p_etat;
  end if;

  if v_cible = 'terminee' and v_enr.etat = 'terminee' then
    return 'inchangee';
  end if;
  if v_enr.etat = v_cible and v_enr.date_debut = v_debut and v_enr.date_fin_prevue is not distinct from v_fin then
    return 'inchangee';
  end if;

  update seneve.enrollments
     set etat = v_cible,
         date_debut = case when v_cible in ('active', 'en_pause') then v_debut else date_debut end,
         date_fin_prevue = case when v_cible in ('active', 'en_pause') then v_fin else date_fin_prevue end
   where enrollment_id = p_enrollment_id;
  if v_cible = 'terminee' and v_enr.etat <> 'terminee' then
    update seneve.communications set etat = 'annule', modifie_le = now()
     where enrollment_id = p_enrollment_id and etat = 'planifie';
  end if;
  return 'mise_a_jour';
end $$;
revoke all on function seneve._sync_legacy_existante(uuid, text, text) from public, anon, authenticated;

-- Synchronisation par numéro WhatsApp vérifié (même signature, même contrôles qu'avant).
create or replace function seneve.sync_legacy_enrollment(p_inscription_id text, p_identite_canal text, p_programme_id text, p_date_debut text, p_statut text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid;
  v_prog  seneve.programmes%rowtype;
  v_version int;
  v_debut date;
  v_etat text;
  v_enr seneve.enrollments%rowtype;
  v_res text;
begin
  if coalesce(trim(p_inscription_id),'') = '' or coalesce(trim(p_identite_canal),'') = '' then
    return jsonb_build_object('resultat','donnees_incompletes');
  end if;

  v_etat := case lower(trim(coalesce(p_statut,'')))
              when 'actif' then 'active' when 'active' then 'active'
              when 'pause' then 'en_pause' when 'en_pause' then 'en_pause'
              when 'arrete' then 'annulee' when 'arrêté' then 'annulee' when 'arrete_admin' then 'annulee'
              when 'termine' then 'terminee' when 'terminé' then 'terminee'
              else null end;
  if v_etat is null then
    return jsonb_build_object('resultat','statut_inconnu','statut',p_statut);
  end if;

  select participant_id into v_participant from seneve.channel_links
   where canal = 'whatsapp' and identite_canal = trim(p_identite_canal) and etat = 'verifiee';
  if v_participant is null then
    return jsonb_build_object('resultat','numero_non_relie');
  end if;

  select * into v_enr from seneve.enrollments where legacy_inscription_id = p_inscription_id;

  if not found then
    if v_etat in ('annulee','terminee') then
      return jsonb_build_object('resultat','ignoree_non_active');
    end if;
    select * into v_prog from seneve.programmes where programme_id = p_programme_id;
    select version into v_version from seneve.programme_versions
     where programme_id = p_programme_id and etat = 'publiee';
    if v_version is null then
      return jsonb_build_object('resultat','programme_non_publie');
    end if;
    if exists (select 1 from seneve.enrollments
                where participant_id = v_participant and programme_id = p_programme_id
                  and etat in ('active','en_pause')) then
      return jsonb_build_object('resultat','deja_inscrit_autrement');
    end if;
    begin
      v_debut := (p_date_debut::timestamptz at time zone 'Africa/Kinshasa')::date;
    exception when others then
      return jsonb_build_object('resultat','date_invalide');
    end;
    if (now() at time zone 'Africa/Kinshasa')::date > v_debut + (coalesce(v_prog.duree_jours, 7) - 1) then
      return jsonb_build_object('resultat','ignoree_deja_terminee');
    end if;
    insert into seneve.enrollments (legacy_inscription_id, participant_id, programme_id, version,
                                    langue, date_debut, date_fin_prevue, etat)
    values (p_inscription_id, v_participant, p_programme_id, v_version, v_prog.langue, v_debut,
            case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end,
            v_etat)
    returning * into v_enr;
    v_res := 'creee';
  else
    if v_enr.participant_id <> v_participant then
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('n8n', 'sync_inscription', p_inscription_id, 'conflit_compte', '{}'::jsonb);
      return jsonb_build_object('resultat','conflit_compte');
    end if;
    v_res := seneve._sync_legacy_existante(v_enr.enrollment_id, v_etat, p_date_debut);
    select * into v_enr from seneve.enrollments where enrollment_id = v_enr.enrollment_id;
    if v_res = 'inchangee' then
      return jsonb_build_object('resultat','inchangee','enrollment_id',v_enr.enrollment_id,'etat',v_enr.etat);
    end if;
  end if;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('n8n', 'sync_inscription', p_inscription_id, v_res,
          jsonb_build_object('enrollment_id', v_enr.enrollment_id, 'etat', v_enr.etat, 'date_debut', v_enr.date_debut));
  return jsonb_build_object('resultat', v_res, 'enrollment_id', v_enr.enrollment_id, 'etat', v_enr.etat);
end $$;

-- Synchronisation par adresse e-mail confirmée (même signature, même contrôles qu'avant).
create or replace function seneve.sync_legacy_enrollment_email(p_inscription_id text, p_email text, p_programme_id text, p_date_debut text, p_statut text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid;
  v_participant uuid;
  v_prog seneve.programmes%rowtype;
  v_version int;
  v_debut date;
  v_etat text;
  v_enr seneve.enrollments%rowtype;
  v_res text;
begin
  if coalesce(trim(p_inscription_id),'') = '' or coalesce(trim(p_email),'') = '' then
    return jsonb_build_object('resultat','donnees_incompletes');
  end if;

  v_etat := case lower(trim(coalesce(p_statut,'')))
              when 'actif' then 'active' when 'active' then 'active'
              when 'pause' then 'en_pause' when 'en_pause' then 'en_pause'
              when 'arrete' then 'annulee' when 'arrêté' then 'annulee' when 'arrete_admin' then 'annulee'
              when 'termine' then 'terminee' when 'terminé' then 'terminee'
              else null end;
  if v_etat is null then
    return jsonb_build_object('resultat','statut_inconnu','statut',p_statut);
  end if;

  select u.id into v_user from auth.users u
   where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;
  if v_user is null then
    return jsonb_build_object('resultat','aucun_compte_confirme');
  end if;

  select participant_id into v_participant from seneve.participants where auth_user_id = v_user;
  if v_participant is null then
    insert into seneve.participants (auth_user_id, prenom)
    select v_user, nullif(trim(u.raw_user_meta_data->>'prenom'), '') from auth.users u where u.id = v_user
    returning participant_id into v_participant;
  end if;

  select * into v_enr from seneve.enrollments where legacy_inscription_id = p_inscription_id;

  if not found then
    if v_etat in ('annulee','terminee') then
      return jsonb_build_object('resultat','ignoree_non_active');
    end if;
    select * into v_prog from seneve.programmes where programme_id = p_programme_id;
    select version into v_version from seneve.programme_versions
     where programme_id = p_programme_id and etat = 'publiee';
    if v_version is null then
      return jsonb_build_object('resultat','programme_non_publie');
    end if;
    if exists (select 1 from seneve.enrollments
                where participant_id = v_participant and programme_id = p_programme_id
                  and etat in ('active','en_pause')) then
      return jsonb_build_object('resultat','deja_inscrit_autrement');
    end if;
    begin
      v_debut := (p_date_debut::timestamptz at time zone 'Africa/Kinshasa')::date;
    exception when others then
      return jsonb_build_object('resultat','date_invalide');
    end;
    if (now() at time zone 'Africa/Kinshasa')::date > v_debut + (coalesce(v_prog.duree_jours, 7) - 1) then
      return jsonb_build_object('resultat','ignoree_deja_terminee');
    end if;
    insert into seneve.enrollments (legacy_inscription_id, participant_id, programme_id, version,
                                    langue, date_debut, date_fin_prevue, etat)
    values (p_inscription_id, v_participant, p_programme_id, v_version, v_prog.langue, v_debut,
            case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end,
            v_etat)
    returning * into v_enr;
    v_res := 'creee';
  else
    if v_enr.participant_id <> v_participant then
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('n8n', 'sync_inscription_email', p_inscription_id, 'conflit_compte', '{}'::jsonb);
      return jsonb_build_object('resultat','conflit_compte');
    end if;
    v_res := seneve._sync_legacy_existante(v_enr.enrollment_id, v_etat, p_date_debut);
    select * into v_enr from seneve.enrollments where enrollment_id = v_enr.enrollment_id;
    if v_res = 'inchangee' then
      return jsonb_build_object('resultat','inchangee','enrollment_id',v_enr.enrollment_id,'etat',v_enr.etat);
    end if;
  end if;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('n8n', 'sync_inscription_email', p_inscription_id, v_res,
          jsonb_build_object('enrollment_id', v_enr.enrollment_id, 'etat', v_enr.etat, 'date_debut', v_enr.date_debut, 'liaison', 'email_confirme'));
  return jsonb_build_object('resultat', v_res, 'enrollment_id', v_enr.enrollment_id, 'etat', v_enr.etat);
end $$;

-- Fin automatique : s'applique maintenant aussi aux inscriptions venant de la feuille.
create or replace function seneve.close_finished_enrollments()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_ids uuid[];
begin
  with fini as (
    update seneve.enrollments e set etat = 'terminee'
      from seneve.participants p, seneve.programmes pr
     where p.participant_id = e.participant_id
       and pr.programme_id = e.programme_id
       and e.etat in ('active', 'en_pause')
       and (now() at time zone coalesce(nullif(p.fuseau, ''), 'Africa/Kinshasa'))::date
           > coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 7) - 1))
    returning e.enrollment_id
  )
  select coalesce(array_agg(enrollment_id), '{}') into v_ids from fini;

  if cardinality(v_ids) > 0 then
    update seneve.communications set etat = 'annule', modifie_le = now()
     where enrollment_id = any(v_ids) and etat = 'planifie';
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    select 'systeme', 'parcours_termine', 'enrollment:' || x::text, 'ok', jsonb_build_object('regle', 'fin_de_duree')
      from unnest(v_ids) x;
  end if;
  return jsonb_build_object('termines', cardinality(v_ids));
end $$;

revoke all on function seneve.sync_legacy_enrollment(text, text, text, text, text) from public, anon, authenticated;
revoke all on function seneve.sync_legacy_enrollment_email(text, text, text, text, text) from public, anon, authenticated;
revoke all on function seneve.close_finished_enrollments() from public, anon, authenticated;
grant execute on function seneve.sync_legacy_enrollment(text, text, text, text, text) to service_role;
grant execute on function seneve.sync_legacy_enrollment_email(text, text, text, text, text) to service_role;
grant execute on function seneve.close_finished_enrollments() to service_role;
