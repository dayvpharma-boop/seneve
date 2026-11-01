-- SÉNEVÉ 054 — Annonces : affiche à l'ouverture, programmation, bouton, français + anglais (décision de Dr Justin du 01/11/2026).
-- Une même annonce passe par trois endroits, sans être créée trois fois :
--   1. la cloche (page Notifications), comme aujourd'hui ;
--   2. le téléphone qui sonne (si « faire sonner » est coché et si la personne a accepté les notifications ; jamais 21 h – 7 h) ;
--   3. l'affiche à l'ouverture de SÉNEVÉ (si « afficher à l'ouverture » est coché) : une seule fois par annonce,
--      fermable à tout moment (✕ ou « Plus tard ») ; fermer ne change ni parcours, ni droits, ni progression.
-- Programmation : début (publie_le, peut être dans le futur) et fin facultative (fin_le) ; à la fin, l'annonce disparaît
-- de la cloche et de l'affiche, et les envois pas encore partis sont annulés.
-- Deux langues : une annonce par langue, reliées par groupe_id ; chacun reçoit sa langue, une seule fois par groupe.
-- Ajouts seulement (colonnes facultatives, nouvelle table) ; les annonces existantes restent identiques.
-- Retour arrière en fin de fichier (commentaire).

-- 1. Colonnes.
alter table seneve.annonces add column if not exists fin_le timestamptz;
alter table seneve.annonces add column if not exists affiche boolean not null default false;
alter table seneve.annonces add column if not exists bouton_texte text;
alter table seneve.annonces add column if not exists bouton_lien text;
alter table seneve.annonces add column if not exists groupe_id uuid;
do $$ begin
  alter table seneve.annonces add constraint annonces_fin_apres_debut check (fin_le is null or fin_le > publie_le);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table seneve.annonces add constraint annonces_bouton_complet check (
    (bouton_texte is null and bouton_lien is null)
    or (char_length(btrim(bouton_texte)) between 1 and 40 and char_length(bouton_lien) between 1 and 500));
exception when duplicate_object then null; end $$;
create index if not exists annonces_groupe on seneve.annonces (groupe_id) where groupe_id is not null;

-- 2. Affiches vues par chaque participant (une ligne par annonce et par personne).
create table if not exists seneve.annonce_affichages (
  annonce_id uuid not null references seneve.annonces(annonce_id) on delete cascade,
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  action text not null check (action in ('vue','fermee','plus_tard','bouton')),
  premier_le timestamptz not null default now(),
  dernier_le timestamptz not null default now(),
  primary key (annonce_id, participant_id)
);
create index if not exists annonce_affichages_participant on seneve.annonce_affichages (participant_id);
alter table seneve.annonce_affichages enable row level security;
revoke all on seneve.annonce_affichages from public, anon, authenticated;

-- 3. Lien du bouton : une page de SÉNEVÉ (/bible, /habitudes, …) ou une adresse https.
create or replace function seneve._annonce_lien_valide(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p is not null and char_length(p) <= 500 and p !~ '\s' and (
    (p ~ '^/[A-Za-z0-9/_?=&#%.-]*$' and p !~ '^//')
    or p ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/[A-Za-z0-9/_?=&#%.~+:@-]*)?$')
$$;

-- 4. Heure d'envoi sur le téléphone à partir d'une heure donnée (le début de l'annonce) : entre 7 h et 21 h
--    (heure du participant), sinon 7 h suivant.
create or replace function seneve._annonce_creneau_a(p_participant uuid, p_base timestamptz)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare v_tz text; v_local timestamp;
begin
  select seneve._fuseau_sur(coalesce(p.preferences #>> '{rappels,fuseau}', p.fuseau)) into v_tz
    from seneve.participants p where p.participant_id = p_participant;
  v_tz := coalesce(v_tz, 'Africa/Kinshasa');
  v_local := p_base at time zone v_tz;
  if v_local::time >= time '07:00' and v_local::time < time '21:00' then return p_base; end if;
  return ((case when v_local::time >= time '21:00' then v_local::date + 1 else v_local::date end) + time '07:00') at time zone v_tz;
end $$;

-- 5. Préparation des envois : à partir du début de l'annonce ; une seule sonnerie par groupe (français/anglais).
create or replace function seneve._annonce_planifier(p_annonce_id uuid, out total int, out differes int)
language plpgsql security definer set search_path = '' as $$
declare v_base timestamptz; v_groupe uuid;
begin
  select greatest(now(), a.publie_le), a.groupe_id into v_base, v_groupe from seneve.annonces a where a.annonce_id = p_annonce_id;
  with nouveaux as (
    insert into seneve.annonce_envois (annonce_id, participant_id, creneau)
    select p_annonce_id, d, seneve._annonce_creneau_a(d, v_base)
      from seneve._annonce_destinataires(p_annonce_id) d
     where seneve._annonce_push_eligible(d)
       and (v_groupe is null or not exists (
             select 1 from seneve.annonce_envois e join seneve.annonces o on o.annonce_id = e.annonce_id
              where e.participant_id = d and o.groupe_id = v_groupe and o.annonce_id <> p_annonce_id))
    on conflict (annonce_id, participant_id) do nothing
    returning creneau)
  select count(*)::int, count(*) filter (where creneau > now())::int into total, differes from nouveaux;
end $$;

-- 6. Serveur d'envoi : une annonce terminée n'envoie plus rien.
create or replace function seneve.claim_push_annonces(p_limite int default 100)
returns table (envoi_id uuid, annonce_id uuid, titre text, texte text, langue text, appareils jsonb, tentatives int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  update seneve.annonce_envois e set etat = 'expire', modifie_le = now()
   where e.etat in ('planifie','en_traitement','erreur') and e.creneau < now() - interval '12 hours';
  update seneve.annonce_envois e set etat = 'annule', erreur = 'plus éligible', modifie_le = now()
   where e.etat in ('planifie','erreur')
     and (exists (select 1 from seneve.annonces a where a.annonce_id = e.annonce_id
                   and (a.retire_le is not null or (a.fin_le is not null and a.fin_le <= now())))
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

-- 7. Cloche : mêmes règles qu'avant, plus la fin de l'annonce et son bouton.
create or replace function seneve.mes_notifications(p_limite integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_p uuid := seneve.current_participant_id();
  v_vu timestamptz;
  v_seuil_rappels timestamptz;
  v_elements jsonb;
  v_non_lues int;
  v_depuis timestamptz := now() - interval '60 days';
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if p_limite is null or p_limite < 1 or p_limite > 100 then raise exception 'Limite invalide' using errcode = '22023'; end if;
  select vu_jusqu_a into v_vu from seneve.notifications_vues where participant_id = v_p;
  v_seuil_rappels := coalesce(v_vu, now() - interval '24 hours');

  with mes_inscriptions as (
    select e.enrollment_id, e.programme_id, e.langue from seneve.enrollments e
     where e.participant_id = v_p and e.etat <> 'annulee'
  ), mes_langues as (
    select langue from mes_inscriptions
    union select coalesce((select langue from seneve.participants where participant_id = v_p), 'fr')
  ), tout as (
    select 'annonce'::text as type, a.annonce_id::text as id, a.publie_le as date,
           (v_vu is null or a.publie_le > v_vu) as nouveau,
           jsonb_build_object('titre', a.titre, 'texte', a.texte, 'langue', a.langue, 'image', a.image_path, 'video', a.video_url,
                              'bouton_texte', a.bouton_texte, 'bouton_lien', a.bouton_lien, 'fin', a.fin_le) as contenu
      from seneve.annonces a
     where a.retire_le is null and a.publie_le <= now() and a.publie_le >= v_depuis
       and (a.fin_le is null or a.fin_le > now())
       and a.langue in (select langue from mes_langues)
       and (a.cible = 'tous' or a.programme_id in (select programme_id from mes_inscriptions))
    union all
    select 'reponse', m.message_id::text, m.cree_le, (v_vu is null or m.cree_le > v_vu),
           jsonb_build_object('texte', m.texte, 'request_id', h.request_id)
      from seneve.help_messages m join seneve.help_requests h on h.request_id = m.request_id
     where h.participant_id = v_p and m.auteur = 'equipe' and m.cree_le >= v_depuis
    union all
    select 'rappel_moment', c.communication_id::text, coalesce(c.modifie_le, c.creneau), coalesce(c.modifie_le, c.creneau) > v_seuil_rappels,
           jsonb_build_object('moment', replace(c.motif, 'rappel_', ''))
      from seneve.communications c join mes_inscriptions i on i.enrollment_id = c.enrollment_id
     where c.canal = 'push' and c.etat = 'accepte' and c.motif in ('rappel_matin','rappel_midi','rappel_soir')
       and coalesce(c.modifie_le, c.creneau) >= v_depuis
    union all
    select 'rappel_habitude', r.reminder_id::text, r.modifie_le, r.modifie_le > v_seuil_rappels,
           jsonb_build_object('activity_id', r.activity_id,
             'habit_key', coalesce(substring(a.note_source from '^RECETTE_HD_QUOTIDIEN_V1:([a-z_]+)$'),
                                   substring(a.note_source from '^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):')))
      from seneve.hd_activity_reminders r
      join mes_inscriptions i on i.enrollment_id = r.enrollment_id
      left join seneve.activities a on a.activity_id = r.activity_id
     where r.canal = 'push' and r.etat = 'accepte' and r.modifie_le >= v_depuis
  )
  select (select count(*) from tout where nouveau),
         (select coalesce(jsonb_agg(jsonb_build_object('type', x.type, 'id', x.id, 'date', x.date, 'nouveau', x.nouveau) || x.contenu order by x.date desc, x.id), '[]'::jsonb)
            from (select * from tout order by date desc, id limit p_limite) x)
    into v_non_lues, v_elements;

  return jsonb_build_object('vu_jusqu_a', v_vu, 'non_lues', v_non_lues, 'elements', v_elements);
end $$;

-- 8. Publication programmée : nouvelle fonction (mêmes contrôles qu'en 052, plus début, fin, affiche, bouton et groupe).
--    L'ancienne seneve.staff_annonce_publier (9 paramètres) reste en place, inchangée : rien n'est supprimé.
create or replace function seneve.staff_annonce_programmer(p_client_id uuid, p_titre text, p_texte text, p_langue text, p_cible text,
  p_programme_id text default null, p_image_path text default null, p_video_url text default null, p_sonner boolean default true,
  p_debut timestamptz default null, p_fin timestamptz default null, p_affiche boolean default false,
  p_bouton_texte text default null, p_bouton_lien text default null, p_groupe_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r seneve.annonces%rowtype;
  v_titre text := btrim(coalesce(p_titre,''));
  v_texte text := btrim(coalesce(p_texte,''));
  v_image text := nullif(btrim(coalesce(p_image_path,'')),'');
  v_video text := nullif(btrim(coalesce(p_video_url,'')),'');
  v_btexte text := nullif(btrim(coalesce(p_bouton_texte,'')),'');
  v_blien text := nullif(btrim(coalesce(p_bouton_lien,'')),'');
  v_debut timestamptz := coalesce(p_debut, now());
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
  -- Début : maintenant ou dans les 90 jours ; fin : après le début, 90 jours au plus.
  if v_debut < now() - interval '10 minutes' or v_debut > now() + interval '90 days'
     or (p_fin is not null and (p_fin <= v_debut or p_fin > v_debut + interval '90 days')) then
    raise exception 'Dates invalides' using errcode = '22023';
  end if;
  if (v_btexte is null) <> (v_blien is null) or (v_btexte is not null and (char_length(v_btexte) > 40 or not seneve._annonce_lien_valide(v_blien))) then
    raise exception 'Bouton invalide' using errcode = '22023';
  end if;
  -- Image : celle de cette annonce, ou celle de l'autre langue du même groupe.
  if v_image is not null and not exists (select 1 from storage.objects o where o.bucket_id = 'annonces' and o.name = v_image) then
    raise exception 'Image introuvable' using errcode = '22023';
  end if;
  if v_image is not null and v_image <> p_client_id::text || '.jpg'
     and not (p_groupe_id is not null and exists (select 1 from seneve.annonces g where g.groupe_id = p_groupe_id
                                                    and g.image_path = v_image and g.client_id::text || '.jpg' = v_image)) then
    raise exception 'Image introuvable' using errcode = '22023';
  end if;
  if v_video is not null and not (char_length(v_video) <= 500 and v_video !~ '\s' and (
       v_video ~ '^https://((www|m)\.)?youtube\.com/(watch\?v=|shorts/|live/)[A-Za-z0-9_-]{11}([?&#][A-Za-z0-9_=&%.-]*)?$'
       or v_video ~ '^https://youtu\.be/[A-Za-z0-9_-]{11}([?#][A-Za-z0-9_=&%.-]*)?$'
       or v_video ~ '^https://((www|m|vm|vt)\.)?tiktok\.com/[A-Za-z0-9@._/-]+([?#][A-Za-z0-9_=&%.-]*)?$')) then
    raise exception 'Lien vidéo invalide' using errcode = '22023';
  end if;
  -- Groupe : au plus une annonce par langue.
  if p_groupe_id is not null and exists (select 1 from seneve.annonces g where g.groupe_id = p_groupe_id
                                          and g.langue = p_langue and g.client_id <> p_client_id) then
    raise exception 'Cette langue existe déjà pour cette annonce' using errcode = '23505';
  end if;
  select * into r from seneve.annonces where client_id = p_client_id;
  if found then
    if r.titre <> v_titre or r.texte <> v_texte or r.langue <> p_langue or r.cible <> p_cible
       or r.programme_id is distinct from (case when p_cible = 'programme' then p_programme_id end)
       or r.image_path is distinct from v_image or r.video_url is distinct from v_video
       or r.fin_le is distinct from p_fin or r.affiche <> coalesce(p_affiche, false)
       or r.bouton_texte is distinct from v_btexte or r.bouton_lien is distinct from v_blien
       or r.groupe_id is distinct from p_groupe_id then
      raise exception 'Cet identifiant a déjà servi pour une autre annonce' using errcode = '23505';
    end if;
    -- Répétition : rien n'est envoyé une deuxième fois.
    return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', true,
      'telephones', (select count(*) from seneve.annonce_envois e where e.annonce_id = r.annonce_id),
      'differes', (select count(*) from seneve.annonce_envois e where e.annonce_id = r.annonce_id and e.etat = 'planifie' and e.creneau > now()));
  end if;
  insert into seneve.annonces (client_id, titre, texte, langue, cible, programme_id, cree_par, image_path, video_url, sonner,
                               publie_le, fin_le, affiche, bouton_texte, bouton_lien, groupe_id)
  values (p_client_id, v_titre, v_texte, p_langue, p_cible, case when p_cible = 'programme' then p_programme_id end, auth.uid(),
          v_image, v_video, coalesce(p_sonner, true), v_debut, p_fin, coalesce(p_affiche, false), v_btexte, v_blien, p_groupe_id)
  returning * into r;
  if r.sonner then
    select total, differes into v_total, v_differes from seneve._annonce_planifier(r.annonce_id);
    if v_total > v_differes then perform seneve._annonces_reveiller(); end if;
  end if;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_publiee', 'annonce:' || r.annonce_id::text, 'ok',
          jsonb_build_object('langue', r.langue, 'cible', r.cible, 'programme_id', r.programme_id,
                             'image', r.image_path is not null, 'video', r.video_url is not null,
                             'sonner', r.sonner, 'telephones', v_total, 'differes', v_differes,
                             'debut', r.publie_le, 'fin', r.fin_le, 'affiche', r.affiche, 'bouton', r.bouton_lien is not null,
                             'groupe', r.groupe_id));
  return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', false, 'telephones', v_total, 'differes', v_differes);
end $$;

-- 9. Liste de l'administration : envois sur les téléphones et affiches (vues, fermées, bouton).
create or replace function seneve.staff_annonces()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not seneve.has_role('administrateur') then raise exception 'Administration requise' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) - 'cree_par' || jsonb_build_object(
             'envois', jsonb_build_object(
               'acceptes', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat = 'accepte'),
               'en_attente', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat in ('planifie','en_traitement','erreur')),
               'echecs', (select count(*) from seneve.annonce_envois e where e.annonce_id = a.annonce_id and e.etat = 'expire')),
             'affichages', jsonb_build_object(
               'vues', (select count(*) from seneve.annonce_affichages f where f.annonce_id = a.annonce_id),
               'fermees', (select count(*) from seneve.annonce_affichages f where f.annonce_id = a.annonce_id and f.action in ('fermee','plus_tard')),
               'bouton', (select count(*) from seneve.annonce_affichages f where f.annonce_id = a.annonce_id and f.action = 'bouton')))
           order by a.publie_le desc)
             from (select * from seneve.annonces order by publie_le desc limit 100) a), '[]'::jsonb);
end $$;

-- 10. Affiche à l'ouverture : la plus récente annonce en cours, pas encore vue (ni elle ni l'autre langue de son groupe),
--     publiée il y a 30 jours au plus. La langue de l'écran est préférée quand les deux existent.
create or replace function seneve.mon_affiche(p_langue text default 'fr')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_p uuid := seneve.current_participant_id(); v_vu timestamptz; r record;
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  select vu_jusqu_a into v_vu from seneve.notifications_vues where participant_id = v_p;
  with mes_inscriptions as (
    select e.programme_id, e.langue from seneve.enrollments e where e.participant_id = v_p and e.etat <> 'annulee'
  ), mes_langues as (
    select langue from mes_inscriptions
    union select coalesce((select langue from seneve.participants where participant_id = v_p), 'fr')
  )
  select a.annonce_id, a.titre, a.texte, a.langue, a.image_path, a.video_url, a.bouton_texte, a.bouton_lien, a.publie_le, a.fin_le
    into r
    from seneve.annonces a
   where a.affiche and a.retire_le is null and a.publie_le <= now() and a.publie_le >= now() - interval '30 days'
     and (a.fin_le is null or a.fin_le > now())
     -- déjà lue dans la cloche après sa publication : l'affiche ne revient pas
     and (v_vu is null or v_vu < a.publie_le)
     and a.langue in (select langue from mes_langues)
     and (a.cible = 'tous' or a.programme_id in (select programme_id from mes_inscriptions))
     and not exists (select 1 from seneve.annonce_affichages f join seneve.annonces o on o.annonce_id = f.annonce_id
                      where f.participant_id = v_p
                        and (o.annonce_id = a.annonce_id or (a.groupe_id is not null and o.groupe_id = a.groupe_id)))
   order by a.publie_le desc, (a.langue = coalesce(p_langue, 'fr')) desc
   limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id', r.annonce_id, 'titre', r.titre, 'texte', r.texte, 'langue', r.langue, 'image', r.image_path,
                            'video', r.video_url, 'bouton_texte', r.bouton_texte, 'bouton_lien', r.bouton_lien,
                            'debut', r.publie_le, 'fin', r.fin_le);
end $$;

-- Ce que la personne a fait de l'affiche (« vue » à l'affichage, puis fermée, plus tard ou bouton).
create or replace function seneve.affiche_marquer(p_annonce_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_p uuid := seneve.current_participant_id();
begin
  if v_p is null then raise exception 'Session requise.' using errcode = '28000'; end if;
  if p_action not in ('vue','fermee','plus_tard','bouton') then raise exception 'Action invalide' using errcode = '22023'; end if;
  if not exists (select 1 from seneve.annonces a where a.annonce_id = p_annonce_id and a.affiche) then
    raise exception 'Annonce introuvable' using errcode = '22023';
  end if;
  insert into seneve.annonce_affichages (annonce_id, participant_id, action)
  values (p_annonce_id, v_p, p_action)
  on conflict (annonce_id, participant_id) do update
    set action = case when excluded.action = 'vue' then seneve.annonce_affichages.action else excluded.action end,
        dernier_le = now();
end $$;

-- 11. Droits.
revoke all on function seneve._annonce_lien_valide(text), seneve._annonce_creneau_a(uuid, timestamptz) from public, anon, authenticated;
revoke all on function seneve._annonce_planifier(uuid) from public, anon, authenticated;
revoke all on function seneve.claim_push_annonces(int) from public, anon, authenticated;
grant execute on function seneve.claim_push_annonces(int) to service_role;
revoke all on function seneve.staff_annonce_programmer(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, boolean, text, text, uuid) from public, anon;
grant execute on function seneve.staff_annonce_programmer(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, boolean, text, text, uuid) to authenticated;
revoke all on function seneve.mes_notifications(integer), seneve.staff_annonces(), seneve.mon_affiche(text), seneve.affiche_marquer(uuid, text) from public, anon;
grant execute on function seneve.mes_notifications(integer), seneve.staff_annonces(), seneve.mon_affiche(text), seneve.affiche_marquer(uuid, text) to authenticated;

-- Retour arrière (à exécuter seulement sur décision ; les annonces déjà publiées restent) :
-- drop function seneve.affiche_marquer(uuid, text), seneve.mon_affiche(text);
-- drop function seneve.staff_annonce_programmer(uuid,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,boolean,text,text,uuid);
-- puis réinstaller depuis seneve_052 : staff_annonces, claim_push_annonces, _annonce_planifier ;
--   et mes_notifications depuis seneve_051 ;
-- drop function seneve._annonce_creneau_a(uuid, timestamptz), seneve._annonce_lien_valide(text);
-- drop table seneve.annonce_affichages;
-- alter table seneve.annonces drop constraint annonces_bouton_complet, drop constraint annonces_fin_apres_debut,
--   drop column groupe_id, drop column bouton_lien, drop column bouton_texte, drop column affiche, drop column fin_le;
