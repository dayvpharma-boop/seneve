-- Annonces programmées et affiche à l'ouverture (seneve_054) : données fictives, tout est annulé à la fin.
begin;
do $test$
declare
  admin uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); r jsonb; a jsonb; n jsonb; ann_fr uuid; ann_en uuid; futur uuid;
begin
  select auth_user_id into admin from seneve.staff_roles where role = 'administrateur' limit 1;
  if admin is null then raise exception 'Administrateur absent pour la vérification'; end if;
  if has_function_privilege('anon','seneve.mon_affiche(text)','EXECUTE')
     or has_function_privilege('anon','seneve.affiche_marquer(uuid,text)','EXECUTE')
     or has_function_privilege('anon','seneve.staff_annonce_programmer(uuid,text,text,text,text,text,text,text,boolean,timestamptz,timestamptz,boolean,text,text,uuid)','EXECUTE')
     or has_function_privilege('authenticated','seneve._annonce_planifier(uuid)','EXECUTE')
     or has_table_privilege('authenticated','seneve.annonce_affichages','SELECT') then
    raise exception 'Permissions trop larges';
  end if;

  insert into auth.users(id) values (ua), (ub);
  insert into seneve.participants(participant_id, auth_user_id, prenom, langue) values (pa, ua, 'Fictif A', 'fr'), (pb, ub, 'Fictif B', 'en');

  -- Un participant ne programme pas.
  perform set_config('request.jwt.claim.sub', ua::text, true);
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous'); raise exception 'Participant autorisé';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', admin::text, true);
  -- Contrôles de saisie.
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous', p_sonner := false, p_bouton_texte := 'Go'); raise exception 'Bouton sans lien accepté';
  exception when sqlstate '22023' then null; end;
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous', p_sonner := false, p_bouton_texte := 'Go', p_bouton_lien := 'javascript:alert(1)'); raise exception 'Lien dangereux accepté';
  exception when sqlstate '22023' then null; end;
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous', p_sonner := false, p_bouton_texte := 'Go', p_bouton_lien := '//exemple.com'); raise exception 'Lien externe déguisé accepté';
  exception when sqlstate '22023' then null; end;
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous', p_sonner := false, p_debut := now() + interval '2 days', p_fin := now() + interval '1 day'); raise exception 'Fin avant début acceptée';
  exception when sqlstate '22023' then null; end;
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'T', 'X', 'fr', 'tous', p_sonner := false, p_debut := now() - interval '2 days'); raise exception 'Début passé accepté';
  exception when sqlstate '22023' then null; end;

  -- Annonce en deux langues (même groupe), affiche à l'ouverture, bouton vers la Bible, fin dans 7 jours.
  r := seneve.staff_annonce_programmer(gen_random_uuid(), 'Défi fictif', 'Texte fictif', 'fr', 'tous', p_sonner := false,
         p_fin := now() + interval '7 days', p_affiche := true, p_bouton_texte := 'Je participe', p_bouton_lien := '/bible', p_groupe_id := g);
  ann_fr := (r->>'annonce_id')::uuid;
  r := seneve.staff_annonce_programmer(gen_random_uuid(), 'Fictional challenge', 'Fictional text', 'en', 'tous', p_sonner := false,
         p_fin := now() + interval '7 days', p_affiche := true, p_bouton_texte := 'Join', p_bouton_lien := '/bible?lang=en', p_groupe_id := g);
  ann_en := (r->>'annonce_id')::uuid;
  begin perform seneve.staff_annonce_programmer(gen_random_uuid(), 'Doublon', 'X', 'fr', 'tous', p_sonner := false, p_groupe_id := g); raise exception 'Deux annonces françaises dans un groupe';
  exception when sqlstate '23505' then null; end;
  -- Annonce programmée dans le futur : ni cloche, ni affiche avant son début.
  r := seneve.staff_annonce_programmer(gen_random_uuid(), 'Plus tard', 'Texte futur', 'fr', 'tous', p_sonner := false,
         p_debut := now() + interval '3 days', p_affiche := true);
  futur := (r->>'annonce_id')::uuid;

  -- A (français) voit l'affiche française ; B (anglais) l'anglaise.
  perform set_config('request.jwt.claim.sub', ua::text, true);
  a := seneve.mon_affiche('fr');
  if a is null or (a->>'id')::uuid <> ann_fr or a->>'bouton_lien' <> '/bible' then raise exception 'Affiche A incorrecte : %', a; end if;
  n := seneve.mes_notifications(50);
  if exists (select 1 from jsonb_array_elements(n->'elements') e where e->>'id' = futur::text) then raise exception 'Annonce future visible dans la cloche'; end if;
  if not exists (select 1 from jsonb_array_elements(n->'elements') e where e->>'id' = ann_fr::text and e->>'bouton_texte' = 'Je participe') then raise exception 'Annonce absente de la cloche'; end if;
  -- Vue puis fermée : elle ne revient plus.
  perform seneve.affiche_marquer(ann_fr, 'vue');
  perform seneve.affiche_marquer(ann_fr, 'fermee');
  perform seneve.affiche_marquer(ann_fr, 'vue');
  if (select action from seneve.annonce_affichages where annonce_id = ann_fr and participant_id = pa) <> 'fermee' then raise exception 'Action écrasée par « vue »'; end if;
  if seneve.mon_affiche('fr') is not null then raise exception 'Affiche revenue après fermeture'; end if;
  if seneve.mon_affiche('en') is not null then raise exception 'Autre langue du même groupe proposée'; end if;
  begin perform seneve.affiche_marquer(ann_fr, 'supprimer'); raise exception 'Action inconnue acceptée';
  exception when sqlstate '22023' then null; end;

  perform set_config('request.jwt.claim.sub', ub::text, true);
  a := seneve.mon_affiche('en');
  if a is null or (a->>'id')::uuid <> ann_en then raise exception 'Affiche B incorrecte : %', a; end if;
  -- Déjà lue dans la cloche : l'affiche ne revient pas.
  perform seneve.marquer_notifications_vues();
  if seneve.mon_affiche('en') is not null then raise exception 'Affiche montrée après lecture dans la cloche'; end if;

  -- Fin atteinte : disparaît de la cloche.
  update seneve.annonces set publie_le = now() - interval '2 days', fin_le = now() - interval '1 minute' where annonce_id = ann_en;
  n := seneve.mes_notifications(50);
  if exists (select 1 from jsonb_array_elements(n->'elements') e where e->>'id' = ann_en::text) then raise exception 'Annonce terminée encore dans la cloche'; end if;

  -- Bilan de l'administration.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  r := (select x from jsonb_array_elements(seneve.staff_annonces()) x where x->>'annonce_id' = ann_fr::text);
  if (r#>>'{affichages,vues}')::int <> 1 or (r#>>'{affichages,fermees}')::int <> 1 then raise exception 'Bilan des affiches faux : %', r->'affichages'; end if;

  -- L'ancienne publication immédiate fonctionne toujours.
  r := seneve.staff_annonce_publier(gen_random_uuid(), 'Ancienne', 'Toujours là', 'fr', 'tous', p_sonner := false);
  if (r->>'affiche')::boolean then raise exception 'Ancienne publication avec affiche'; end if;

  -- Envoi programmé : créneau au début de l'annonce, pas avant.
  if seneve._annonce_creneau_a(pa, timestamptz '2026-11-05 10:00+01') <> timestamptz '2026-11-05 10:00+01' then raise exception 'Créneau de jour faux'; end if;
  if seneve._annonce_creneau_a(pa, timestamptz '2026-11-05 22:00+01') <> timestamptz '2026-11-06 07:00+01' then raise exception 'Créneau de nuit faux'; end if;

  raise notice 'annonces_affiche : tout est conforme';
end $test$;
rollback;
