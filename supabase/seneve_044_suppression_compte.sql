-- SÉNEVÉ 044 — Suppression d'un compte par un administrateur (règle validée par Dr Justin le 23/10/2026).
-- Effacé : compte de connexion (e-mail, mot de passe), prénom, journal, coach, objectif, freins, progression,
-- parcours et accès, demandes d'aide et leurs réponses, rappels, liaison WhatsApp, choix d'e-mails.
-- Gardé sans nom ni e-mail : achats et paiements (comptabilité), et une ligne de suivi « compte supprimé ».
-- Non touchés ici : la feuille Google Sheets du système WhatsApp, et les sauvegardes de la nuit (30 jours).
-- Confirmation : l'administrateur retape l'adresse e-mail de la personne. Les comptes de l'équipe sont exclus.
create or replace function seneve.staff_supprimer_compte(p_email text, p_confirmation text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
  v_participant uuid;
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
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then raise exception 'Aucun compte avec cette adresse.' using errcode = 'P0002'; end if;
  if v_user = v_uid then raise exception 'Tu ne peux pas supprimer ton propre compte ici.' using errcode = '42501'; end if;
  if exists (select 1 from seneve.staff_roles where auth_user_id = v_user) then
    raise exception 'Ce compte fait partie de l''équipe : retire d''abord son rôle.' using errcode = '42501';
  end if;
  select participant_id into v_participant from seneve.participants where auth_user_id = v_user;

  if v_participant is not null then
    select coalesce(array_agg(request_id), '{}') into v_requests from seneve.help_requests where participant_id = v_participant;
    select coalesce(array_agg(enrollment_id), '{}') into v_enrollments from seneve.enrollments where participant_id = v_participant;
    v_compte := jsonb_build_object('demandes_aide', cardinality(v_requests), 'parcours', cardinality(v_enrollments));

    -- Demandes d'aide (leurs messages partent avec elles) et alertes en attente.
    delete from seneve.jobs where charge->>'request_id' = any (select r::text from unnest(v_requests) r);
    delete from seneve.help_requests where participant_id = v_participant;
    -- Tout ce qui dépend des parcours, puis les parcours et les accès.
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
    -- Achats gardés pour la comptabilité, sans lien avec la personne ni données personnelles.
    update seneve.payment_events
       set participant_id = null, email_acheteur = null,
           brut = jsonb_build_object('anonymise_le', now(), 'motif', 'compte supprimé')
     where participant_id = v_participant or (email_acheteur is not null and lower(email_acheteur) = v_email);
    update seneve.codes_places set participant_id = null where participant_id = v_participant;
    delete from seneve.codes_places_essais where participant_id = v_participant;
    -- Le reste suit (accords, WhatsApp, rappels, jetons) ; le test reste anonyme.
    delete from seneve.participants where participant_id = v_participant;
  end if;

  delete from auth.users where id = v_user;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || v_uid::text, 'compte_supprime',
          case when v_participant is null then 'compte' else 'participant:' || v_participant::text end, 'ok',
          coalesce(v_compte, '{}'::jsonb));
  return jsonb_build_object('supprime', true) || coalesce(v_compte, '{}'::jsonb);
end $$;
revoke all on function seneve.staff_supprimer_compte(text, text) from public, anon;
grant execute on function seneve.staff_supprimer_compte(text, text) to authenticated;
