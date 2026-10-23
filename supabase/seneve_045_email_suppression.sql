-- SÉNEVÉ 045 — E-mail à la personne après la suppression de son compte (texte validé par Dr Justin le 23/10/2026).
-- L'adresse, le prénom et la langue sont gardés dans la tâche d'envoi seulement le temps d'envoyer l'e-mail,
-- puis effacés (après 5 essais sans succès, la tâche reste « à examiner » pour un envoi à la main).

-- 1. La suppression prépare l'e-mail (mêmes règles que 044, plus la tâche d'envoi).
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

-- 2. n8n réserve les e-mails de suppression à envoyer.
create or replace function seneve.claim_deletion_emails(p_limite int default 10)
returns table (job_id uuid, email text, prenom text, langue text, supprime_le timestamptz, tentatives int)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'compte_supprime_email'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '15 minutes'))
          and x.echeance <= now() and x.tentatives < 5
        order by x.cree_le limit greatest(1, least(p_limite, 50))
        for update skip locked)
    returning j.job_id, j.charge, j.tentatives)
  select pris.job_id, pris.charge->>'email', pris.charge->>'prenom', pris.charge->>'langue',
         (pris.charge->>'supprime_le')::timestamptz, pris.tentatives
    from pris where coalesce(pris.charge->>'email', '') <> '';
end $$;

-- 3. Clôture : après l'envoi, plus aucune donnée personnelle dans la tâche.
create or replace function seneve.finish_deletion_email(p_job_id uuid, p_ok boolean, p_erreur text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update seneve.jobs
     set etat = case when p_ok then 'terminee' when tentatives >= 5 then 'a_examiner' else 'en_attente' end,
         charge = case when p_ok then jsonb_build_object('envoye_le', now()) else charge end,
         erreur = case when p_ok then null else left(coalesce(p_erreur, 'erreur inconnue'), 500) end,
         echeance = case when p_ok then echeance else now() + interval '10 minutes' end
   where job_id = p_job_id and type = 'compte_supprime_email' and etat = 'en_traitement';
end $$;

revoke all on function seneve.claim_deletion_emails(int) from public, anon, authenticated;
revoke all on function seneve.finish_deletion_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function seneve.claim_deletion_emails(int) to service_role;
grant execute on function seneve.finish_deletion_email(uuid, boolean, text) to service_role;
