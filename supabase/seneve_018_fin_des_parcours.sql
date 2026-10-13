-- SÉNEVÉ 018 — Fin automatique des parcours (décision de Dr Justin, 13/10/2026 23:19 : « 1 oui »).
-- Un parcours ouvert dans l'espace web (sans inscription WhatsApp / feuille INSCRIPTIONS) passe à « terminee »
-- le lendemain de son dernier jour, à l'heure du participant. Rien n'est effacé : journées, journal,
-- progrès et conversations restent consultables. Les nouvelles actions, questions au coach et demandes
-- de séance sont refusées par les fonctions existantes (elles exigent etat = 'active').
-- Les inscriptions venant de la feuille INSCRIPTIONS (legacy_inscription_id renseigné) ne sont PAS touchées :
-- elles suivent toujours le statut de la feuille.
-- Une pause ne prolonge pas le parcours (cahier des charges n° 11) : un parcours en pause se termine aussi.

create or replace function seneve.close_finished_enrollments()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_ids uuid[];
begin
  with fini as (
    update seneve.enrollments e set etat = 'terminee'
      from seneve.participants p, seneve.programmes pr
     where p.participant_id = e.participant_id
       and pr.programme_id = e.programme_id
       and e.legacy_inscription_id is null
       and e.etat in ('active', 'en_pause')
       and (now() at time zone coalesce(nullif(p.fuseau, ''), 'Africa/Kinshasa'))::date
           > coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 7) - 1))
    returning e.enrollment_id
  )
  select coalesce(array_agg(enrollment_id), '{}') into v_ids from fini;

  if cardinality(v_ids) > 0 then
    -- Communications encore prévues pour ces parcours : annulées (aucune relance après la fin).
    update seneve.communications set etat = 'annule', modifie_le = now()
     where enrollment_id = any(v_ids) and etat = 'planifie';
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    select 'systeme', 'parcours_termine', 'enrollment:' || x::text, 'ok', jsonb_build_object('regle', 'fin_de_duree')
      from unnest(v_ids) x;
  end if;
  return jsonb_build_object('termines', cardinality(v_ids));
end $$;

revoke all on function seneve.close_finished_enrollments() from public, anon, authenticated;
grant execute on function seneve.close_finished_enrollments() to service_role;
