-- Execute le 24/10/2026 : 9 taches annulees, sauvegardees dans audit_events.
-- Idempotent : ne renvoie aucun message et ne modifie aucune inscription.

WITH candidats AS MATERIALIZED (
 SELECT j.* FROM seneve.jobs j
 JOIN seneve.enrollments e ON e.enrollment_id=(j.charge->>'enrollment_id')::uuid
 JOIN seneve.participants p ON p.participant_id=e.participant_id
 JOIN seneve.activities a ON a.activity_id=(j.charge->>'activity_id')::uuid
 JOIN seneve.contents c ON c.content_id=a.content_id
 WHERE j.type='reevaluer_rappels' AND j.etat='en_attente' AND j.tentatives=0
 AND j.cree_le<'2026-10-19T00:00:00Z'
 AND e.date_debut+c.jour-1 < (now() AT TIME ZONE p.fuseau)::date
 AND NOT EXISTS(SELECT 1 FROM seneve.communications m WHERE m.enrollment_id=e.enrollment_id AND m.etat IN ('planifie','en_traitement','erreur','incertain'))
 FOR UPDATE OF j
), sauvegardes AS (
 INSERT INTO seneve.audit_events(acteur,action,objet,resultat,details)
 SELECT 'maintenance_autorisee','cloture_rappels_obsoletes','job:'||job_id,'sans_envoi',
 jsonb_build_object('avant',to_jsonb(candidats),'motif','Jour passe et aucune communication ouverte; aucun rattrapage')
 FROM candidats RETURNING objet
), clotures AS (
 UPDATE seneve.jobs j SET etat='annulee',erreur='Obsolete : jour passe, aucune communication ouverte; aucun envoi'
 FROM candidats c,sauvegardes s WHERE j.job_id=c.job_id AND s.objet='job:'||j.job_id
 RETURNING j.job_id
) SELECT count(*) AS anciennes_taches_cloturees_sans_envoi FROM clotures;
