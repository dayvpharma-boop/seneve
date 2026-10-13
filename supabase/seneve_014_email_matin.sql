-- SÉNEVÉ 014 — E-mail du matin pour les parcours commencés sur le site.
-- Décision du 13/10/2026 : une personne inscrite sur le site (sans passer par WhatsApp) peut recevoir
-- chaque matin un e-mail « ton jour N est ouvert », seulement si elle l'a demandé, et peut l'arrêter.
-- Les inscriptions venues du système WhatsApp (legacy_inscription_id renseigné) ne reçoivent pas
-- cet e-mail : elles ont déjà leurs messages WhatsApp (workflow SUIVI QUOTIDIEN, non modifié).
-- Règles : accord en vigueur, parcours actif (pas en pause), jour du parcours en cours, à partir de
-- 7 h (fuseau du participant) et jamais après 21 h, un seul e-mail par parcours et par jour,
-- aucun rattrapage des jours passés après une panne, 3 essais au plus.

-- 1. Suivi des essais sur les communications (colonnes ajoutées, rien n'est supprimé)
alter table seneve.communications add column if not exists tentatives int not null default 0;
alter table seneve.communications add column if not exists erreur text;
create index if not exists communications_a_envoyer on seneve.communications (etat, motif) where etat in ('planifie','en_traitement','erreur');

-- 2. Le participant consulte et change son choix (l'historique des accords est conservé)
create or replace function seneve.email_matin_etat()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_etat text; v_email text; v_concerne boolean;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  select c.etat into v_etat from seneve.consents c
   where c.participant_id = v_participant and c.canal = 'email' and c.finalite = 'email_matin'
   order by c.decide_le desc limit 1;
  select u.email into v_email from seneve.participants p join auth.users u on u.id = p.auth_user_id
   where p.participant_id = v_participant;
  select exists (select 1 from seneve.enrollments e
                  where e.participant_id = v_participant and e.legacy_inscription_id is null
                    and e.etat in ('active','en_pause')) into v_concerne;
  return jsonb_build_object('actif', coalesce(v_etat, '') = 'accorde',
                            'concerne', v_concerne,
                            'email', v_email);
end $$;

create or replace function seneve.email_matin_choisir(p_actif boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_actuel text;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if p_actif is null then
    raise exception 'Choix manquant.' using errcode = '22023';
  end if;
  select c.etat into v_actuel from seneve.consents c
   where c.participant_id = v_participant and c.canal = 'email' and c.finalite = 'email_matin'
   order by c.decide_le desc limit 1;
  -- Pas de nouvelle ligne si le choix ne change pas (double clic, nouvel envoi).
  if coalesce(v_actuel = 'accorde', false) is distinct from p_actif then
    insert into seneve.consents (participant_id, canal, finalite, etat, version_texte, preuve, decide_le)
    values (v_participant, 'email', 'email_matin', case when p_actif then 'accorde' else 'retire' end,
            'email_matin_v1', 'case cochée dans l''espace web', clock_timestamp());
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('participant:' || v_participant::text, case when p_actif then 'email_matin_accorde' else 'email_matin_retire' end,
            'participant:' || v_participant::text, 'ok', '{}'::jsonb);
    -- Un retrait annule les e-mails encore en attente.
    if not p_actif then
      update seneve.communications m set etat = 'annule', modifie_le = now(), erreur = 'accord retiré'
        from seneve.enrollments e
       where m.enrollment_id = e.enrollment_id and e.participant_id = v_participant
         and m.motif = 'email_matin' and m.etat in ('planifie','erreur');
    end if;
  end if;
  return seneve.email_matin_etat();
end $$;

-- 3. n8n réserve les e-mails à envoyer maintenant
create or replace function seneve.claim_morning_emails(p_limite int default 20)
returns table (communication_id uuid, email text, prenom text, langue text, jour int, duree int,
               theme text, programme text, tentatives int)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  -- a) Les e-mails d'un jour passé ne partent plus (pas de rafale après une panne).
  update seneve.communications m set etat = 'expire', modifie_le = now()
   where m.motif = 'email_matin' and m.etat in ('planifie','erreur','en_traitement')
     and m.creneau < now() - interval '14 hours';

  -- b) Préparer l'e-mail du jour de chaque parcours concerné (une seule ligne par parcours et par jour).
  insert into seneve.communications (cle_idempotence, enrollment_id, content_id, canal, creneau, etat, motif)
  select 'email_matin|' || e.enrollment_id::text || '|' || x.date_locale::text,
         e.enrollment_id, ct.content_id, 'email', now(), 'planifie', 'email_matin'
    from seneve.enrollments e
    join seneve.participants p on p.participant_id = e.participant_id
    join auth.users u on u.id = p.auth_user_id and coalesce(u.email, '') <> ''
    join seneve.programmes pr on pr.programme_id = e.programme_id
    cross join lateral (select (now() at time zone p.fuseau) as maintenant_local) l
    cross join lateral (select l.maintenant_local::date as date_locale,
                               (l.maintenant_local::date - e.date_debut) + 1 as jour,
                               extract(hour from l.maintenant_local)::int as heure) x
    join lateral (select c.content_id from seneve.contents c
                   where c.programme_id = e.programme_id and c.version = e.version and c.jour = x.jour
                   order by c.numero_message limit 1) ct on true
   where e.legacy_inscription_id is null
     and e.etat = 'active'
     and x.jour between 1 and coalesce(pr.duree_jours, 7)
     and x.heure between 7 and 20
     and (select c.etat from seneve.consents c
           where c.participant_id = e.participant_id and c.canal = 'email' and c.finalite = 'email_matin'
           order by c.decide_le desc limit 1) = 'accorde'
  on conflict (cle_idempotence) do nothing;

  -- c) Réserver (accord vérifié à nouveau au moment de l'envoi).
  return query
  with pris as (
    update seneve.communications m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.communication_id in (
       select y.communication_id from seneve.communications y
         join seneve.enrollments e on e.enrollment_id = y.enrollment_id
        where y.motif = 'email_matin'
          and (y.etat = 'planifie'
               or (y.etat in ('en_traitement','erreur') and y.modifie_le < now() - interval '15 minutes'))
          and y.tentatives < 3
          and e.etat = 'active'
          and (select c.etat from seneve.consents c
                where c.participant_id = e.participant_id and c.canal = 'email' and c.finalite = 'email_matin'
                order by c.decide_le desc limit 1) = 'accorde'
        order by y.creneau limit greatest(1, least(p_limite, 50))
        for update of y skip locked)
    returning m.communication_id, m.enrollment_id, m.content_id, m.tentatives)
  select pris.communication_id, u.email::text, p.prenom, e.langue, c.jour,
         coalesce(pr.duree_jours, 7), coalesce(c.theme, c.titre, ''), pr.nom, pris.tentatives
    from pris
    join seneve.enrollments e on e.enrollment_id = pris.enrollment_id
    join seneve.participants p on p.participant_id = e.participant_id
    join auth.users u on u.id = p.auth_user_id
    join seneve.programmes pr on pr.programme_id = e.programme_id
    join seneve.contents c on c.content_id = pris.content_id;
end $$;

create or replace function seneve.finish_morning_email(p_communication_id uuid, p_ok boolean, p_erreur text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update seneve.communications
     set etat = case when p_ok then 'accepte' else 'erreur' end,
         erreur = case when p_ok then null else left(p_erreur, 400) end,
         modifie_le = now()
   where communication_id = p_communication_id and motif = 'email_matin' and etat = 'en_traitement';
end $$;

-- 4. Droits : le participant gère son choix ; seul n8n (service_role) réserve et clôture les envois.
revoke all on function seneve.email_matin_etat() from public, anon;
revoke all on function seneve.email_matin_choisir(boolean) from public, anon;
grant execute on function seneve.email_matin_etat() to authenticated;
grant execute on function seneve.email_matin_choisir(boolean) to authenticated;
revoke all on function seneve.claim_morning_emails(int) from public, anon, authenticated;
revoke all on function seneve.finish_morning_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function seneve.claim_morning_emails(int) to service_role;
grant execute on function seneve.finish_morning_email(uuid, boolean, text) to service_role;
