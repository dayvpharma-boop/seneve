-- Essais de seneve_022 (après la migration, dans une transaction annulée).
-- Le bloc se termine volontairement par une erreur « RESULTATS ... » : tout est annulé, rien ne reste en base.
do $$
declare
  v_uid uuid := gen_random_uuid(); v_p uuid; v_r jsonb; v_out text := '';
  pe1 uuid; pe2 uuid; pe3 uuid; e1 uuid; e2 uuid; p2 uuid; p3 uuid; ed uuid; v_fin1 date;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date; i int; ok boolean;
begin
  insert into auth.users (id, aud, role, email) values (v_uid, 'authenticated', 'authenticated', 'essai-022@exemple.invalid');
  insert into seneve.participants (auth_user_id, prenom, langue, fuseau) values (v_uid, 'Essai', 'fr', 'Africa/Kinshasa') returning participant_id into v_p;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  -- T1 Découverte seule : limite 5.
  insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat)
  values (v_p, 'PROSPECT_LIVRE_7J_FR_V1', 1, 'fr', v_auj, v_auj + 6, 'active') returning enrollment_id into ed;
  v_r := seneve.coach_quota();
  v_out := v_out || format('T1 quota decouverte=%s => %s; ', v_r->>'quota', (v_r->>'quota')::int = 5);

  -- T2 Premier achat Formation 30 : parcours actif, limite 100.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-1', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe1;
  v_r := seneve._ouvrir_acces(pe1, v_p); e1 := (v_r->>'enrollment_id')::uuid;
  select date_fin_prevue into v_fin1 from seneve.enrollments where enrollment_id = e1 and etat = 'active';
  v_out := v_out || format('T2 achat1 actif fin=%s => %s; ', v_fin1, v_fin1 = v_auj + 29);
  v_r := seneve.coach_quota();
  v_out := v_out || format('T2b quota=%s => %s; ', v_r->>'quota', (v_r->>'quota')::int = 100);

  -- T3 Deuxième achat : planifié le lendemain de la fin du premier ; rejeu sans doublon.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-2', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe2;
  v_r := seneve._ouvrir_acces(pe2, v_p); p2 := (v_r->>'parcours_planifie')::uuid;
  select (date_debut = v_fin1 + 1 and etat = 'en_attente') into ok from seneve.parcours_planifies where planifie_id = p2;
  v_out := v_out || format('T3 achat2 planifie => %s; ', coalesce(ok, false) and v_r->>'enrollment_id' is null);
  v_r := seneve._ouvrir_acces(pe2, v_p);
  select (select count(*) from seneve.parcours_planifies where participant_id = v_p) = 1
     and (select count(*) from seneve.enrollments where participant_id = v_p) = 2 into ok;
  v_out := v_out || format('T3b rejeu=%s sans doublon => %s; ', v_r->>'resultat', ok);

  -- T4 Troisième achat : planifié après le deuxième.
  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee, offre_id, date_paiement)
  values ('chariow', 'ESSAI022-3', 'successful.sale', true, 'FORMATION_30J_FR', now()) returning payment_event_id into pe3;
  v_r := seneve._ouvrir_acces(pe3, v_p); p3 := (v_r->>'parcours_planifie')::uuid;
  select (date_debut = v_fin1 + 31) into ok from seneve.parcours_planifies where planifie_id = p3;
  v_out := v_out || format('T4 achat3 apres le 2e => %s; ', coalesce(ok, false));

  -- T5 Limite du coach : 99 questions déjà posées, la 100e passe, la 101e est refusée.
  for i in 1..99 loop
    insert into seneve.coach_messages (client_message_id, participant_id, enrollment_id, role, texte, etat)
    values (gen_random_uuid(), v_p, e1, 'participant', 'q', 'repondu');
  end loop;
  v_r := seneve.coach_ask(gen_random_uuid(), e1, 'Question 100');
  v_out := v_out || format('T5 100e restants=%s => %s; ', v_r->>'restants', (v_r->>'restants')::int = 0);
  begin
    v_r := seneve.coach_ask(gen_random_uuid(), e1, 'Question 101'); v_out := v_out || 'T5b 101e ACCEPTEE => false; ';
  exception when others then v_out := v_out || format('T5b 101e %s => %s; ', sqlerrm, sqlerrm = 'QUOTA_ATTEINT'); end;

  -- T6 Avant la date : rien ne démarre.
  v_r := seneve.close_finished_enrollments();
  v_out := v_out || format('T6 avant date demarres=%s => %s; ', v_r->>'demarres', (v_r->>'demarres')::int = 0);

  -- T7 Fin du premier : clôture, le 2e démarre, le 3e attend.
  update seneve.enrollments set date_debut = v_auj - 30, date_fin_prevue = v_auj - 1 where enrollment_id = e1;
  update seneve.parcours_planifies set date_debut = v_auj where planifie_id = p2;
  update seneve.parcours_planifies set date_debut = v_auj + 30 where planifie_id = p3;
  v_r := seneve.close_finished_enrollments();
  select enrollment_id into e2 from seneve.parcours_planifies where planifie_id = p2;
  select (select etat from seneve.enrollments where enrollment_id = e1) = 'terminee'
     and (select etat from seneve.enrollments where enrollment_id = e2) = 'active'
     and (select date_fin_prevue from seneve.enrollments where enrollment_id = e2) = v_auj + 29
     and (select etat from seneve.parcours_planifies where planifie_id = p3) = 'en_attente' into ok;
  v_out := v_out || format('T7 %s => %s; ', v_r, coalesce(ok, false));
  v_r := seneve.close_finished_enrollments();
  v_out := v_out || format('T7b 2e passage demarres=%s => %s; ', v_r->>'demarres', (v_r->>'demarres')::int = 0);

  -- T8 Remboursement du 3e (planifié) : retiré, le 2e continue.
  v_r := seneve.revoke_purchase('ESSAI022-3', 'essai');
  select (select etat from seneve.parcours_planifies where planifie_id = p3) = 'annule'
     and (select etat from seneve.enrollments where enrollment_id = e2) = 'active' into ok;
  v_out := v_out || format('T8 %s => %s; ', v_r->>'resultat', ok);

  -- T9 Remboursement du 2e (en cours) : accès retiré ; l'achat 1 déjà utilisé ne le reprend pas.
  v_r := seneve.revoke_purchase('ESSAI022-2', 'essai');
  select (select etat from seneve.enrollments where enrollment_id = e2) = 'annulee' into ok;
  v_out := v_out || format('T9 %s => %s; ', v_r->>'resultat', ok);

  -- T10 La limite revient à celle de la Découverte.
  v_r := seneve.coach_quota();
  v_out := v_out || format('T10 quota=%s => %s; ', v_r->>'quota', (v_r->>'quota')::int = 5);

  raise exception 'RESULTATS %', v_out;
end $$;
