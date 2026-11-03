-- SÉNEVÉ 054 — Débloquer la suppression d'un compte qui a utilisé un code de place offerte (03/11/2026).
-- Constat (production, 03/11/2026, essai annulé) : la suppression échouait avec
--   « codes_places violates check constraint codes_places_check » : un code « utilisé » devait garder le participant.
-- Correction : un code utilisé peut perdre le lien avec la personne (place toujours comptée « utilisée », sans nom),
-- comme les achats (règle du 23/10/2026). Ajout d'un message clair si le compte a des données Habitudes & Défis.
-- Retour arrière : en bas du fichier.

alter table seneve.codes_places drop constraint codes_places_check;
alter table seneve.codes_places add constraint codes_places_check
  check ((etat = 'utilise') = (utilise_le is not null) and (participant_id is null or etat = 'utilise'));

create or replace function seneve.staff_supprimer_compte(p_email text, p_confirmation text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
  v_adresse text;
  v_participant uuid;
  v_prenom text;
  v_langue text;
  v_requests uuid[];
  v_enrollments uuid[];
  v_compte jsonb;
begin
  if v_uid is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if not seneve.has_role('administrateur') then
    raise exception 'Seul un administrateur peut supprimer un compte.' using errcode = '42501';
  end if;
  if v_email = '' or v_email <> lower(btrim(coalesce(p_confirmation, ''))) then
    raise exception 'L''adresse retapée ne correspond pas.' using errcode = '22023';
  end if;
  select id, email into v_user, v_adresse from auth.users where lower(email) = v_email;
  if v_user is null then raise exception 'Aucun compte avec cette adresse.' using errcode = 'P0002'; end if;
  if v_user = v_uid then raise exception 'Tu ne peux pas supprimer ton propre compte ici.' using errcode = '42501'; end if;
  if exists (select 1 from seneve.staff_roles where auth_user_id = v_user) then
    raise exception 'Ce compte fait partie de l''équipe : retire d''abord son rôle.' using errcode = '42501';
  end if;
  select participant_id, prenom, langue into v_participant, v_prenom, v_langue from seneve.participants where auth_user_id = v_user;

  if v_participant is not null then
    -- 054 : les données Habitudes & Défis ne sont pas encore prises en charge ici ; message clair au lieu d'une erreur technique.
    if exists (select 1 from seneve.hd_access_periods where participant_id = v_participant)
       or exists (select 1 from seneve.hd_habit_schedules where participant_id = v_participant)
       or exists (select 1 from seneve.hd_period_plans where participant_id = v_participant)
       or exists (select 1 from seneve.hd_cycles_planifies where participant_id = v_participant)
       or exists (select 1 from seneve.hd_activity_reminders r join seneve.enrollments e using (enrollment_id) where e.participant_id = v_participant)
       or exists (select 1 from seneve.hd_progress_corrections c join seneve.enrollments e using (enrollment_id) where e.participant_id = v_participant) then
      raise exception 'Ce compte a des données Habitudes & Défis : leur suppression n''est pas encore prévue ici. Rien n''a été effacé.' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(request_id), '{}') into v_requests from seneve.help_requests where participant_id = v_participant;
    select coalesce(array_agg(enrollment_id), '{}') into v_enrollments from seneve.enrollments where participant_id = v_participant;
    v_compte := jsonb_build_object('demandes_aide', cardinality(v_requests), 'parcours', cardinality(v_enrollments));

    delete from seneve.jobs where charge->>'request_id' = any (select r::text from unnest(v_requests) r);
    delete from seneve.help_requests where participant_id = v_participant;
    delete from seneve.activity_state where enrollment_id = any (v_enrollments);
    delete from seneve.progress_events where enrollment_id = any (v_enrollments);
    delete from seneve.communications where enrollment_id = any (v_enrollments);
    delete from seneve.journal_entries where participant_id = v_participant;
    delete from seneve.goals where participant_id = v_participant;
    delete from seneve.obstacles where participant_id = v_participant;
    delete from seneve.coach_messages where participant_id = v_participant;
    delete from seneve.parcours_planifies where participant_id = v_participant;
    delete from seneve.enrollments where participant_id = v_participant;
    delete from seneve.entitlements where participant_id = v_participant;
    update seneve.payment_events
       set participant_id = null, email_acheteur = null,
           brut = jsonb_build_object('anonymise_le', now(), 'motif', 'compte supprimé')
     where participant_id = v_participant or (email_acheteur is not null and lower(email_acheteur) = v_email);
    update seneve.codes_places set participant_id = null where participant_id = v_participant;
    delete from seneve.codes_places_essais where participant_id = v_participant;
    delete from seneve.participants where participant_id = v_participant;
  end if;

  delete from auth.users where id = v_user;

  -- E-mail de confirmation à la personne (envoyé par n8n, puis l'adresse est effacée de la tâche).
  insert into seneve.jobs (type, cle_logique, charge)
  values ('compte_supprime_email', 'compte_supprime:' || v_user::text,
          jsonb_build_object('email', v_adresse, 'prenom', coalesce(v_prenom, ''), 'langue', coalesce(v_langue, 'fr'), 'supprime_le', now()))
  on conflict (cle_logique) do nothing;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || v_uid::text, 'compte_supprime',
          case when v_participant is null then 'compte' else 'participant:' || v_participant::text end, 'ok',
          coalesce(v_compte, '{}'::jsonb));
  return jsonb_build_object('supprime', true, 'email_prevu', true) || coalesce(v_compte, '{}'::jsonb);
end $$;
revoke all on function seneve.staff_supprimer_compte(text, text) from public, anon;
grant execute on function seneve.staff_supprimer_compte(text, text) to authenticated;

-- Retour arrière (à n'utiliser que si aucun compte n'a été supprimé depuis) :
-- alter table seneve.codes_places drop constraint codes_places_check;
-- alter table seneve.codes_places add constraint codes_places_check
--   check ((etat = 'utilise') = ((participant_id is not null) and (utilise_le is not null)));
-- puis réappliquer la partie 1 de seneve_045_email_suppression.sql.
