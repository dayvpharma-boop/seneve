-- Tableau de pilotage : lecture seule, administrateurs uniquement, aucun journal ni message.
-- Version 2 (18/10/2026) : période au choix (7 ou 30 jours) comparée à la période précédente,
-- parcours d'entrée (test → Découverte → achat), pratique réelle (actions), coach,
-- comptes de l'équipe exclus des chiffres participants.
drop function if exists seneve.staff_dashboard();
create or replace function seneve.staff_dashboard(p_jours integer default 7)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_jours int := case when p_jours in (7, 30) then p_jours else 7 end;
  v_debut timestamptz := now() - make_interval(days => v_jours);
  v_avant timestamptz := now() - make_interval(days => 2 * v_jours);
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
begin
  if (select auth.uid()) is null or not seneve.has_role('administrateur') then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501';
  end if;
  with equipe as (
    select distinct p.participant_id from seneve.participants p join seneve.staff_roles s on s.auth_user_id = p.auth_user_id
  ),
  part as (select * from seneve.participants where participant_id not in (select participant_id from equipe)),
  insc as (select e.* from seneve.enrollments e where e.participant_id in (select participant_id from part)),
  en_cours as (
    select e.*, pr.duree_jours,
      greatest(e.date_debut::timestamptz,
        coalesce((select max(a.modifie_le) from seneve.activity_state a where a.enrollment_id = e.enrollment_id), e.date_debut::timestamptz)) as derniere_activite
    from insc e join seneve.programmes pr using (programme_id)
    where e.etat = 'active' and e.date_debut <= v_auj
      and coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 7) - 1)) >= v_auj
  ),
  relances as (
    select p.prenom, p.langue, u.email::text as email, e.programme_id, pr.nom as programme, e.enrollment_id,
      e.derniere_activite,
      least(coalesce(e.duree_jours, 7), (v_auj - e.date_debut) + 1) as jour,
      coalesce(e.duree_jours, 7) as duree,
      (v_auj - (e.derniere_activite at time zone 'Africa/Kinshasa')::date) as jours_sans_activite,
      (select c.identite_canal from seneve.channel_links c where c.participant_id = p.participant_id and c.etat = 'verifiee' and c.canal = 'whatsapp' order by c.verifiee_le desc limit 1) as whatsapp
    from en_cours e join part p using (participant_id)
    join seneve.programmes pr on pr.programme_id = e.programme_id
    left join auth.users u on u.id = p.auth_user_id
    where e.derniere_activite < now() - interval '3 days'
  ),
  evts as (
    select pe.nouvel_etat, pe.date_serveur, pe.enrollment_id, pe.activity_id, e.participant_id
    from seneve.progress_events pe join insc e using (enrollment_id)
  ),
  nouveaux as (select participant_id from part where cree_le >= v_debut)
  select jsonb_build_object(
    'actualise_le', now(),
    'periode_jours', v_jours,
    'equipe_exclue', (select count(*) from equipe),
    -- Vue d'ensemble
    'participants', (select count(*) from part),
    'nouveaux', (select count(*) from part where cree_le >= v_debut),
    'nouveaux_avant', (select count(*) from part where cree_le >= v_avant and cree_le < v_debut),
    'actifs', (select count(distinct participant_id) from evts where date_serveur >= v_debut),
    'actifs_avant', (select count(distinct participant_id) from evts where date_serveur >= v_avant and date_serveur < v_debut),
    'parcours_en_cours', (select count(*) from en_cours),
    'parcours_termines', (select count(*) from insc where etat = 'terminee'),
    'aide_attente', (select count(*) from seneve.help_requests where etat not in ('resolue','annulee')),
    'aide_attente_48h', (select count(*) from seneve.help_requests where etat not in ('resolue','annulee') and cree_le < now() - interval '48 hours'),
    -- Parcours d'entrée : test → Découverte → achat
    'entree', jsonb_build_object(
      'visites_test', (select count(*) from seneve.test_visits where cree_le >= v_debut),
      'visites_test_avant', (select count(*) from seneve.test_visits where cree_le >= v_avant and cree_le < v_debut),
      'tests_termines', (select count(*) from seneve.test_results where cree_le >= v_debut),
      'tests_termines_avant', (select count(*) from seneve.test_results where cree_le >= v_avant and cree_le < v_debut),
      'decouvertes', (select count(*) from insc where programme_id like 'PROSPECT_LIVRE_7J_%' and cree_le >= v_debut),
      'decouvertes_avant', (select count(*) from insc where programme_id like 'PROSPECT_LIVRE_7J_%' and cree_le >= v_avant and cree_le < v_debut),
      'achats', (select count(*) from seneve.payment_events where signature_verifiee and type_evenement = 'successful.sale' and recu_le >= v_debut and statut_traitement <> 'revoque'),
      'achats_avant', (select count(*) from seneve.payment_events where signature_verifiee and type_evenement = 'successful.sale' and recu_le >= v_avant and recu_le < v_debut and statut_traitement <> 'revoque'),
      'sources', coalesce((select jsonb_agg(x order by x.visites desc) from (
          select coalesce(source, 'direct') as source, count(*) as visites from seneve.test_visits
           where cree_le >= v_debut group by 1 order by 2 desc limit 5) x), '[]'::jsonb)
    ),
    -- Pratique réelle : seules les déclarations explicites comptent (lire n'est pas réaliser).
    'pratique', jsonb_build_object(
      'actions_realisees', (select count(distinct (enrollment_id, activity_id)) from evts where nouvel_etat = 'realisee' and date_serveur >= v_debut),
      'actions_realisees_avant', (select count(distinct (enrollment_id, activity_id)) from evts where nouvel_etat = 'realisee' and date_serveur >= v_avant and date_serveur < v_debut),
      'actions_partielles', (select count(distinct (enrollment_id, activity_id)) from evts where nouvel_etat = 'partielle' and date_serveur >= v_debut),
      'aides_bouton', (select count(*) from evts where nouvel_etat = 'aide_demandee' and date_serveur >= v_debut),
      'nouveaux_total', (select count(*) from nouveaux),
      'nouveaux_premiere_action', (select count(distinct participant_id) from evts where nouvel_etat = 'realisee' and participant_id in (select participant_id from nouveaux)),
      'freins', coalesce((select jsonb_agg(x order by x.nombre desc) from (
          select o.motif, count(*) as nombre from seneve.obstacles o
           where o.cree_le >= v_debut and o.participant_id in (select participant_id from part) group by o.motif) x), '[]'::jsonb)
    ),
    -- Coach IA
    'coach', jsonb_build_object(
      'questions', (select count(*) from seneve.coach_messages where role = 'participant' and cree_le >= v_debut and participant_id in (select participant_id from part)),
      'echecs', (select count(*) from seneve.coach_messages where role = 'participant' and etat = 'echec' and cree_le >= v_debut),
      'en_attente', (select count(*) from seneve.coach_messages where role = 'participant' and etat in ('en_attente','en_traitement') and cree_le < now() - interval '10 minutes')
    ),
    'relances_total', (select count(*) from relances),
    'relances', coalesce((select jsonb_agg(x) from (select * from relances order by derniere_activite, enrollment_id limit 50) x), '[]'::jsonb),
    'incidents', coalesce((select jsonb_agg(x) from (
      select 'communication' as source, canal as categorie, etat, count(*) as nombre
      from seneve.communications where etat in ('erreur','incertain','expire') and modifie_le >= v_debut group by canal, etat
      union all
      select 'traitement', type, etat, count(*) from seneve.jobs where etat in ('erreur','a_examiner') group by type, etat
    ) x), '[]'::jsonb),
    'achats_attente', (select count(*) from seneve.payment_events where signature_verifiee and type_evenement = 'successful.sale' and statut_traitement in ('recu','en_attente_compte','a_examiner')),
    'achats', coalesce((select jsonb_agg(x) from (
      select payment_event_id, id_evenement, offre_id, statut_traitement, recu_le
      from seneve.payment_events where signature_verifiee and type_evenement = 'successful.sale' and statut_traitement in ('recu','en_attente_compte','a_examiner')
      order by recu_le, payment_event_id limit 50
    ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;
revoke all on function seneve.staff_dashboard(integer) from public, anon;
grant execute on function seneve.staff_dashboard(integer) to authenticated;
