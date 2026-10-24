-- Scenarios prepares, execution non confirmee : outil Supabase Invalid or expired requestState.
-- Base de TEST uniquement ; transaction annulee ; aucun appel externe.

BEGIN;
DO $test$
DECLARE
 p uuid; e uuid; ct uuid; a uuid; m uuid; pr text; v int;
 failures text[] := '{}'; n int;
BEGIN
 SELECT content_id,programme_id,version INTO ct,pr,v FROM seneve.contents WHERE jour=1 ORDER BY programme_id,version LIMIT 1;
 IF ct IS NULL THEN RAISE EXCEPTION 'Fixture contenu absente'; END IF;
 INSERT INTO seneve.participants(prenom,fuseau,preferences) VALUES ('TEST_RAPPELS','UTC',jsonb_build_object('rappels',jsonb_build_object('fuseau','UTC','moments',jsonb_build_object('midi',to_char(now() AT TIME ZONE 'UTC','HH24:MI'))))) RETURNING participant_id INTO p;
 INSERT INTO seneve.enrollments(participant_id,programme_id,version,langue,date_debut,date_fin_prevue) VALUES(p,pr,v,'fr',(now() AT TIME ZONE 'UTC')::date,(now() AT TIME ZONE 'UTC')::date+6) RETURNING enrollment_id INTO e;
 INSERT INTO seneve.consents(participant_id,canal,finalite,etat) VALUES(p,'push','rappels','accorde');
 INSERT INTO seneve.push_appareils(participant_id,endpoint,p256dh,auth) VALUES(p,'https://example.invalid/test-rappels','fictif','fictif');
 INSERT INTO seneve.activities(content_id,type_activite,consigne) SELECT ct,type_activite,'TEST' FROM seneve.activities LIMIT 1 RETURNING activity_id INTO a;
 INSERT INTO seneve.communications(cle_idempotence,enrollment_id,content_id,canal,creneau,motif) VALUES('test-'||e,e,ct,'push',now(),'rappel_midi') RETURNING communication_id INTO m;
 IF NOT seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Cas valide refuse'; END IF;
 UPDATE seneve.enrollments SET etat='terminee' WHERE enrollment_id=e;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Parcours termine accepte'; END IF;
 UPDATE seneve.enrollments SET etat='en_pause' WHERE enrollment_id=e;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Pause acceptee'; END IF;
 UPDATE seneve.enrollments SET etat='active',date_fin_prevue=(now() AT TIME ZONE 'UTC')::date-1 WHERE enrollment_id=e;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Date depassee acceptee'; END IF;
 UPDATE seneve.enrollments SET date_fin_prevue=(now() AT TIME ZONE 'UTC')::date+6 WHERE enrollment_id=e;
 UPDATE seneve.consents SET etat='retire' WHERE participant_id=p;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Consentement retire accepte'; END IF;
 UPDATE seneve.consents SET etat='accorde' WHERE participant_id=p;
 INSERT INTO seneve.activity_state(enrollment_id,activity_id,etat) VALUES(e,a,'realisee');
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Action realisee acceptee'; END IF;
 DELETE FROM seneve.activity_state WHERE enrollment_id=e;
 UPDATE seneve.participants SET preferences=jsonb_set(preferences,'{rappels,moments}','{}') WHERE participant_id=p;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Moment desactive accepte'; END IF;
 UPDATE seneve.participants SET preferences=jsonb_set(preferences,'{rappels,moments}',jsonb_build_object('midi',to_char(now() AT TIME ZONE 'UTC','HH24:MI'))) WHERE participant_id=p;
 UPDATE seneve.communications SET creneau=now()-interval '3 hours' WHERE communication_id=m;
 IF seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Vieux rappel accepte'; END IF;
 UPDATE seneve.communications SET creneau=now() WHERE communication_id=m;
 IF NOT seneve._push_rappel_eligible(m) THEN RAISE EXCEPTION 'Retour au cas valide echoue'; END IF;
 SELECT count(*) INTO n FROM seneve.claim_push_reminders(200) r WHERE r.communication_id=m;
 IF n<>1 THEN RAISE EXCEPTION 'Rappel valide non reserve %',n; END IF;
 SELECT count(*) INTO n FROM seneve.claim_push_reminders(200) r WHERE r.communication_id=m;
 IF n<>0 THEN RAISE EXCEPTION 'Double reservation'; END IF;
 UPDATE seneve.communications SET etat='erreur',modifie_le=now()-interval '20 minutes' WHERE communication_id=m;
 INSERT INTO seneve.activity_state(enrollment_id,activity_id,etat) VALUES(e,a,'realisee');
 PERFORM * FROM seneve.claim_push_reminders(200);
 IF (SELECT etat FROM seneve.communications WHERE communication_id=m)<>'annule' THEN RAISE EXCEPTION 'Retry apres realisation non annule'; END IF;
 IF has_function_privilege('anon','seneve._push_rappel_eligible(uuid)','execute') OR has_function_privilege('authenticated','seneve._push_rappel_eligible(uuid)','execute') THEN RAISE EXCEPTION 'Fonction interne exposee'; END IF;
END $test$;
ROLLBACK;
SELECT 'Scenarios rappels verifies; transaction annulee; aucun envoi externe' AS resultat;
