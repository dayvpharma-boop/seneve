-- seneve-test seulement ; fixtures fictives et toutes les écritures annulées.
begin;
set local statement_timeout = '15s';
do $test$
declare
  u uuid := gen_random_uuid();
  p uuid := gen_random_uuid();
  cle text := 'BGsX0fLhLEJH-Lzm5WOkQPJ3A32BLeszoPShOUXYmMKWT-NC4v4af5uO5-tKfA-eFivOM1drMV7Oy7ZAaDe_UfU';
  secret text := 'AAAAAAAAAAAAAAAAAAAAAA';
  url text;
  n integer;
  reponse jsonb;
begin
  foreach url in array array[
    'https://web.push.apple.com/fictif',
    'https://fcm.googleapis.com/fcm/send/fictif:jeton',
    'https://updates.push.services.mozilla.com/wpush/v2/fictif',
    'https://updates.push.services.mozilla.com/wpush/v1/fictif=='
  ] loop
    assert seneve_private.push_abonnement_valide(url,cle,secret), 'Fournisseur valide refusé';
  end loop;
  foreach url in array array[
    'https://audit.invalid/non-push-destination', 'https://127.0.0.1/a', 'https://[::1]/a',
    'https://169.254.169.254/a', 'https://localhost/a', 'http://web.push.apple.com/fictif',
    'https://web.push.apple.com.evil.invalid/fictif', 'https://evilweb.push.apple.com/fictif',
    'https://user:secret@web.push.apple.com/fictif', 'https://web.push.apple.com:443/fictif',
    'https://web.push.apple.com:8443/fictif', 'https://web.push.apple.com./fictif',
    'https://web.push.apple.com/fictif?redirect=https://localhost', 'https://web.push.apple.com/fictif#secret',
    'https://web.push.apple.com/../fictif', 'https://web.push.apple.com/%2e%2e/fictif',
    'https://fcm.googleapis.com/other/fictif', 'https://web.push.apple.com/',
    E'https://web.push.apple.com/fictif\n', E'https://web.push.apple.com\\@localhost/fictif'
  ] loop
    assert not seneve_private.push_abonnement_valide(url,cle,secret), 'Destination abusive acceptée';
  end loop;
  assert not seneve_private.push_abonnement_valide('https://web.push.apple.com/fictif','FICTIF',secret), 'Clé tronquée acceptée';
  assert not seneve_private.push_abonnement_valide('https://web.push.apple.com/fictif','A'||substr(cle,2),secret), 'Point compressé/invalide accepté';
  assert not seneve_private.push_abonnement_valide('https://web.push.apple.com/fictif',cle,'AAAAAAAAAAAAAAAAAAAAAB'), 'Base64 non canonique accepté';
  assert not seneve_private.push_abonnement_valide(null,cle,secret), 'Endpoint nul accepté';
  assert not has_function_privilege('anon','seneve.rappels_activer(text,text,text,jsonb,text)','execute'), 'RPC publique';
  assert not has_function_privilege('authenticated','seneve_private.push_abonnement_valide(text,text,text)','execute'), 'Helper exposé';
  assert has_function_privilege('service_role','seneve_private.push_abonnement_valide(text,text,text)','execute'), 'Helper service absent';

  insert into auth.users(id,raw_user_meta_data) values(u,'{}');
  insert into seneve.participants(participant_id,auth_user_id,prenom) values(p,u,'SECURITE_FICTIF_20261122');
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  reponse := seneve.rappels_activer('https://web.push.apple.com/securite-fictif-20261122',cle,secret,'{"matin":"07:30","midi":null,"soir":null}','Africa/Kinshasa');
  assert (reponse->>'cet_appareil')::boolean, 'RPC légitime refusée';
  -- Reproduire exactement le défaut F01 : destination HTTPS arbitraire.
  begin
    perform seneve.rappels_activer('https://audit.invalid/non-push-destination',cle,secret,'{"matin":"07:30"}','Africa/Kinshasa');
    raise exception 'F01 toujours exploitable';
  exception when check_violation then null;
  end;
  execute 'reset role';
  select count(*) into n from seneve.push_appareils where participant_id=p;
  assert n=1, 'Une écriture refusée a laissé un appareil';
  select count(*) into n from seneve.consents where participant_id=p;
  assert n=1, 'Une écriture refusée a modifié les consentements';
  -- La contrainte protège aussi les écritures directes et les mises à jour.
  execute 'set local role service_role';
  begin
    update seneve.push_appareils set endpoint='https://localhost/securite' where participant_id=p;
    raise exception 'Mise à jour abusive acceptée';
  exception when check_violation then null;
  end;
  execute 'reset role';
  assert exists(select 1 from seneve.push_appareils where participant_id=p and endpoint='https://web.push.apple.com/securite-fictif-20261122'), 'Appareil valide altéré';
end $test$;
rollback;
select '37 contrôles SQL réussis ; fixtures annulées ; aucun envoi' as resultat;
