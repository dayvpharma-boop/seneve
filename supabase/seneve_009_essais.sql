-- Adresse réelle de l'administrateur retirée du dépôt public le 15/10/2026 ; remplacer justin@exemple.invalid par l'adresse de connexion avant de rejouer ces essais.
-- SÉNEVÉ 009 — Essais de l'interface administrateur.
-- Ne laisse AUCUNE trace : tout ce que l'essai crée ou modifie est annulé à la fin, même en cas d'erreur.
-- Résultat attendu : un tableau où la colonne « ok » vaut true sur chaque ligne.
do $essais$
declare
  res jsonb := '[]';
  a_uid constant text := (select id::text from auth.users where lower(email) = 'justin@exemple.invalid');
  b_uid constant text := '00000000-0000-4000-8000-0000000000b2';
  a_claims text;
  b_claims text;
  req uuid;
  v timestamptz;
  j jsonb;
  n int;
  ok boolean;
begin
  a_claims := json_build_object('sub', a_uid, 'role', 'authenticated')::text;
  b_claims := json_build_object('sub', b_uid, 'role', 'authenticated')::text;

  begin
    -- Compte fictif B (participant ordinaire au départ)
    insert into auth.users (id, instance_id, aud, role, email)
    values (b_uid::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'essai-b@exemple.invalid');
    insert into seneve.participants (participant_id, auth_user_id, prenom)
    values ('00000000-0000-4000-8000-0000000000b1', b_uid::uuid, 'B');

    -- ===== A (Dr Justin) crée une demande d'essai comme participant =====
    set local role authenticated;
    perform set_config('request.jwt.claims', a_claims, true);
    insert into seneve.journal_entries (entry_id, participant_id, texte)
    values ('00000000-0000-4000-8000-00000000a009', seneve.current_participant_id(), 'Note privée d''essai 009');
    req := (seneve.request_help('00000000-0000-4000-8000-00000000c009', 'Demande d''essai 009', null, '{}')->>'request_id')::uuid;

    -- ===== A comme administrateur =====
    j := seneve.staff_me();
    res := res || jsonb_build_object('essai', '01 Dr Justin est administrateur', 'ok', (j->>'admin')::boolean);
    select count(*), max(modifie_le) into n, v from seneve.staff_list_help_requests() x where x.request_id = req;
    res := res || jsonb_build_object('essai', '02 l''administrateur voit la nouvelle demande', 'ok', n = 1);

    j := seneve.staff_update_help_request(req, v, 'en_cours', 'Première réponse de l''équipe', null);
    res := res || jsonb_build_object('essai', '03 l''administrateur passe la demande en cours avec une réponse', 'ok', j->>'etat' = 'en_cours');

    begin
      perform seneve.staff_update_help_request(req, v, 'resolue', 'Écrasement', null);
      res := res || jsonb_build_object('essai', '04 une version périmée n''écrase pas une modification récente', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '04 une version périmée n''écrase pas une modification récente', 'ok', sqlstate = '40001');
    end;

    select count(*) into n from seneve.help_requests where request_id = req and reponse = 'Première réponse de l''équipe';
    res := res || jsonb_build_object('essai', '05 le participant voit la réponse dans son espace', 'ok', n = 1);

    -- ===== B, simple participant =====
    perform set_config('request.jwt.claims', b_claims, true);
    j := seneve.staff_me();
    res := res || jsonb_build_object('essai', '06 un participant n''a aucun rôle d''équipe', 'ok', jsonb_array_length(j->'roles') = 0 and not (j->>'admin')::boolean);
    begin
      perform * from seneve.staff_list_help_requests();
      res := res || jsonb_build_object('essai', '07 un participant ne peut pas lister les demandes', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '07 un participant ne peut pas lister les demandes', 'ok', sqlstate = '42501');
    end;
    begin
      perform seneve.staff_update_help_request(req, now(), 'resolue', 'x', null);
      res := res || jsonb_build_object('essai', '08 un participant ne peut pas traiter une demande', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '08 un participant ne peut pas traiter une demande', 'ok', sqlstate = '42501');
    end;
    begin
      perform seneve.staff_set_role('essai-b@exemple.invalid', 'administrateur', true);
      res := res || jsonb_build_object('essai', '09 un participant ne peut pas se donner un rôle', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '09 un participant ne peut pas se donner un rôle', 'ok', sqlstate = '42501');
    end;

    -- ===== A fait de B un accompagnateur =====
    perform set_config('request.jwt.claims', a_claims, true);
    perform seneve.staff_set_role('essai-b@exemple.invalid', 'accompagnateur', true);
    select count(*) into n from seneve.staff_list_team() t where t.email = 'essai-b@exemple.invalid' and 'accompagnateur' = any (t.roles);
    res := res || jsonb_build_object('essai', '10 l''administrateur ajoute un accompagnateur', 'ok', n = 1);

    perform set_config('request.jwt.claims', b_claims, true);
    select count(*) into n from seneve.staff_list_help_requests();
    res := res || jsonb_build_object('essai', '11 l''accompagnateur ne voit pas une demande non confiée', 'ok', n = 0);

    perform set_config('request.jwt.claims', a_claims, true);
    select max(modifie_le) into v from seneve.staff_list_help_requests() x where x.request_id = req;
    j := seneve.staff_update_help_request(req, v, 'en_cours', 'Première réponse de l''équipe', b_uid::uuid);
    res := res || jsonb_build_object('essai', '12 l''administrateur confie la demande à l''accompagnateur', 'ok', j->'changements' ? 'affectation');

    perform set_config('request.jwt.claims', b_claims, true);
    select count(*), max(modifie_le) into n, v from seneve.staff_list_help_requests() x where x.request_id = req;
    res := res || jsonb_build_object('essai', '13 l''accompagnateur voit la demande confiée', 'ok', n = 1);
    j := seneve.staff_update_help_request(req, v, 'attente_participant', 'Peux-tu préciser ?', a_uid::uuid);
    select affecte_a::text = b_uid into ok from seneve.help_requests where request_id = req;
    res := res || jsonb_build_object('essai', '14 l''accompagnateur répond mais ne peut pas réaffecter', 'ok', j->>'etat' = 'attente_participant' and ok);
    select count(*) into n from seneve.journal_entries;
    res := res || jsonb_build_object('essai', '15 l''accompagnateur n''a aucun accès au journal', 'ok', n = 0);
    begin
      perform * from seneve.staff_list_team();
      res := res || jsonb_build_object('essai', '16 l''accompagnateur ne gère pas l''équipe', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '16 l''accompagnateur ne gère pas l''équipe', 'ok', sqlstate = '42501');
    end;

    -- ===== Garde-fous sur les rôles =====
    perform set_config('request.jwt.claims', a_claims, true);
    begin
      perform seneve.staff_set_role('essai-b@exemple.invalid', 'accompagnateur', false);
      res := res || jsonb_build_object('essai', '17 retrait refusé tant que des demandes sont en cours', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '17 retrait refusé tant que des demandes sont en cours', 'ok', sqlstate = 'P0001');
    end;
    begin
      perform seneve.staff_set_role('justin@exemple.invalid', 'administrateur', false);
      res := res || jsonb_build_object('essai', '18 le dernier administrateur ne peut pas être retiré', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '18 le dernier administrateur ne peut pas être retiré', 'ok', sqlstate = 'P0001');
    end;
    begin
      perform seneve.staff_set_role('inconnu@exemple.invalid', 'accompagnateur', true);
      res := res || jsonb_build_object('essai', '19 un e-mail sans compte est refusé', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '19 un e-mail sans compte est refusé', 'ok', sqlstate = 'P0002');
    end;

    -- ===== Demande annulée par le participant : plus modifiable =====
    perform seneve.cancel_help_request(req);
    select max(modifie_le) into v from seneve.staff_list_help_requests() x where x.request_id = req;
    begin
      perform seneve.staff_update_help_request(req, v, 'resolue', 'x', null);
      res := res || jsonb_build_object('essai', '20 une demande annulée ne se traite plus', 'ok', false);
    exception when others then
      res := res || jsonb_build_object('essai', '20 une demande annulée ne se traite plus', 'ok', sqlstate = 'P0001');
    end;
    reset role;

    select count(*) into n from seneve.audit_events
     where objet = 'help_request:' || req::text and action = 'demande_aide_traitee';
    res := res || jsonb_build_object('essai', '21 chaque traitement est tracé', 'ok', n = 3);
    select count(*) into n from seneve.audit_events
     where action = 'demande_aide_traitee' and objet = 'help_request:' || req::text and details::text like '%Première réponse%';
    res := res || jsonb_build_object('essai', '22 les traces ne recopient pas les messages', 'ok', n = 0);

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
