-- 056 : les tâches « reevaluer_rappels » ne sont plus des incidents.
-- record_progress et hd_corriger_realisation les créent, mais aucun traitement ne les réclame
-- (pas de claim_*) : l'envoi vérifie déjà activity_state (claim_push_reminders) et les rappels
-- Habitudes & Défis sont annulés par le déclencheur hd_cancel_completed_reminders.
-- Elles restaient « en_attente » et remplissaient la page Incidents (44 le 03/11/2026).

create or replace function seneve._incident_sources()
 returns table(source text, source_id uuid, revision text, categorie text, etat_source text, date_source timestamp with time zone, gravite text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select 'communication'::text, c.communication_id,
    md5(concat_ws('|', c.etat, c.tentatives::text, extract(epoch from c.modifie_le)::text)),
    c.canal, c.etat, c.modifie_le, case when c.etat = 'erreur' then 'Élevée' else 'Moyenne' end
  from seneve.communications c where c.etat in ('erreur','incertain','expire')
  union all
  select 'traitement'::text, j.job_id,
    md5(concat_ws('|', j.etat, j.tentatives::text, extract(epoch from j.reserve_le)::text, extract(epoch from j.echeance)::text)),
    j.type, j.etat, coalesce(j.reserve_le, j.echeance, j.cree_le),
    case when j.etat = 'erreur' then 'Élevée' else 'Moyenne' end
  from seneve.jobs j where j.etat in ('erreur','a_examiner')
    or (j.etat = 'en_attente' and j.type <> 'reevaluer_rappels' and j.echeance < now() - interval '24 hours');
$function$;

-- Clôture des tâches en attente, sauvegardées dans audit_events (même méthode que la maintenance du 24/10/2026).
with candidats as materialized (
  select j.* from seneve.jobs j
   where j.type = 'reevaluer_rappels' and j.etat = 'en_attente'
   for update of j
), sauvegardes as (
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  select 'maintenance_autorisee', 'cloture_reevaluer_rappels', 'job:' || job_id, 'sans_envoi',
         jsonb_build_object('avant', to_jsonb(candidats), 'motif', 'Aucun traitement ne réclame ce type ; contrôle déjà fait à l''envoi')
    from candidats returning objet
)
update seneve.jobs j
   set etat = 'annulee', erreur = 'Sans objet : aucun traitement prévu, contrôle déjà fait à l''envoi ; aucun envoi'
  from candidats c, sauvegardes s
 where j.job_id = c.job_id and s.objet = 'job:' || j.job_id;
