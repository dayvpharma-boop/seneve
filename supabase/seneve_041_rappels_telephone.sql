-- SÉNEVÉ 041 — Rappels sur le téléphone (notifications web) ; textes confirmés par Dr Justin le 22/10/2026.
-- Désactivés par défaut : la personne les active elle-même (accord canal 'push', finalité 'rappels').
-- Trois moments au choix (matin, midi, soir), chacun dans une plage horaire de jour : rien la nuit.
-- Un seul rappel par personne, par moment et par jour ; aucun rattrapage après une panne ; le rappel
-- de midi ne part pas si l'action du jour est déjà préparée ou réalisée. Le texte du rappel ne contient
-- rien de privé. Une notification acceptée n'est pas une preuve de lecture (cahier n°11).

-- 1. Téléphones abonnés (un participant peut en avoir plusieurs). Accès uniquement par les fonctions.
create table if not exists seneve.push_appareils (
  appareil_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index if not exists push_appareils_participant on seneve.push_appareils (participant_id);
alter table seneve.push_appareils enable row level security;
revoke all on seneve.push_appareils from public, anon, authenticated;
grant all on seneve.push_appareils to service_role;

-- 2. Clés techniques des notifications. Créées et lues sur le serveur seulement (jamais affichées).
create table if not exists seneve.push_config (
  id int primary key default 1 check (id = 1),
  vapid_public text,
  vapid_private text,
  cle_appel text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  modifie_le timestamptz not null default now()
);
insert into seneve.push_config (id) values (1) on conflict (id) do nothing;
alter table seneve.push_config enable row level security;
revoke all on seneve.push_config from public, anon, authenticated;
grant all on seneve.push_config to service_role;

-- La clé publique est publique par nature (le navigateur en a besoin pour s'abonner).
create or replace function seneve.push_cle_publique()
returns text language sql stable security definer set search_path to '' as $$
  select vapid_public from seneve.push_config where id = 1
$$;

-- 3. Réglages : moments et fuseau, dans participants.preferences -> 'rappels'
create or replace function seneve._rappels_moments_valides(p jsonb)
returns jsonb language plpgsql immutable set search_path to '' as $$
declare
  v_out jsonb := '{}'::jsonb; k text; v text; mn int;
  plages constant jsonb := '{"matin":[360,600],"midi":[660,900],"soir":[1020,1260]}';
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Réglages invalides.' using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p) loop
    if not plages ? k then raise exception 'Moment inconnu.' using errcode = '22023'; end if;
    if jsonb_typeof(p -> k) = 'null' then v_out := v_out || jsonb_build_object(k, null); continue; end if;
    v := p ->> k;
    if v !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'Heure invalide.' using errcode = '22023'; end if;
    mn := split_part(v, ':', 1)::int * 60 + split_part(v, ':', 2)::int;
    if mn < (plages -> k ->> 0)::int or mn > (plages -> k ->> 1)::int then
      raise exception 'Heure hors de la plage permise.' using errcode = '22023';
    end if;
    v_out := v_out || jsonb_build_object(k, v);
  end loop;
  return v_out;
end $$;

create or replace function seneve.rappels_etat(p_endpoint text default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_etat text; v_prefs jsonb; v_fuseau text;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select c.etat into v_etat from seneve.consents c
   where c.participant_id = v_participant and c.canal = 'push' and c.finalite = 'rappels'
   order by c.decide_le desc limit 1;
  select coalesce(p.preferences -> 'rappels', '{}'::jsonb), p.fuseau into v_prefs, v_fuseau
    from seneve.participants p where p.participant_id = v_participant;
  return jsonb_build_object(
    'actif', coalesce(v_etat, '') = 'accorde',
    'cet_appareil', p_endpoint is not null and exists (select 1 from seneve.push_appareils a
                      where a.participant_id = v_participant and a.endpoint = p_endpoint),
    'appareils', (select count(*) from seneve.push_appareils a where a.participant_id = v_participant),
    'moments', coalesce(v_prefs -> 'moments', '{"matin":"07:30","midi":null,"soir":null}'::jsonb),
    'fuseau', coalesce(v_prefs ->> 'fuseau', v_fuseau),
    'cle_publique', seneve.push_cle_publique());
end $$;

create or replace function seneve.rappels_activer(p_endpoint text, p_p256dh text, p_auth text,
                                                  p_moments jsonb, p_fuseau text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_moments jsonb := seneve._rappels_moments_valides(p_moments);
  v_fuseau text; v_actuel text;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select name into v_fuseau from pg_catalog.pg_timezone_names where name = p_fuseau;
  if v_fuseau is null then select p.fuseau into v_fuseau from seneve.participants p where p.participant_id = v_participant; end if;

  -- Un même téléphone partagé passe au compte connecté (jamais deux comptes sur un même abonnement).
  insert into seneve.push_appareils (participant_id, endpoint, p256dh, auth)
  values (v_participant, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set participant_id = excluded.participant_id, p256dh = excluded.p256dh,
                                       auth = excluded.auth, modifie_le = now();

  update seneve.participants p
     set preferences = p.preferences || jsonb_build_object('rappels', jsonb_build_object('moments', v_moments, 'fuseau', v_fuseau)),
         modifie_le = now()
   where p.participant_id = v_participant;

  select c.etat into v_actuel from seneve.consents c
   where c.participant_id = v_participant and c.canal = 'push' and c.finalite = 'rappels'
   order by c.decide_le desc limit 1;
  if coalesce(v_actuel, '') <> 'accorde' then
    insert into seneve.consents (participant_id, canal, finalite, etat, version_texte, preuve, decide_le)
    values (v_participant, 'push', 'rappels', 'accorde', 'rappels_v1',
            'bouton « Recevoir mes rappels » et autorisation du navigateur', clock_timestamp());
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('participant:' || v_participant::text, 'rappels_accorde', 'participant:' || v_participant::text, 'ok', '{}'::jsonb);
  end if;
  return seneve.rappels_etat(p_endpoint);
end $$;

create or replace function seneve.rappels_regler(p_moments jsonb, p_endpoint text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_moments jsonb := seneve._rappels_moments_valides(p_moments);
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  update seneve.participants p
     set preferences = jsonb_set(p.preferences || jsonb_build_object('rappels', coalesce(p.preferences -> 'rappels', '{}'::jsonb)),
                                 '{rappels,moments}', v_moments),
         modifie_le = now()
   where p.participant_id = v_participant;
  return seneve.rappels_etat(p_endpoint);
end $$;

-- Arrêter : accord retiré, téléphones oubliés, rappels en attente annulés.
create or replace function seneve.rappels_arreter()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_actuel text;
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select c.etat into v_actuel from seneve.consents c
   where c.participant_id = v_participant and c.canal = 'push' and c.finalite = 'rappels'
   order by c.decide_le desc limit 1;
  if v_actuel = 'accorde' then
    insert into seneve.consents (participant_id, canal, finalite, etat, version_texte, preuve, decide_le)
    values (v_participant, 'push', 'rappels', 'retire', 'rappels_v1', 'bouton « Arrêter les rappels »', clock_timestamp());
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('participant:' || v_participant::text, 'rappels_retire', 'participant:' || v_participant::text, 'ok', '{}'::jsonb);
  end if;
  delete from seneve.push_appareils where participant_id = v_participant;
  update seneve.communications m set etat = 'annule', modifie_le = now(), erreur = 'accord retiré'
    from seneve.enrollments e
   where m.enrollment_id = e.enrollment_id and e.participant_id = v_participant
     and m.canal = 'push' and m.etat in ('planifie','erreur');
  return seneve.rappels_etat(null);
end $$;

-- 4. Le serveur d'envoi réserve les rappels dus maintenant
create or replace function seneve.claim_push_reminders(p_limite int default 50)
returns table (communication_id uuid, moment text, langue text, appareils jsonb, tentatives int)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  -- a) Pas de rattrapage : un rappel non parti dans les 2 heures expire.
  update seneve.communications m set etat = 'expire', modifie_le = now()
   where m.canal = 'push' and m.etat in ('planifie','erreur','en_traitement')
     and m.creneau < now() - interval '2 hours';

  -- b) Préparer les rappels dus (un par personne, moment et jour local), sur le parcours actif le plus récent.
  insert into seneve.communications (cle_idempotence, enrollment_id, content_id, canal, creneau, etat, motif)
  select 'rappel|' || s.participant_id::text || '|' || s.date_locale::text || '|' || s.moment,
         s.enrollment_id, s.content_id, 'push', now(), 'planifie', 'rappel_' || s.moment
    from (
      select distinct on (p.participant_id, mo.key)
             p.participant_id, mo.key as moment, e.enrollment_id, ct.content_id, x.date_locale
        from seneve.participants p
        cross join lateral jsonb_each_text(coalesce(p.preferences #> '{rappels,moments}', '{"matin":"07:30"}'::jsonb)) mo
        cross join lateral (select (now() at time zone coalesce(p.preferences #>> '{rappels,fuseau}', p.fuseau)) as maintenant_local) l
        join seneve.enrollments e on e.participant_id = p.participant_id and e.etat = 'active'
        join seneve.programmes pr on pr.programme_id = e.programme_id
        cross join lateral (select l.maintenant_local::date as date_locale,
                                   (l.maintenant_local::date - e.date_debut) + 1 as jour,
                                   l.maintenant_local::time as heure) x
        join lateral (select c.content_id from seneve.contents c
                       where c.programme_id = e.programme_id and c.version = e.version and c.jour = x.jour
                       order by c.numero_message limit 1) ct on true
       where mo.value is not null
         and x.jour between 1 and coalesce(pr.duree_jours, 7)
         and x.heure >= mo.value::time and x.heure < mo.value::time + interval '2 hours'
         and exists (select 1 from seneve.push_appareils a where a.participant_id = p.participant_id)
         and (select c.etat from seneve.consents c
               where c.participant_id = p.participant_id and c.canal = 'push' and c.finalite = 'rappels'
               order by c.decide_le desc limit 1) = 'accorde'
         -- Midi : rien si une action du jour est déjà préparée ou réalisée.
         and not (mo.key = 'midi' and exists (
               select 1 from seneve.activity_state st
                 join seneve.activities a on a.activity_id = st.activity_id
                 join seneve.contents c on c.content_id = a.content_id
                where st.enrollment_id = e.enrollment_id and c.jour = x.jour
                  and st.etat in ('preparee','realisee')))
       order by p.participant_id, mo.key, e.date_debut desc
    ) s
  on conflict (cle_idempotence) do nothing;

  -- c) Réserver (accord et téléphones vérifiés à nouveau au moment de l'envoi).
  return query
  with pris as (
    update seneve.communications m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.communication_id in (
       select y.communication_id from seneve.communications y
         join seneve.enrollments e on e.enrollment_id = y.enrollment_id
        where y.canal = 'push'
          and (y.etat = 'planifie'
               or (y.etat in ('en_traitement','erreur') and y.modifie_le < now() - interval '10 minutes'))
          and y.tentatives < 3
          and (select c.etat from seneve.consents c
                where c.participant_id = e.participant_id and c.canal = 'push' and c.finalite = 'rappels'
                order by c.decide_le desc limit 1) = 'accorde'
        order by y.creneau limit greatest(1, least(p_limite, 200))
        for update of y skip locked)
    returning m.communication_id, m.enrollment_id, m.motif, m.tentatives)
  select pris.communication_id, replace(pris.motif, 'rappel_', ''), e.langue,
         coalesce((select jsonb_agg(jsonb_build_object('endpoint', a.endpoint, 'p256dh', a.p256dh, 'auth', a.auth))
                     from seneve.push_appareils a where a.participant_id = e.participant_id), '[]'::jsonb),
         pris.tentatives
    from pris join seneve.enrollments e on e.enrollment_id = pris.enrollment_id;
end $$;

-- Clôture d'un envoi ; les téléphones refusés définitivement (abonnement expiré) sont oubliés.
create or replace function seneve.finish_push_reminder(p_communication_id uuid, p_ok boolean,
                                                       p_erreur text default null, p_endpoints_perimes text[] default '{}')
returns void language plpgsql security definer set search_path to '' as $$
begin
  delete from seneve.push_appareils where endpoint = any (coalesce(p_endpoints_perimes, '{}'));
  update seneve.communications
     set etat = case when p_ok then 'accepte' else 'erreur' end,
         erreur = case when p_ok then null else left(p_erreur, 400) end,
         modifie_le = now()
   where communication_id = p_communication_id and canal = 'push' and etat = 'en_traitement';
end $$;

-- 5. Droits
revoke all on function seneve.push_cle_publique() from public;
grant execute on function seneve.push_cle_publique() to anon, authenticated, service_role;
revoke all on function seneve._rappels_moments_valides(jsonb) from public, anon, authenticated;
revoke all on function seneve.rappels_etat(text) from public, anon;
revoke all on function seneve.rappels_activer(text, text, text, jsonb, text) from public, anon;
revoke all on function seneve.rappels_regler(jsonb, text) from public, anon;
revoke all on function seneve.rappels_arreter() from public, anon;
grant execute on function seneve.rappels_etat(text) to authenticated;
grant execute on function seneve.rappels_activer(text, text, text, jsonb, text) to authenticated;
grant execute on function seneve.rappels_regler(jsonb, text) to authenticated;
grant execute on function seneve.rappels_arreter() to authenticated;
revoke all on function seneve.claim_push_reminders(int) from public, anon, authenticated;
revoke all on function seneve.finish_push_reminder(uuid, boolean, text, text[]) from public, anon, authenticated;
grant execute on function seneve.claim_push_reminders(int) to service_role;
grant execute on function seneve.finish_push_reminder(uuid, boolean, text, text[]) to service_role;
