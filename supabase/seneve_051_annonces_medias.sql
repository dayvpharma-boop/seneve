-- SÉNEVÉ 051 — Image et vidéo dans les annonces (décision de Dr Justin du 29/10/2026 : image téléversée + lien vidéo).
-- * Image : une photo par annonce, réduite sur l'appareil (JPEG, 2 Mo au plus), rangée dans le stockage public
--   « annonces » sous le nom <client_id>.jpg. Seul un administrateur peut y déposer ou retirer un fichier.
-- * Vidéo : un lien YouTube ou TikTok (aucun fichier vidéo hébergé : formule Supabase gratuite, 1 Go en tout).
-- Ajouts seulement : deux colonnes facultatives ; les annonces existantes restent valides.
-- Retour arrière en fin de fichier (commentaire).

alter table seneve.annonces add column if not exists image_path text;
alter table seneve.annonces add column if not exists video_url text;
alter table seneve.annonces drop constraint if exists annonces_image_path_format;
alter table seneve.annonces add constraint annonces_image_path_format
  check (image_path is null or image_path = client_id::text || '.jpg');
alter table seneve.annonces drop constraint if exists annonces_video_url_format;
alter table seneve.annonces add constraint annonces_video_url_format
  check (video_url is null or (char_length(video_url) <= 500 and video_url !~ '\s' and (
    video_url ~ '^https://((www|m)\.)?youtube\.com/(watch\?v=|shorts/|live/)[A-Za-z0-9_-]{11}([?&#][A-Za-z0-9_=&%.-]*)?$'
    or video_url ~ '^https://youtu\.be/[A-Za-z0-9_-]{11}([?#][A-Za-z0-9_=&%.-]*)?$'
    or video_url ~ '^https://((www|m|vm|vt)\.)?tiktok\.com/[A-Za-z0-9@._/-]+([?#][A-Za-z0-9_=&%.-]*)?$')));

-- Stockage public « annonces » : lecture par lien public, dépôt et retrait par un administrateur seulement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('annonces', 'annonces', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

drop policy if exists annonces_image_deposer on storage.objects;
create policy annonces_image_deposer on storage.objects for insert to authenticated
  with check (bucket_id = 'annonces' and (select seneve.has_role('administrateur'))
              and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$');
drop policy if exists annonces_image_retirer on storage.objects;
create policy annonces_image_retirer on storage.objects for delete to authenticated
  using (bucket_id = 'annonces' and (select seneve.has_role('administrateur')));

-- Publication : l'ancienne fonction (6 paramètres) est remplacée par la même avec deux paramètres facultatifs ;
-- un appel sans image ni vidéo reste identique.
drop function if exists seneve.staff_annonce_publier(uuid, text, text, text, text, text);
create or replace function seneve.staff_annonce_publier(p_client_id uuid, p_titre text, p_texte text, p_langue text, p_cible text,
  p_programme_id text default null, p_image_path text default null, p_video_url text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r seneve.annonces%rowtype;
  v_titre text := btrim(coalesce(p_titre,''));
  v_texte text := btrim(coalesce(p_texte,''));
  v_image text := nullif(btrim(coalesce(p_image_path,'')),'');
  v_video text := nullif(btrim(coalesce(p_video_url,'')),'');
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
    return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', true);
  end if;
  insert into seneve.annonces (client_id, titre, texte, langue, cible, programme_id, cree_par, image_path, video_url)
  values (p_client_id, v_titre, v_texte, p_langue, p_cible, case when p_cible = 'programme' then p_programme_id end, auth.uid(), v_image, v_video)
  returning * into r;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe:' || auth.uid()::text, 'annonce_publiee', 'annonce:' || r.annonce_id::text, 'ok',
          jsonb_build_object('langue', r.langue, 'cible', r.cible, 'programme_id', r.programme_id,
                             'image', r.image_path is not null, 'video', r.video_url is not null));
  return to_jsonb(r) - 'cree_par' || jsonb_build_object('repetition', false);
end $$;

revoke all on function seneve.staff_annonce_publier(uuid, text, text, text, text, text, text, text) from public, anon;
grant execute on function seneve.staff_annonce_publier(uuid, text, text, text, text, text, text, text) to authenticated;

-- Lecture participant : même fonction que seneve_050, l'annonce porte en plus `image` (nom du fichier) et `video` (lien).
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
           jsonb_build_object('titre', a.titre, 'texte', a.texte, 'langue', a.langue, 'image', a.image_path, 'video', a.video_url) as contenu
      from seneve.annonces a
     where a.retire_le is null and a.publie_le <= now() and a.publie_le >= v_depuis
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

revoke all on function seneve.mes_notifications(integer) from public, anon;
grant execute on function seneve.mes_notifications(integer) to authenticated;

-- Retour arrière (à exécuter seulement sur décision) :
-- 1. réinstaller seneve.mes_notifications de seneve_050_notifications_rappels.sql ;
-- 2. drop function seneve.staff_annonce_publier(uuid,text,text,text,text,text,text,text);
--    puis réinstaller staff_annonce_publier (6 paramètres) et ses droits de seneve_049_notifications.sql ;
-- 3. drop policy annonces_image_deposer on storage.objects; drop policy annonces_image_retirer on storage.objects;
--    (vider puis supprimer le stockage « annonces » depuis le tableau de bord Supabase) ;
-- 4. alter table seneve.annonces drop column image_path, drop column video_url;
