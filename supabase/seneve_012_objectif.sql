-- SÉNEVÉ 012 — Objectif personnel du participant (cahier des charges, numéro 2, section 5).
-- * Le participant formule et confirme lui-même un objectif principal (5 à 300 caractères),
--   avec une racine du livre facultative (1 à 7, dans l'ordre du Test des 7 Racines).
-- * Un seul objectif confirmé à la fois ; le précédent passe à « archivé » (historique conservé).
-- * Aucune durée d'accès n'est modifiée. Rien n'est déduit du journal.
-- * Le coach IA reçoit l'objectif confirmé pour y relier ses suggestions.
-- Aucune donnée existante n'est supprimée (la table des objectifs est vide à ce jour).

alter table seneve.goals add column if not exists racine smallint check (racine between 1 and 7);
alter table seneve.goals add constraint goals_texte_longueur check (char_length(btrim(texte)) between 5 and 300);
create unique index if not exists goals_un_confirme on seneve.goals (participant_id) where etat = 'confirme';

-- Écriture uniquement par fonction contrôlée ; lecture de ses seuls objectifs.
revoke insert, update, delete on seneve.goals from authenticated;
drop policy if exists objectifs_personnels on seneve.goals;
create policy objectifs_lecture on seneve.goals for select to authenticated
  using (participant_id = (select seneve.current_participant_id()));

create or replace function seneve.goal_set(p_texte text, p_racine int default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_actuel seneve.goals%rowtype;
  v_texte text := btrim(coalesce(p_texte, ''));
  v_id uuid;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if char_length(v_texte) not between 5 and 300 then
    raise exception 'Ton objectif doit faire entre 5 et 300 caractères.' using errcode = '22023';
  end if;
  if p_racine is not null and p_racine not between 1 and 7 then
    raise exception 'Racine inconnue.' using errcode = '22023';
  end if;
  select * into v_actuel from seneve.goals where participant_id = v_participant and etat = 'confirme' for update;
  -- Même objectif renvoyé (double clic, nouvel essai) : rien ne change.
  if found and v_actuel.texte = v_texte and v_actuel.racine is not distinct from p_racine::smallint then
    return jsonb_build_object('goal_id', v_actuel.goal_id, 'repetition', true);
  end if;
  if found then
    update seneve.goals set etat = 'archive' where goal_id = v_actuel.goal_id;
  end if;
  insert into seneve.goals (participant_id, texte, racine, etat, confirme_le)
  values (v_participant, v_texte, p_racine, 'confirme', now())
  returning goal_id into v_id;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('participant:' || v_participant::text, case when v_actuel.goal_id is null then 'objectif_confirme' else 'objectif_modifie' end,
          'goal:' || v_id::text, 'ok', jsonb_build_object('racine', p_racine));
  return jsonb_build_object('goal_id', v_id, 'repetition', false);
end $$;

revoke all on function seneve.goal_set(text, int) from public, anon;
grant execute on function seneve.goal_set(text, int) to authenticated;

-- Le coach reçoit l'objectif confirmé (deux colonnes ajoutées au contexte).
drop function if exists seneve.claim_coach_jobs(int);
create or replace function seneve.claim_coach_jobs(p_limite int default 5)
returns table (job_id uuid, message_id uuid, tentatives int, question text, prenom text, langue text,
               programme_nom text, jour int, duree int, contenus jsonb, activites jsonb,
               historique jsonb, notes_autorisees jsonb, objectif text, objectif_racine int)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  -- Dernière tentative restée sans suite : échec définitif (ne compte pas dans le quota).
  with perdus as (
    update seneve.jobs j set etat = 'a_examiner', erreur = coalesce(j.erreur, 'délai dépassé')
     where j.type = 'coach_repondre' and j.etat = 'en_traitement' and j.tentatives >= 3
       and j.reserve_le < now() - interval '5 minutes'
    returning (j.charge->>'message_id')::uuid as mid)
  update seneve.coach_messages m set etat = 'echec' from perdus where m.message_id = perdus.mid;
  -- Questions effacées entre-temps : la tâche n'a plus d'objet.
  update seneve.jobs j set etat = 'annulee', erreur = 'message effacé'
   where j.type = 'coach_repondre' and j.etat = 'en_attente'
     and not exists (select 1 from seneve.coach_messages m where m.message_id = (j.charge->>'message_id')::uuid);
  return query
  with pris as (
    update seneve.jobs j set etat = 'en_traitement', reserve_le = now(), tentatives = j.tentatives + 1
     where j.job_id in (
       select x.job_id from seneve.jobs x
        where x.type = 'coach_repondre'
          and (x.etat = 'en_attente' or (x.etat = 'en_traitement' and x.reserve_le < now() - interval '5 minutes'))
          and x.echeance <= now() and x.tentatives < 3
        order by x.cree_le limit greatest(1, least(p_limite, 20))
        for update skip locked)
    returning j.job_id, (j.charge->>'message_id')::uuid as mid, j.tentatives),
  base as (
    select pris.*, m.texte, m.participant_id, m.cree_le, e.enrollment_id, e.programme_id, e.version, e.date_debut,
           p.prenom, coalesce(e.langue, p.langue) as langue, pr.nom, coalesce(pr.duree_jours, 7) as duree,
           least(coalesce(pr.duree_jours, 7), greatest(1,
             ((now() at time zone 'Africa/Kinshasa')::date - e.date_debut) + 1)) as jour
      from pris
      join seneve.coach_messages m on m.message_id = pris.mid
      join seneve.participants p on p.participant_id = m.participant_id
      left join seneve.enrollments e on e.enrollment_id = m.enrollment_id
      left join seneve.programmes pr on pr.programme_id = e.programme_id)
  update seneve.coach_messages m set etat = 'en_traitement' from base where m.message_id = base.mid
  returning base.job_id, base.mid, base.tentatives, base.texte, base.prenom, base.langue, base.nom, base.jour, base.duree,
    coalesce((select jsonb_agg(jsonb_build_object('moment', c.numero_message, 'theme', c.theme, 'texte_officiel', c.texte_officiel,
                                                  'explication', c.explication, 'reference_livre', c.reference_livre) order by c.numero_message)
                from seneve.contents c
               where c.programme_id = base.programme_id and c.version = base.version and c.jour = base.jour), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('type', a.type_activite, 'consigne', a.consigne))
                from seneve.activities a join seneve.contents c using (content_id)
               where c.programme_id = base.programme_id and c.version = base.version and c.jour = base.jour), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('role', h.role, 'texte', left(h.texte, 1500)) order by h.cree_le)
                from (select * from seneve.coach_messages h
                       where h.participant_id = base.participant_id and h.message_id <> base.mid
                         and h.cree_le < base.cree_le and h.etat in ('repondu', 'enregistre')
                       order by h.cree_le desc limit 8) h), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('date', to_char(j.cree_le at time zone 'Africa/Kinshasa', 'DD/MM/YYYY'),
                                                  'texte', left(j.texte, 1200)) order by j.cree_le desc)
                from (select * from seneve.journal_entries j
                       where j.participant_id = base.participant_id and j.usage_ia_autorise
                       order by j.cree_le desc limit 5) j), '[]'::jsonb),
    (select g.texte from seneve.goals g where g.participant_id = base.participant_id and g.etat = 'confirme' limit 1),
    (select g.racine::int from seneve.goals g where g.participant_id = base.participant_id and g.etat = 'confirme' limit 1);
end $$;


revoke all on function seneve.claim_coach_jobs(int) from public, anon, authenticated;
grant execute on function seneve.claim_coach_jobs(int) to service_role;
