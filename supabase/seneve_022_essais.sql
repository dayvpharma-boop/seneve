-- Essais de seneve_022 (à exécuter APRÈS la migration, dans une transaction annulée).
-- Le bloc se termine volontairement par une erreur « RESULTATS ... » : tout est annulé, rien ne reste en base.
do $$
declare
  v_uid uuid := gen_random_uuid();
  v_p uuid;
  v_r jsonb;
  v_out text := '';
  pe1 uuid; pe2 uuid; pe3 uuid;
  e1 uuid; e2 uuid; e3 uuid; ed uuid;
  v_fin1 date;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
  i int;
  ok boolean;
  procedure_note text;
begin
  insert into auth.users (id, aud, role, email) values (v_uid, 'authenticated', 'authenticated', 'essai-022@exemple.invalid');
  insert into seneve.participants (auth_user_id, prenom, langue, fuseau) values (v_uid, 'Essai', 'fr', 'Africa/Kinshasa')
  returning participant_id into v_p;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- 1. Découverte seule : limite 5.
  insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat)
  values (v_p, 'PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', v_auj, v_auj + 6, 'active') returning enrollment_id into ed;
  v_r := seneve.coach_quota();
  v_out := v_out || format('T1 decouverte quota=%s attendu 5 => %s; ', v_r->>'quota', (v_r->>'quota')::int = 5);

  -- 2. Premier achat Formation 30 : parcours actif, limite 100.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-1', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe1;
  v_r := seneve._ouvrir_acces(pe1, v_p);
  e1 := (v_r->>'enrollment_id')::uuid;
  select date_fin_prevue into v_fin1 from seneve.enrollments where enrollment_id = e1;
  v_out := v_out || format('T2 achat1 etat=%s fin=%s => %s; ', v_r->>'etat_parcours', v_fin1, v_r->>'etat_parcours' = 'active' and v_fin1 = v_auj + 29);
  v_r := seneve.coach_quota();
  v_out := v_out || format('T2b quota=%s attendu 100 => %s; ', v_r->>'quota', (v_r->>'quota')::int = 100);

  -- 3. Deuxième achat : parcours planifié le lendemain de la fin du premier.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-2', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe2;
  v_r := seneve._ouvrir_acces(pe2, v_p);
  e2 := (v_r->>'enrollment_id')::uuid;
  select (etat = 'planifiee' and date_debut = v_fin1 + 1 and date_fin_prevue = v_fin1 + 30) into ok from seneve.enrollments where enrollment_id = e2;
  v_out := v_out || format('T3 achat2 etat=%s => %s; ', v_r->>'etat_parcours', ok);

  -- 3b. Le même paiement retraité : aucun doublon.
  v_r := seneve._ouvrir_acces(pe2, v_p);
  select count(*) = 3 into ok from seneve.enrollments where participant_id = v_p;
  v_out := v_out || format('T3b rejeu=%s 3 parcours => %s; ', v_r->>'resultat', ok);

  -- 4. Troisième achat : planifié après le deuxième.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-3', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe3;
  v_r := seneve._ouvrir_acces(pe3, v_p);
  e3 := (v_r->>'enrollment_id')::uuid;
  select (etat = 'planifiee' and date_debut = v_fin1 + 31) into ok from seneve.enrollments where enrollment_id = e3;
  v_out := v_out || format('T4 achat3 => %s; ', ok);

  -- 5. Limite du coach : 99 questions déjà posées, la 100e passe, la 101e est refusée.
  for i in 1..99 loop
    insert into seneve.coach_messages (client_message_id, participant_id, enrollment_id, role, texte, etat)
    values (gen_random_uuid(), v_p, e1, 'participant', 'q', 'repondu');
  end loop;
  v_r := seneve.coach_ask(gen_random_uuid(), e1, 'Question 100');
  v_out := v_out || format('T5 100e restants=%s => %s; ', v_r->>'restants', (v_r->>'restants')::int = 0);
  begin
    v_r := seneve.coach_ask(gen_random_uuid(), e1, 'Question 101');
    v_out := v_out || 'T5b 101e ACCEPTEE => false; ';
  exception when others then
    v_out := v_out || format('T5b 101e refus=%s => %s; ', sqlerrm, sqlerrm = 'QUOTA_ATTEINT');
  end;
  begin
    v_r := seneve.coach_ask(gen_random_uuid(), e2, 'Question parcours planifie');
    v_out := v_out || 'T5c parcours planifie ACCEPTE => false; ';
  exception when others then
    v_out := v_out || format('T5c parcours planifie refus => %s; ', sqlerrm like '%pas actif%');
  end;

  -- 6. Fin du premier parcours : clôture puis démarrage du deuxième (le troisième attend).
  update seneve.enrollments set date_debut = v_auj - 30, date_fin_prevue = v_auj - 1 where enrollment_id = e1;
  update seneve.enrollments set date_debut = v_auj, date_fin_prevue = v_auj + 29 where enrollment_id = e2;
  update seneve.enrollments set date_debut = v_auj + 30, date_fin_prevue = v_auj + 59 where enrollment_id = e3;
  v_r := seneve.close_finished_enrollments();
  select (select etat from seneve.enrollments where enrollment_id = e1) = 'terminee'
     and (select etat from seneve.enrollments where enrollment_id = e2) = 'active'
     and (select etat from seneve.enrollments where enrollment_id = e3) = 'planifiee' into ok;
  v_out := v_out || format('T6 cloture %s => %s; ', v_r, ok);
  v_r := seneve.close_finished_enrollments();
  v_out := v_out || format('T6b 2e passage demarres=%s => %s; ', v_r->>'demarres', (v_r->>'demarres')::int = 0);

  -- 7. Remboursement du 3e achat (planifié) : parcours planifié retiré, rien d'autre.
  v_r := seneve.revoke_purchase('ESSAI022-3', 'essai');
  select (select etat from seneve.enrollments where enrollment_id = e3) = 'annulee'
     and (select etat from seneve.enrollments where enrollment_id = e2) = 'active' into ok;
  v_out := v_out || format('T7 rembourse planifie %s => %s; ', v_r->>'resultat', ok);

  -- 8. Remboursement du 2e achat (en cours) : accès retiré, l'achat 1 déjà utilisé ne le reprend pas.
  v_r := seneve.revoke_purchase('ESSAI022-2', 'essai');
  select (select etat from seneve.enrollments where enrollment_id = e2) = 'annulee' into ok;
  v_out := v_out || format('T8 rembourse en cours %s => %s; ', v_r->>'resultat', ok);

  -- 9. Après remboursement, la limite revient à celle de la Découverte (5).
  v_r := seneve.coach_quota();
  v_out := v_out || format('T9 quota=%s attendu 5 => %s; ', v_r->>'quota', (v_r->>'quota')::int = 5);

  raise exception 'RESULTATS %', v_out;
end $$;
