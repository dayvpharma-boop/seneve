-- Vérification serveur sans vente réelle ni donnée conservée.
-- Exécuter ce fichier entier : tous les paiements et audits créés sont annulés.
begin;
do $test$
declare
  o seneve.offers%rowtype;
  r jsonb; pe uuid; idvente text := 'verification_corrections_' || gen_random_uuid()::text;
  email_test text := 'verification.' || gen_random_uuid()::text || '@example.invalid';
  nb_droits bigint; nb_inscriptions bigint;
begin
  select * into o from seneve.offers
    where actif and chariow_product_id is not null and prix > 0 and devise is not null order by offre_id limit 1;
  if not found then raise exception 'Aucune offre disponible pour vérifier les contrôles'; end if;
  select count(*) into nb_droits from seneve.entitlements;
  select count(*) into nb_inscriptions from seneve.enrollments;

  -- Montant incorrect et rejouement du même webhook.
  r := seneve.record_chariow_sale(idvente, 'successful.sale', 'completed', o.chariow_product_id, o.prix + 1, o.devise, email_test, now(), true);
  if r->>'resultat' <> 'a_examiner' or r->>'controle' <> 'montant_different' then raise exception 'Montant incorrect accepté : %', r; end if;
  pe := (r->>'payment_event_id')::uuid;
  r := seneve.record_chariow_sale(idvente, 'successful.sale', 'completed', o.chariow_product_id, o.prix + 1, o.devise, email_test, now(), true);
  if r->>'resultat' <> 'deja_recu' or r->>'statut' <> 'a_examiner' then raise exception 'Rejeu incorrect : %', r; end if;

  -- Même contrôle lors du rattachement différé, avant toute création de droit.
  r := seneve._ouvrir_acces(pe, gen_random_uuid());
  if r->>'resultat' <> 'a_examiner' then raise exception 'Rattachement anormal autorisé'; end if;

  r := seneve.record_chariow_sale(idvente || '_devise', 'successful.sale', 'completed', o.chariow_product_id, o.prix, case when o.devise = 'USD' then 'CDF' else 'USD' end, email_test, now(), true);
  if r->>'resultat' <> 'a_examiner' or r->>'controle' <> 'devise_differente' then raise exception 'Devise incorrecte acceptée'; end if;
  r := seneve.record_chariow_sale(idvente || '_vide', 'successful.sale', 'completed', o.chariow_product_id, null, o.devise, email_test, now(), true);
  if r->>'resultat' <> 'a_examiner' then raise exception 'Montant absent accepté'; end if;
  r := seneve.record_chariow_sale(idvente || '_offre', 'successful.sale', 'completed', 'inconnu_' || gen_random_uuid()::text, o.prix, o.devise, email_test, now(), true);
  if r->>'resultat' <> 'a_examiner' then raise exception 'Offre inconnue acceptée'; end if;
  r := seneve.record_chariow_sale(idvente || '_email', 'successful.sale', 'completed', o.chariow_product_id, o.prix, o.devise, '', now(), true);
  if r->>'resultat' <> 'a_examiner' then raise exception 'Email absent accepté'; end if;

  -- Contrôle positif : vente conforme, sans compte, correctement gardée en attente.
  r := seneve.record_chariow_sale(idvente || '_conforme', 'successful.sale', 'completed', o.chariow_product_id, o.prix, o.devise, email_test, now(), true);
  if r->>'resultat' <> 'en_attente_compte' or r->>'controle' <> 'ok' then raise exception 'Vente conforme bloquée : %', r; end if;

  -- Une signature invalide est toujours refusée.
  begin
    perform seneve.record_chariow_sale(idvente || '_signature', 'successful.sale', 'completed', o.chariow_product_id, o.prix, o.devise, email_test, now(), false);
    raise exception 'Signature invalide acceptée';
  exception when sqlstate '28000' then null;
  end;
  update seneve.payment_events set signature_verifiee = false, controle = 'ok' where payment_event_id = pe;
  r := seneve._ouvrir_acces(pe, gen_random_uuid());
  if r->>'resultat' <> 'a_examiner' then raise exception 'Rattachement sans signature autorisé'; end if;

  if (select count(*) from seneve.entitlements) <> nb_droits or (select count(*) from seneve.enrollments) <> nb_inscriptions then
    raise exception 'Un droit ou une inscription a été créé pendant les refus';
  end if;
end
$test$;
rollback;
select jsonb_build_object('verification', 'reussie', 'cas', 10, 'donnees_de_test_conservees', false) as resultat;

