-- SÉNEVÉ 052 — Une annonce fait sonner le téléphone (demande de Dr Justin du 29/10/2026).
-- Décisions du 29/10/2026 :
--   * destinataires : les participants concernés par l'annonce (langue, parcours) qui ont activé les rappels sur
--     le téléphone (accord push/rappels en vigueur, au moins un téléphone abonné) ; chacun peut couper seulement
--     les annonces dans ses réglages (preferences.rappels.annonces = false) ;
--   * la nuit (21 h – 7 h, heure du participant), le téléphone sonne à 7 h ; l'annonce est déjà dans la cloche.
-- Contrôles répétés au moment de l'envoi : accord, téléphone, choix « annonces », annonce non retirée.
-- Un seul envoi par annonce et par participant ; un envoi non parti 12 heures après son créneau expire (pas de rafale).
-- L'administrateur peut publier sans faire sonner (case décochée).
-- Retour arrière en fin de fichier (commentaire).

-- 1. Choix d'envoi enregistré avec l'annonce.
alter table seneve.annonces add column if not exists sonner boolean not null default false;

-- 2. Adresse des fonctions d'envoi (propre à chaque projet ; renseignée hors migration). Vide = aucun réveil immédiat,
--    la tâche programmée prend le relais.
alter table seneve.push_config add column if not exists url_fonctions text
  check (url_fonctions is null or url_fonctions ~ '^https://[a-z0-9]+\.supabase\.co/functions/v1$');

-- 3. Envois d'annonces sur le téléphone.
create table if not exists seneve.annonce_envois (
  envoi_id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null references seneve.annonces(annonce_id) on delete cascade,
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  creneau timestamptz not null,
  etat text not null default 'planifie' check (etat in ('planifie','en_traitement','accepte','erreur','annule','expire')),
  tentatives int not null default 0,
  erreur text,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  unique (annonce_id, participant_id)
);
create index if not exists annonce_envois_a_faire on seneve.annonce_envois (creneau) where etat in ('planifie','en_traitement','erreur');
create index if not exists annonce_envois_participant on seneve.annonce_envois (participant_id);
alter table seneve.annonce_envois enable row level security;
revoke all on seneve.annonce_envois from public, anon, authenticated;
grant all on seneve.annonce_envois to service_role;

-- 4. Outils internes.
create or replace function seneve._fuseau_sur(p text)
returns text language plpgsql stable set search_path = '' as $$
begin
  if p is null or btrim(p) = '' then return 'Africa/Kinshasa'; end if;
  perform now() at time zone p;
  return p;
exception when others then return 'Africa/Kinshasa';
end $$;

-- Heure d'envoi : maintenant entre 7 h et 21 h (heure du participant), sinon 7 h suivant.
create or replace function seneve._annonce_creneau(p_participant uuid)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare v_tz text; v_local timestamp;
begin
  select seneve._fuseau_sur(coalesce(p.preferences #>> '{rappels,fuseau}', p.fuseau)) into v_tz
    from seneve.participants p where p.participant_id = p_participant;
  v_tz := coalesce(v_tz, 'Africa/Kinshasa');
  v_local := now() at time zone v_tz;
  if v_local::time >= time '07:00' and v_local::time < time '21:00' then return now(); end if;
  return ((case when v_local::time >= time '21:00' then v_local::date + 1 else v_local::date end) + time '07:00') at time zone v_tz;
end $$;

create or replace function seneve._annonce_push_eligible(p_participant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select c.etat from seneve.consents c
                    where c.participant_id = p_participant and c.canal = 'push' and c.finalite = 'rappels'
                    order by c.decide_le desc limit 1), '') = 'accorde'
     and exists (select 1 from seneve.push_appareils a where a.participant_id = p_participant)
     and coalesce((select p.preferences #>> '{rappels,annonces}' from seneve.participants p where p.participant_id = p_participant), 'true') <> 'false'
$$;

-- Participants concernés par une annonce (mêmes règles que seneve.mes_notifications).
create or replace function seneve._annonce_destinataires(p_annonce_id uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.participant_id
    from seneve.participants p, seneve.annonces a
   where a.annonce_id = p_annonce_id
     and a.langue in (select coalesce(p.langue, 'fr')
                      union select e.langue from seneve.enrollments e where e.participant_id = p.participant_id and e.etat <> 'annulee')
     and (a.cible = 'tous' or exists (select 1 from seneve.enrollments e
                                       where e.participant_id = p.participant_id and e.etat <> 'annulee' and e.programme_id = a.programme_id))
$$;

-- Prépare les envois d'une annonce ; renvoie (nombre de téléphones à faire sonner, dont différés au matin).
create or replace function seneve._annonce_planifier(p_annonce_id uuid, out total int, out differes int)
language plpgsql security definer set search_path = '' as $$
begin
  with nouveaux as (
    insert into seneve.annonce_envois (annonce_id, participant_id, creneau)
    select p_annonce_id, d, seneve._annonce_creneau(d)
      from seneve._annonce_destinataires(p_annonce_id) d
     where seneve._annonce_push_eligible(d)
    on conflict (annonce_id, participant_id) do nothing
    returning creneau)
  select count(*)::int, count(*) filter (where creneau > now())::int into total, differes from nouveaux;
end $$;

-- Réveille la fonction d'envoi tout de suite (la requête part après la validation de la transaction).
-- Ne bloque jamais la publication : sans adresse ou sans pg_net, la tâche programmée enverra.
create or replace function seneve._annonces_reveiller()
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text; v_cle text;
begin
  select url_fonctions, cle_appel into v_url, v_cle from seneve.push_config where id = 1;
  if v_url is null then return; end if;
  perform net.http_post(url := v_url || '/envoyer-annonces',
                        headers := jsonb_build_object('Content-Type', 'application/json', 'x-seneve-cle', v_cle),
                        body := '{}'::jsonb, timeout_milliseconds := 30000);
exception when others then null;
end $$;

-- 5. Publication : même fonction, plus le choix « faire sonner » (oui par défaut).
drop function if exists seneve.staff_annonce_publier(uuid, text, text, text, text, text, text, text);
create or replace function seneve.staff_annonce_publier(p_client_id uuid, p_titre text, p_texte text, p_langue text, p_cible text,
  p_programme_id text default null, p_image_path text default null, p_video_url text default null, p_sonner boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r seneve.annonces%rowtype;
  v_titre text := btrim(coalesce(p_titre,''));
  v_texte text := btrim(coalesce(p_texte,''));
  v_image text := nullif(btrim(coalesce(p_image_path,'')),'');
  v_video text := nullif(btrim(coalesce(p_video_url,'')),'');
  v_total int := 0; v_differes int := 0;
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
  if v_image is not null and (v_image <> p_client_id::text || '.jpg'
     or not exists (select 1 from storage.objects o where o.bucket_id = 'annonces' and o.name = v_image)) then
    raise exception 'Image introuvable' using errcode = '22023';
  end if;
  if v_video is not null and not (char_length(v_video) <= 500 and v_video !~ '\s' and (
       v_video ~ '^https://((www|m)\.)?youtube\.com/(watch\?v=|shorts/|live/)[A-Za-z0-9_-]{11}([?&#][A-Za-z0-9_=&%.-]*)?$'
       or v_video ~ '^https://youtu\.be/[A-Za-z0-9_-]{11}([?#][A-Za-z0-9_=&%.-]*)?$'
       or v_video ~ '^https://((www|m|vm|vt)\.)?tiktok\.com/[A-Za-z0-9@._/-]+([?#][A-Za-z0-9_=&%.-]*)?$')) then
    raise exception 'Lien vidéo invalide' using errcode = '22023';
  end if;
  select * into r from seneve.annonces where client_id = p_client_id;
  if found then
    if r.titre <> v_titre or r.texte <> v_texte or r.langue <> p_langue or r.cible <> p_cible
       or r.programme_id is distinct from (case when p_cible = 'programme' then p_programme_id end)
       or r.image_path is distinct from v_image or r.video_url is distinct from v_video then
      raise exception 'Cet identifiant a déjà servi pour une autre annonce' using errcode = '23505';
    end if;
    -- Répétition : rien n'est envoyé une deuxième fois.
    return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', true,
      'telephones', (select count(*) from seneve.annonce_envois e where e.annonce_id = r.annonce_id),
      'differes', (select count(*) from seneve.annonce_envois e where e.annonce_id = r.annonce_id and e.etat = 'planifie' and e.creneau > now()));
  end if;
  insert into seneve.annonces (client_id, titre, texte, langue, cible, programme_id, cree_par, image_path, video_url, sonner)
  values (p_client_id, v_titre, v_texte, p_langue, p_cible, case when p_cible = 'programme' then p_programme_id end, auth.uid(), v_image, v_video, coalesce(p_sonner, true))
  returning * into r;
  if r.sonner then
    select total, differes into v_total, v_differes from seneve._annonce_planifier(r.annonce_id);
    if v_total > v_differes then perform seneve._annonces_reveiller(); end if;
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_publiee', 'annonce:' || r.annonce_id::text, 'ok',
          jsonb_build_object('langue', r.langue, 'cible', r.cible, 'programme_id', r.programme_id,
                             'image', r.image_path is not null, 'video', r.video_url is not null,
                             'sonner', r.sonner, 'telephones', v_total, 'differes', v_differes));
  return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', false, 'telephones', v_total, 'differes', v_differes);
end $$;
revoke all on function seneve.staff_annonce_publier(uuid, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function seneve.staff_annonce_publier(uuid, text, text, text, text, text, text, text, boolean) to authenticated;

-- Retrait : les envois pas encore partis sont annulés.
create or replace function seneve.staff_annonce_retirer(p_annonce_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r seneve.annonces%rowtype;
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  update seneve.annonces set retire_le = coalesce(retire_le, now()) where annonce_id = p_annonce_id returning * into r;
  if not found then raise exception 'Annonce introuvable' using errcode = '22023'; end if;
  update seneve.annonce_envois set etat = 'annule', erreur = 'annonce retirée', modifie_le = now()
   where annonce_id = p_annonce_id and etat in ('planifie','erreur');
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_retiree', 'annonce:' || r.annonce_id::text, 'ok', '{}'::jsonb);
  return to_jsonb(r) - 'cree_par';
end $$;

-- Liste de l'administration : avec le bilan des envois sur les téléphones.
create or replace function seneve.staff_annonces()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) - 'cree_par' || jsonb_build_object('envois', jsonb_build_object(
             'acceptes', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat = 'accepte'),
             'en_attente', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat in ('planifie','en_traitement','erreur')),
             'echecs', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat = 'expire')))
           order by a.publie_le desc)
             from (select * from seneve.annonces order by publie_le desc limit 100) a), '[]'::jsonb);
end $$;

-- 6. Serveur d'envoi.
create or replace function seneve.claim_push_annonces(p_limite int default 100)
returns table (envoi_id uuid, annonce_id uuid, titre text, texte text, langue text, appareils jsonb, tentatives int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  -- Pas de rafale après une panne : 12 heures après son créneau, un envoi non parti expire.
  update seneve.annonce_envois e set etat = 'expire', modifie_le = now()
   where e.etat in ('planifie','en_traitement','erreur') and e.creneau < now() - interval '12 hours';
  -- Annonce retirée, accord retiré, téléphone oublié ou annonces coupées : annulé.
  update seneve.annonce_envois e set etat = 'annule', erreur = 'plus éligible', modifie_le = now()
   where e.etat in ('planifie','erreur')
     and (exists (select 1 from seneve.annonces a where a.annonce_id = e.annonce_id and a.retire_le is not null)
          or not seneve._annonce_push_eligible(e.participant_id));
  return query
  with pris as (
    update seneve.annonce_envois m set etat = 'en_traitement', tentatives = m.tentatives + 1, modifie_le = now()
     where m.envoi_id in (
       select y.envoi_id from seneve.annonce_envois y
        where y.creneau <= now() and y.tentatives < 3
          and (y.etat = 'planifie' or (y.etat in ('en_traitement','erreur') and y.modifie_le < now() - interval '10 minutes'))
        order by y.creneau limit greatest(1, least(p_limite, 200))
        for update of y skip locked)
    returning m.envoi_id, m.annonce_id, m.participant_id, m.tentatives)
  select pris.envoi_id, a.annonce_id, a.titre, a.texte, a.langue,
         coalesce((select jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth))
                     from seneve.push_appareils d where d.participant_id = pris.participant_id), '[]'::jsonb),
         pris.tentatives
    from pris join seneve.annonces a on a.annonce_id = pris.annonce_id;
end $$;

create or replace function seneve.finish_push_annonce(p_envoi_id uuid, p_ok boolean, p_erreur text default null, p_endpoints_perimes text[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from seneve.push_appareils where endpoint = any (coalesce(p_endpoints_perimes, '{}'));
  update seneve.annonce_envois
     set etat = case when p_ok then 'accepte' when tentatives >= 3 then 'expire' else 'erreur' end,
         erreur = case when p_ok then null else left(p_erreur, 400) end,
         modifie_le = now()
   where envoi_id = p_envoi_id and etat = 'en_traitement';
end $$;

-- 7. Réglages du participant : couper ou rétablir les annonces sur le téléphone.
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
    'annonces', coalesce(v_prefs ->> 'annonces', 'true') <> 'false',
    'cle_publique', seneve.push_cle_publique());
end $$;

create or replace function seneve.rappels_annonces(p_actif boolean, p_endpoint text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_participant uuid := seneve.current_participant_id();
begin
  if v_participant is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if p_actif is null then raise exception 'Choix invalide.' using errcode = '22023'; end if;
  update seneve.participants p
     set preferences = jsonb_set(p.preferences || jsonb_build_object('rappels', coalesce(p.preferences -> 'rappels', '{}'::jsonb)),
                                 '{rappels,annonces}', to_jsonb(p_actif)),
         modifie_le = now()
   where p.participant_id = v_participant;
  if not p_actif then
    update seneve.annonce_envois set etat = 'annule', erreur = 'annonces coupées', modifie_le = now()
     where participant_id = v_participant and etat in ('planifie','erreur');
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, case when p_actif then 'annonces_telephone_activees' else 'annonces_telephone_coupees' end,
          'participant:' || v_participant::text, 'ok', '{}'::jsonb);
  return seneve.rappels_etat(p_endpoint);
end $$;

-- 8. Droits.
revoke all on function seneve._fuseau_sur(text), seneve._annonce_creneau(uuid), seneve._annonce_push_eligible(uuid),
  seneve._annonce_destinataires(uuid), seneve._annonce_planifier(uuid), seneve._annonces_reveiller() from public, anon, authenticated;
revoke all on function seneve.claim_push_annonces(int), seneve.finish_push_annonce(uuid, boolean, text, text[]) from public, anon, authenticated;
grant execute on function seneve.claim_push_annonces(int), seneve.finish_push_annonce(uuid, boolean, text, text[]) to service_role;
revoke all on function seneve.rappels_etat(text), seneve.rappels_annonces(boolean, text) from public, anon;
grant execute on function seneve.rappels_etat(text), seneve.rappels_annonces(boolean, text) to authenticated;
revoke all on function seneve.staff_annonce_retirer(uuid), seneve.staff_annonces() from public, anon;
grant execute on function seneve.staff_annonce_retirer(uuid), seneve.staff_annonces() to authenticated;

-- 9. Tâche programmée (toutes les 5 minutes) : envois différés au matin et nouveaux essais.
--    Créée hors migration, propre à chaque projet :
--    select cron.schedule('seneve-annonces-telephone', '*/5 * * * *', $c$
--      select net.http_post(url := (select url_fonctions from seneve.push_config where id = 1) || '/envoyer-annonces',
--        headers := jsonb_build_object('Content-Type','application/json','x-seneve-cle',(select cle_appel from seneve.push_config where id = 1)),
--        body := '{}'::jsonb, timeout_milliseconds := 30000)
--      where (select url_fonctions from seneve.push_config where id = 1) is not null $c$);

-- Retour arrière (à exécuter seulement sur décision) :
-- select cron.unschedule('seneve-annonces-telephone');
-- drop function seneve.staff_annonce_publier(uuid,text,text,text,text,text,text,text,boolean);
--   puis réinstaller staff_annonce_publier (8 paramètres) de seneve_051 ; staff_annonce_retirer et staff_annonces de seneve_049 ;
--   rappels_etat de seneve_041 ;
-- drop function seneve.rappels_annonces(boolean,text), seneve.claim_push_annonces(int), seneve.finish_push_annonce(uuid,boolean,text,text[]),
--   seneve._annonces_reveiller(), seneve._annonce_planifier(uuid), seneve._annonce_destinataires(uuid),
--   seneve._annonce_push_eligible(uuid), seneve._annonce_creneau(uuid), seneve._fuseau_sur(text);
-- drop table seneve.annonce_envois; alter table seneve.annonces drop column sonner; alter table seneve.push_config drop column url_fonctions;
