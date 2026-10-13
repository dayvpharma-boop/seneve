-- SÉNEVÉ 013 — Essais du bouton « J'ai besoin d'aide ». Tout est annulé à la fin (exception volontaire) :
-- le résultat s'affiche dans le message d'erreur « RESULTATS: [...] », chaque ligne doit avoir ok = true.
do $essais$
declare
  res jsonb := '[]';
  v_uid text; v_part uuid; v_enr uuid; v_act uuid;
  e1 uuid := gen_random_uuid(); e2 uuid := gen_random_uuid(); e3 uuid := gen_random_uuid();
  r jsonb; n int; nj int; motif text;
begin
  select p.auth_user_id::text, p.participant_id, e.enrollment_id, a.activity_id
    into v_uid, v_part, v_enr, v_act
    from seneve.enrollments e join seneve.participants p using (participant_id)
    join seneve.contents c on c.programme_id = e.programme_id and c.version = e.version
    join seneve.activities a on a.content_id = c.content_id and a.type_activite = 'action'
   where e.etat = 'active'
     and not exists (select 1 from seneve.activity_state s where s.enrollment_id = e.enrollment_id and s.activity_id = a.activity_id and s.aide_demandee)
   order by c.jour desc limit 1;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- 01 Premier appui : une demande d'aide et une alerte sont créées
  r := seneve.record_progress(v_enr, v_act, e1, 'aide_demandee', 'web');
  reset role;
  select count(*), max(h.motif) into n, motif from seneve.help_requests h where h.client_request_id = e1;
  select count(*) into nj from seneve.jobs j where j.type = 'aide_demandee' and j.charge->>'request_id' = r->>'demande_aide';
  res := res || jsonb_build_object('essai', '01 demande créée avec alerte', 'ok', n = 1 and nj = 1 and (r->>'aide_demandee')::boolean, 'motif', motif);

  -- 02 Même envoi répété (connexion coupée) : aucun doublon
  set local role authenticated;
  r := seneve.record_progress(v_enr, v_act, e1, 'aide_demandee', 'web');
  reset role;
  select count(*) into n from seneve.help_requests h where h.participant_id = v_part and h.cree_le > now() - interval '1 minute';
  res := res || jsonb_build_object('essai', '02 renvoi identique sans doublon', 'ok', n = 1 and (r->>'repetition')::boolean);

  -- 03 Nouvel appui sur la même action : aide déjà signalée, pas de deuxième demande
  set local role authenticated;
  r := seneve.record_progress(v_enr, v_act, e2, 'aide_demandee', 'web');
  reset role;
  select count(*) into n from seneve.help_requests h where h.participant_id = v_part and h.cree_le > now() - interval '1 minute';
  res := res || jsonb_build_object('essai', '03 un seul signalement par action', 'ok', n = 1 and r->>'demande_aide' is null);

  -- 04 « En partie » ne crée aucune demande et garde l'aide signalée
  set local role authenticated;
  r := seneve.record_progress(v_enr, v_act, e3, 'partielle', 'web');
  reset role;
  select count(*) into n from seneve.help_requests h where h.participant_id = v_part and h.cree_le > now() - interval '1 minute';
  res := res || jsonb_build_object('essai', '04 en partie sans nouvelle demande', 'ok', n = 1 and r->>'etat' = 'partielle' and (r->>'aide_demandee')::boolean);

  -- 05 Aucune note du journal n'est jointe
  select count(*) into n from seneve.help_requests h where h.client_request_id = e1 and h.extraits_partages is null;
  res := res || jsonb_build_object('essai', '05 journal non partagé', 'ok', n = 1);

  raise exception 'RESULTATS: %', res;
end $essais$;
