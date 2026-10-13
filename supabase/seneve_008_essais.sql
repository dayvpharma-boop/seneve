-- SÉNEVÉ 008 — Essais de sécurité du journal et de la demande d'aide.
-- Ne laisse AUCUNE trace : tout ce que l'essai crée est annulé à la fin, même en cas d'erreur.
-- Résultat attendu : un tableau où la colonne « ok » vaut true sur chaque ligne.
do $essais$
declare
  res jsonb := '[]';
  a_uid constant text := (select auth_user_id::text from seneve.participants order by cree_le limit 1);
  a_enr uuid;
  a_act uuid;
  autre_act uuid;
  n int;
  t text;
  ok boolean;
begin
  select e.enrollment_id into a_enr from seneve.enrollments e join seneve.participants p using (participant_id)
   where p.auth_user_id::text = a_uid order by e.cree_le limit 1;
  select a.activity_id into a_act from seneve.activities a join seneve.contents c using (content_id)
   join seneve.enrollments e on e.programme_id = c.programme_id and e.version = c.version
   where e.enrollment_id = a_enr limit 1;
  select a.activity_id into autre_act from seneve.activities a join seneve.contents c using (content_id)
   join seneve.enrollments e on e.enrollment_id = a_enr
   where c.programme_id <> e.programme_id limit 1;

  begin
    -- Participant fictif B
    insert into auth.users (id, instance_id, aud, role, email)
    values ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'essai-b@exemple.invalid');
    insert into seneve.participants (participant_id, auth_user_id, prenom)
    values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000b2', 'B');

    -- ===== Participant A =====
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', a_uid, 'role', 'authenticated')::text, true);

    insert into seneve.journal_entries (entry_id, participant_id, enrollment_id, activity_id, texte)
    values ('00000000-0000-4000-8000-00000000a001', seneve.current_participant_id(), a_enr, a_act, 'Ma note sur le jour 1');
    select count(*) into n from seneve.journal_entries where entry_id = '00000000-0000-4000-8000-00000000a001';
    res := res || jsonb_build_object('essai', '01 A écrit une note liée à son activité', 'ok', n = 1);

    begin
      insert into seneve.journal_entries (participant_id, enrollment_id, activity_id, texte)
      values (seneve.current_participant_id(), a_enr, autre_act, 'x');
      res := res || jsonb_build_object('essai', '02 note liée à une activité d''un autre parcours refusée', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '02 note liée à une activité d''un autre parcours refusée', 'ok', sqlstate = '42501');
    end;

    begin
      insert into seneve.journal_entries (participant_id, texte) values (seneve.current_participant_id(), '   ');
      res := res || jsonb_build_object('essai', '03 note vide refusée', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '03 note vide refusée', 'ok', true);
    end;

    begin
      insert into seneve.journal_entries (participant_id, texte) values ('00000000-0000-4000-8000-0000000000b1', 'usurpation');
      res := res || jsonb_build_object('essai', '04 A ne peut pas écrire dans le journal de B', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '04 A ne peut pas écrire dans le journal de B', 'ok', true);
    end;

    begin
      insert into seneve.help_requests (participant_id, motif) values (seneve.current_participant_id(), 'direct');
      res := res || jsonb_build_object('essai', '05 demande créée sans passer par la fonction refusée', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '05 demande créée sans passer par la fonction refusée', 'ok', true);
    end;

    select usage_ia_autorise into ok from seneve.journal_entries where entry_id = '00000000-0000-4000-8000-00000000a001';
    res := res || jsonb_build_object('essai', '06 coach IA sans accès par défaut', 'ok', ok = false);
    update seneve.journal_entries set usage_ia_autorise = true where entry_id = '00000000-0000-4000-8000-00000000a001';
    select usage_ia_autorise into ok from seneve.journal_entries where entry_id = '00000000-0000-4000-8000-00000000a001';
    res := res || jsonb_build_object('essai', '07 A autorise le coach IA sur sa note', 'ok', ok);

    perform seneve.request_help('00000000-0000-4000-8000-00000000c001', 'J''ai du mal avec l''action du jour 1', a_enr, array['00000000-0000-4000-8000-00000000a001']::uuid[]);
    perform seneve.request_help('00000000-0000-4000-8000-00000000c001', 'J''ai du mal avec l''action du jour 1', a_enr, array['00000000-0000-4000-8000-00000000a001']::uuid[]);
    select count(*), max(extraits_partages) into n, t from seneve.help_requests where client_request_id = '00000000-0000-4000-8000-00000000c001';
    res := res || jsonb_build_object('essai', '08 envoi répété : une seule demande', 'ok', n = 1);
    res := res || jsonb_build_object('essai', '09 seule la note choisie est jointe', 'ok', t like '%— Ma note sur le jour 1');
    reset role;
    select count(*) into n from seneve.jobs j join seneve.help_requests h on h.request_id = (j.charge->>'request_id')::uuid
     where j.type = 'aide_demandee' and j.etat = 'en_attente' and h.client_request_id = '00000000-0000-4000-8000-00000000c001';
    res := res || jsonb_build_object('essai', '10 une seule alerte préparée pour l''équipe', 'ok', n = 1);

    -- ===== Participant B =====
    set local role authenticated;
    perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
    select count(*) into n from seneve.journal_entries;
    res := res || jsonb_build_object('essai', '11 B ne voit pas le journal de A', 'ok', n = 0);
    select count(*) into n from seneve.help_requests;
    res := res || jsonb_build_object('essai', '12 B ne voit pas les demandes de A', 'ok', n = 0);

    begin
      perform seneve.request_help(gen_random_uuid(), 'vol', null, array['00000000-0000-4000-8000-00000000a001']::uuid[]);
      res := res || jsonb_build_object('essai', '13 B ne peut pas joindre une note de A', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '13 B ne peut pas joindre une note de A', 'ok', sqlstate = '42501');
    end;
    begin
      perform seneve.request_help('00000000-0000-4000-8000-00000000c001', 'rejouer', null, '{}');
      res := res || jsonb_build_object('essai', '14 B ne peut pas réutiliser une demande de A', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '14 B ne peut pas réutiliser une demande de A', 'ok', sqlstate = '23505');
    end;
    begin
      reset role;
      select request_id::text into t from seneve.help_requests where client_request_id = '00000000-0000-4000-8000-00000000c001';
      set local role authenticated;
      perform seneve.cancel_help_request(t::uuid);
      res := res || jsonb_build_object('essai', '15 B ne peut pas annuler une demande de A', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '15 B ne peut pas annuler une demande de A', 'ok', sqlstate = '42501');
    end;
    begin
      perform * from seneve.claim_help_alerts(5);
      res := res || jsonb_build_object('essai', '16 un participant ne peut pas lire les alertes', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '16 un participant ne peut pas lire les alertes', 'ok', sqlstate = '42501');
    end;
    reset role;

    -- ===== n8n (clé de service) =====
    set local role service_role;
    select count(*), bool_and(email is not null) into n, ok from seneve.claim_help_alerts(10) x where x.motif like 'J''ai du mal%';
    res := res || jsonb_build_object('essai', '17 n8n reçoit la demande avec un moyen de contact', 'ok', n = 1 and ok);
    select count(*) into n from seneve.claim_help_alerts(10);
    res := res || jsonb_build_object('essai', '18 la même alerte n''est pas envoyée deux fois', 'ok', n = 0);
    reset role;
    select j.job_id::text into t from seneve.jobs j join seneve.help_requests h on h.request_id = (j.charge->>'request_id')::uuid
     where h.client_request_id = '00000000-0000-4000-8000-00000000c001';
    set local role service_role;
    perform seneve.finish_help_alert(t::uuid, false, 'essai de panne');
    reset role;
    select (etat = 'en_attente' and echeance > now()) into ok from seneve.jobs where job_id = t::uuid;
    res := res || jsonb_build_object('essai', '19 envoi raté : nouvel essai prévu', 'ok', ok);

    -- ===== A annule et supprime =====
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub', a_uid, 'role', 'authenticated')::text, true);
    select (seneve.cancel_help_request(request_id)->>'etat') = 'annulee' into ok from seneve.help_requests where client_request_id = '00000000-0000-4000-8000-00000000c001';
    res := res || jsonb_build_object('essai', '20 A annule sa demande', 'ok', ok);
    delete from seneve.journal_entries where entry_id = '00000000-0000-4000-8000-00000000a001';
    select count(*) into n from seneve.journal_entries where entry_id = '00000000-0000-4000-8000-00000000a001';
    res := res || jsonb_build_object('essai', '21 A supprime sa note', 'ok', n = 0);
    reset role;
    select (etat = 'annulee') into ok from seneve.jobs where job_id = t::uuid;
    res := res || jsonb_build_object('essai', '22 l''alerte en attente est annulée avec la demande', 'ok', ok);

    -- Tout annuler : rien de cet essai ne reste dans la base.
    raise exception 'ANNULATION_DES_ESSAIS';
  exception when others then
    if sqlerrm <> 'ANNULATION_DES_ESSAIS' then
      res := res || jsonb_build_object('essai', 'ERREUR INATTENDUE', 'ok', false, 'detail', sqlerrm);
    end if;
  end;
  reset role;
  perform set_config('seneve.resultats_essais', res::text, false);
end $essais$;

select x->>'essai' as essai, (x->>'ok')::boolean as ok, x->>'detail' as detail
  from jsonb_array_elements(current_setting('seneve.resultats_essais')::jsonb) x
 order by 1;
