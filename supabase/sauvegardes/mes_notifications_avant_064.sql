-- Version de seneve.mes_notifications avant seneve_064 (md5 de prod/test le 21/11/2026 : ae8fa56eb772b8b012f22c6f08bf4d37).
-- Réinstaller ce fichier pour revenir en arrière.
create or replace function seneve.mes_notifications(p_limite integer default 50)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
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
                                   substring(a.note_source from '^RECETTE_HD_CULTE_V1:(culte_semaine|culte_dimanche):'),
                                   substring(a.note_source from '^RECETTE_HD_DIME_V1:(dime)$')))
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
end $function$;

