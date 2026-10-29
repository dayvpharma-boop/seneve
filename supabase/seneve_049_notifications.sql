-- SÉNEVÉ 049 — Centre de notifications (décision de Dr Justin du 29/10/2026 : réponses de l'équipe + annonces).
-- Ajout seulement : aucune table existante n'est modifiée. Retour arrière en fin de fichier (commentaire).
--
-- Le participant lit, par une seule fonction protégée :
--   * les annonces publiées par l'administration (à tous, ou à un parcours), dans sa langue ;
--   * les réponses de l'équipe à ses demandes d'aide (help_messages, auteur 'equipe') ;
--   * l'historique des rappels acceptés par le service de notifications (moments du jour, habitudes).
-- La pastille de la cloche ne compte que les annonces et les réponses non vues : les rappels sont déjà
-- arrivés sur le téléphone et ne sont listés que pour mémoire.

create table if not exists seneve.annonces (
  annonce_id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  titre text not null check (char_length(btrim(titre)) between 1 and 120),
  texte text not null check (char_length(btrim(texte)) between 1 and 2000),
  langue text not null check (langue in ('fr','en')),
  cible text not null check (cible in ('tous','programme')),
  programme_id text,
  publie_le timestamptz not null default now(),
  retire_le timestamptz,
  cree_par uuid not null,
  check ((cible = 'programme') = (programme_id is not null))
);
alter table seneve.annonces enable row level security;
revoke all on seneve.annonces from public, anon, authenticated;

create table if not exists seneve.notifications_vues (
  participant_id uuid primary key references seneve.participants(participant_id) on delete cascade,
  vu_jusqu_a timestamptz not null
);
alter table seneve.notifications_vues enable row level security;
revoke all on seneve.notifications_vues from public, anon, authenticated;

-- Liste des notifications du participant connecté (60 derniers jours, 100 éléments au plus).
create or replace function seneve.mes_notifications(p_limite integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_p uuid := seneve.current_participant_id();
  v_vu timestamptz;
  v_elements jsonb;
  v_non_lues int;
  v_depuis timestamptz := now() - interval '60 days';
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if p_limite is null or p_limite < 1 or p_limite > 100 then raise exception 'Limite invalide' using errcode = '22023'; end if;
  select vu_jusqu_a into v_vu from seneve.notifications_vues where participant_id = v_p;

  with mes_inscriptions as (
    select e.enrollment_id, e.programme_id, e.langue from seneve.enrollments e
     where e.participant_id = v_p and e.etat <> 'annulee'
  ), mes_langues as (
    select langue from mes_inscriptions
    union select coalesce((select langue from seneve.participants where participant_id = v_p), 'fr')
  ), tout as (
    select 'annonce'::text as type, a.annonce_id::text as id, a.publie_le as date,
           jsonb_build_object('titre', a.titre, 'texte', a.texte, 'langue', a.langue) as contenu
      from seneve.annonces a
     where a.retire_le is null and a.publie_le <= now() and a.publie_le >= v_depuis
       and a.langue in (select langue from mes_langues)
       and (a.cible = 'tous' or a.programme_id in (select programme_id from mes_inscriptions))
    union all
    select 'reponse', m.message_id::text, m.cree_le,
           jsonb_build_object('texte', m.texte, 'request_id', h.request_id)
      from seneve.help_messages m join seneve.help_requests h on h.request_id = m.request_id
     where h.participant_id = v_p and m.auteur = 'equipe' and m.cree_le >= v_depuis
    union all
    select 'rappel_moment', c.communication_id::text, coalesce(c.modifie_le, c.creneau),
           jsonb_build_object('moment', replace(c.motif, 'rappel_', ''))
      from seneve.communications c join mes_inscriptions i on i.enrollment_id = c.enrollment_id
     where c.canal = 'push' and c.etat = 'accepte' and c.motif in ('rappel_matin','rappel_midi','rappel_soir')
       and coalesce(c.modifie_le, c.creneau) >= v_depuis
    union all
    select 'rappel_habitude', r.reminder_id::text, r.modifie_le,
           jsonb_build_object('activity_id', r.activity_id,
             'habit_key', coalesce(substring(a.note_source from '^RECETTE_HD_QUOTIDIEN_V1:([a-z_]+)$'),
                                   substring(a.note_source from '^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):')))
      from seneve.hd_activity_reminders r
      join mes_inscriptions i on i.enrollment_id = r.enrollment_id
      left join seneve.activities a on a.activity_id = r.activity_id
     where r.canal = 'push' and r.etat = 'accepte' and r.modifie_le >= v_depuis
  ), tries as (
    select * from tout order by date desc, id limit p_limite
  )
  select coalesce(jsonb_agg(jsonb_build_object('type', type, 'id', id, 'date', date) || contenu order by date desc, id), '[]'::jsonb)
    into v_elements from tries;

  with mes_inscriptions as (
    select e.programme_id, e.langue from seneve.enrollments e where e.participant_id = v_p and e.etat <> 'annulee'
  ), mes_langues as (
    select langue from mes_inscriptions
    union select coalesce((select langue from seneve.participants where participant_id = v_p), 'fr')
  )
  select (select count(*) from seneve.annonces a
           where a.retire_le is null and a.publie_le <= now() and a.publie_le >= v_depuis
             and (v_vu is null or a.publie_le > v_vu)
             and a.langue in (select langue from mes_langues)
             and (a.cible = 'tous' or a.programme_id in (select programme_id from mes_inscriptions)))
       + (select count(*) from seneve.help_messages m join seneve.help_requests h on h.request_id = m.request_id
           where h.participant_id = v_p and m.auteur = 'equipe' and m.cree_le >= v_depuis
             and (v_vu is null or m.cree_le > v_vu))
    into v_non_lues;

  return jsonb_build_object('vu_jusqu_a', v_vu, 'non_lues', v_non_lues, 'elements', v_elements);
end $$;

-- Ouverture de la page : tout ce qui est arrivé jusqu'ici est vu (l'heure du serveur fait foi ; clock_timestamp,
-- comme la date des messages d'aide, pour qu'un message déjà affiché ne reste pas compté).
create or replace function seneve.marquer_notifications_vues()
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_p uuid := seneve.current_participant_id(); v_now timestamptz := clock_timestamp();
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  insert into seneve.notifications_vues (participant_id, vu_jusqu_a) values (v_p, v_now)
  on conflict (participant_id) do update set vu_jusqu_a = greatest(seneve.notifications_vues.vu_jusqu_a, excluded.vu_jusqu_a);
  return v_now;
end $$;

-- Administration : publier une annonce (idempotent par client_id), la retirer, lister.
create or replace function seneve.staff_annonce_publier(p_client_id uuid, p_titre text, p_texte text, p_langue text, p_cible text, p_programme_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r seneve.annonces%rowtype; v_titre text := btrim(coalesce(p_titre,'')); v_texte text := btrim(coalesce(p_texte,''));
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  if p_client_id is null or char_length(v_titre) not between 1 and 120 or char_length(v_texte) not between 1 and 2000
     or p_langue not in ('fr','en') or p_cible not in ('tous','programme')
     or (p_cible = 'programme') <> (nullif(btrim(coalesce(p_programme_id,'')),'') is not null) then
    raise exception 'Saisie invalide' using errcode = '22023';
  end if;
  if p_cible = 'programme' and not exists (select 1 from seneve.programmes where programme_id = p_programme_id) then
    raise exception 'Parcours inconnu' using errcode = '22023';
  end if;
  select * into r from seneve.annonces where client_id = p_client_id;
  if found then
    if r.titre <> v_titre or r.texte <> v_texte or r.langue <> p_langue or r.cible <> p_cible or r.programme_id is distinct from (case when p_cible = 'programme' then p_programme_id end) then
      raise exception 'Cet identifiant a déjà servi pour une autre annonce' using errcode = '23505';
    end if;
    return to_jsonb(r) || jsonb_build_object('repetition', true);
  end if;
  insert into seneve.annonces (client_id, titre, texte, langue, cible, programme_id, cree_par)
  values (p_client_id, v_titre, v_texte, p_langue, p_cible, case when p_cible = 'programme' then p_programme_id end, auth.uid())
  returning * into r;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_publiee', 'annonce:' || r.annonce_id::text, 'ok',
          jsonb_build_object('langue', r.langue, 'cible', r.cible, 'programme_id', r.programme_id));
  return to_jsonb(r) || jsonb_build_object('repetition', false);
end $$;

create or replace function seneve.staff_annonce_retirer(p_annonce_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r seneve.annonces%rowtype;
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  update seneve.annonces set retire_le = coalesce(retire_le, now()) where annonce_id = p_annonce_id returning * into r;
  if not found then raise exception 'Annonce introuvable' using errcode = '22023'; end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_retiree', 'annonce:' || r.annonce_id::text, 'ok', '{}'::jsonb);
  return to_jsonb(r);
end $$;

create or replace function seneve.staff_annonces()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) - 'cree_par' order by a.publie_le desc)
                     from (select * from seneve.annonces order by publie_le desc limit 100) a), '[]'::jsonb);
end $$;

revoke all on function seneve.mes_notifications(integer), seneve.marquer_notifications_vues(),
  seneve.staff_annonce_publier(uuid, text, text, text, text, text), seneve.staff_annonce_retirer(uuid), seneve.staff_annonces()
  from public, anon;
grant execute on function seneve.mes_notifications(integer), seneve.marquer_notifications_vues(),
  seneve.staff_annonce_publier(uuid, text, text, text, text, text), seneve.staff_annonce_retirer(uuid), seneve.staff_annonces()
  to authenticated;

-- Retour arrière (à exécuter seulement sur décision) :
-- drop function if exists seneve.staff_annonces(), seneve.staff_annonce_retirer(uuid),
--   seneve.staff_annonce_publier(uuid,text,text,text,text,text), seneve.marquer_notifications_vues(), seneve.mes_notifications(integer);
-- drop table if exists seneve.notifications_vues, seneve.annonces;
