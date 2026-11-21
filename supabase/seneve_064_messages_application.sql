-- SÉNEVÉ — seneve_064_messages_application (21/11/2026)
-- Décision de Dr Justin du 21/11/2026 : les messages du programme (matin, midi, soir) arrivent dans l'application
-- au lieu de WhatsApp, pour éviter les coûts. Moteur retenu : le planificateur Supabase déjà en place (pas n8n),
-- pour éviter deux moteurs et les doublons.
-- Ajout seulement : aucune table, fonction ou inscription existante n'est modifiée, sauf mes_notifications
-- qui reçoit un nouveau type « programme » (les autres types restent identiques).
--
-- Règles :
-- * Source unique : contenus déjà publiés (seneve.contents) de la version figée de chaque inscription.
-- * Indépendant de l'accord push et de la présence d'un téléphone : le message est dans la cloche même sans sonnerie.
-- * Horaires : réglage du participant (preferences.rappels.moments) sinon programmes.heures_messages,
--   sinon 08:00 pour le seul message du jour. Fuseau du participant (Africa/Kinshasa par défaut).
-- * Programmes à 3 messages : matin = 1er contenu du jour, midi = 2e, soir = 3e (s'il existe dans la version).
--   Programmes à 1 message (Découverte 7 jours, Continuité) : un seul message, le matin. Aucun contenu inventé.
-- * Un message par inscription, jour local et moment (clé unique) ; jamais de rattrapage des jours passés.
-- * Habitudes & Défis exclu (il a ses propres rappels).
-- * Lecture d'un message ≠ réalisation d'une action.

create table if not exists seneve.messages_app (
  message_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references seneve.participants(participant_id) on delete cascade,
  enrollment_id uuid not null references seneve.enrollments(enrollment_id) on delete cascade,
  content_id uuid not null references seneve.contents(content_id),
  date_locale date not null,
  jour int not null,
  moment text not null check (moment in ('matin','midi','soir')),
  depose_le timestamptz not null default now(),
  unique (enrollment_id, date_locale, moment)
);
create index if not exists messages_app_participant on seneve.messages_app (participant_id, depose_le desc);
alter table seneve.messages_app enable row level security;
revoke all on seneve.messages_app from anon, authenticated;

create or replace function seneve.deposer_messages_app()
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  insert into seneve.messages_app (participant_id, enrollment_id, content_id, date_locale, jour, moment)
  select s.participant_id, s.enrollment_id, s.content_id, s.date_locale, s.jour, s.moment
    from (
      select p.participant_id, e.enrollment_id, x.date_locale, x.jour, x.heure_locale, m.moment, ct.content_id,
             coalesce(p.preferences #>> array['rappels','moments',m.moment], m.heure_programme) as heure
        from seneve.enrollments e
        join seneve.participants p on p.participant_id = e.participant_id
        join seneve.programmes pr on pr.programme_id = e.programme_id
        cross join lateral (select (now() at time zone coalesce(p.preferences #>> '{rappels,fuseau}', p.fuseau, 'Africa/Kinshasa')) as ml) l
        cross join lateral (select l.ml::date as date_locale, (l.ml::date - e.date_debut) + 1 as jour, l.ml::time as heure_locale) x
        cross join lateral (
          select v.moment, v.rang, v.heure_programme from (values
            ('matin', 1, coalesce(pr.heures_messages[1], '08:00')),
            ('midi',  2, pr.heures_messages[2]),
            ('soir',  3, pr.heures_messages[3])) v(moment, rang, heure_programme)
           where coalesce(pr.messages_par_jour, 1) >= 3 or v.rang = 1) m
        join lateral (
          -- numero_message est un compteur sur tout le parcours : on prend le n-ième contenu du jour.
          select c.content_id from seneve.contents c
           where c.programme_id = e.programme_id and c.version = e.version and c.jour = x.jour
           order by c.numero_message
           offset m.rang - 1 limit 1) ct on true
       where e.etat = 'active'
         and x.jour between 1 and coalesce(pr.duree_jours, 7)
         and not exists (select 1 from seneve.hd_programme_links hd
                          where hd.programme_id = e.programme_id and hd.version = e.version and hd.langue = e.langue)
    ) s
   where s.heure is not null
     and s.heure ~ '^[0-2][0-9]:[0-5][0-9]$'
     and s.heure_locale >= s.heure::time
  on conflict (enrollment_id, date_locale, moment) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function seneve.deposer_messages_app() from public, anon, authenticated;

-- Nouveau type « programme » dans la cloche ; les autres types sont repris à l'identique (seneve_050/054).
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
    select 'programme', ma.message_id::text, ma.depose_le, (v_vu is null or ma.depose_le > v_vu),
           jsonb_build_object('moment', ma.moment, 'jour', ma.jour, 'titre', c.titre, 'theme', c.theme,
                              'programme', pr.nom, 'langue', i.langue)
      from seneve.messages_app ma
      join mes_inscriptions i on i.enrollment_id = ma.enrollment_id
      join seneve.contents c on c.content_id = ma.content_id
      join seneve.programmes pr on pr.programme_id = i.programme_id
     where ma.participant_id = v_p and ma.depose_le >= v_depuis
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

-- Dépôt toutes les 5 minutes, dans la base (aucun appel extérieur, aucun coût d'envoi).
select cron.unschedule('seneve-messages-application') where exists (select 1 from cron.job where jobname = 'seneve-messages-application');
select cron.schedule('seneve-messages-application', '*/5 * * * *', $$select seneve.deposer_messages_app()$$);

-- Retour arrière :
--   select cron.unschedule('seneve-messages-application');
--   réinstaller mes_notifications de seneve_054 ; drop function seneve.deposer_messages_app(); drop table seneve.messages_app;
