-- Centre de notifications (seneve_049) : données fictives, tout est annulé à la fin.
begin;
do $test$
declare
  admin uuid; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid();
  pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  prog text; ea uuid := gen_random_uuid(); req uuid := gen_random_uuid(); reqb uuid := gen_random_uuid();
  cid uuid := gen_random_uuid(); cid2 uuid := gen_random_uuid(); r jsonb; n jsonb; ann uuid;
begin
  select auth_user_id into admin from seneve.staff_roles where role = 'administrateur' limit 1;
  if admin is null then raise exception 'Administrateur absent pour la vérification'; end if;
  select c.programme_id into prog from seneve.contents c join seneve.programmes p using (programme_id) limit 1;
  if has_function_privilege('anon','seneve.mes_notifications(integer)','EXECUTE')
     or has_function_privilege('anon','seneve.staff_annonce_publier(uuid,text,text,text,text,text,text,text)','EXECUTE')
     or has_table_privilege('authenticated','seneve.annonces','SELECT')
     or has_table_privilege('authenticated','seneve.notifications_vues','SELECT') then
    raise exception 'Permissions trop larges';
  end if;

  insert into auth.users(id) values (ua), (ub);
  insert into seneve.participants(participant_id, auth_user_id, prenom, langue) values (pa, ua, 'Fictif A', 'fr'), (pb, ub, 'Fictif B', 'en');
  insert into seneve.enrollments(enrollment_id, participant_id, programme_id, version, langue, date_debut, etat)
    select ea, pa, prog, (select min(version) from seneve.contents where programme_id = prog), 'fr', current_date, 'active';
  insert into seneve.help_requests(request_id, client_request_id, participant_id, motif) values (req, gen_random_uuid(), pa, 'Question fictive'), (reqb, gen_random_uuid(), pb, 'Other question');
  insert into seneve.help_messages(request_id, auteur, texte, client_message_id) values
    (req, 'participant', 'MESSAGE_DU_PARTICIPANT', gen_random_uuid()),
    (req, 'equipe', 'Réponse fictive de l’équipe', gen_random_uuid()),
    (reqb, 'equipe', 'REPONSE_POUR_B', gen_random_uuid());

  -- Un participant ne publie pas.
  perform set_config('request.jwt.claim.sub', ua::text, true);
  begin perform seneve.staff_annonce_publier(gen_random_uuid(), 'T', 'X', 'fr', 'tous'); raise exception 'Participant autorisé à publier';
  exception when insufficient_privilege then null; end;

  -- L'administration publie une annonce à tous (fr) et une annonce à un parcours.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  r := seneve.staff_annonce_publier(cid, 'Annonce à tous', 'Texte pour tous', 'fr', 'tous');
  ann := (r->>'annonce_id')::uuid;
  if (seneve.staff_annonce_publier(cid, 'Annonce à tous', 'Texte pour tous', 'fr', 'tous')->>'repetition')::boolean is not true then raise exception 'Répétition non reconnue'; end if;
  begin perform seneve.staff_annonce_publier(cid, 'Autre titre', 'Texte pour tous', 'fr', 'tous'); raise exception 'Identifiant réutilisé accepté';
  exception when unique_violation then null; end;
  perform seneve.staff_annonce_publier(cid2, 'Annonce parcours', 'Pour un parcours', 'fr', 'programme', prog);
  begin perform seneve.staff_annonce_publier(gen_random_uuid(), 'X', 'Y', 'fr', 'programme', 'PARCOURS_INEXISTANT'); raise exception 'Parcours inconnu accepté';
  exception when invalid_parameter_value then null; end;

  -- Participant A (fr, inscrit au parcours) : 2 annonces + 1 réponse de l'équipe, jamais son propre message.
  perform set_config('request.jwt.claim.sub', ua::text, true);
  n := seneve.mes_notifications(50);
  if (n->>'non_lues')::int <> 3 then raise exception 'Non-lus attendus 3, obtenus %', n->>'non_lues'; end if;
  if (select count(*) from jsonb_array_elements(n->'elements') e where e->>'type' = 'annonce') <> 2 then raise exception 'Annonces de A incorrectes'; end if;
  if position('MESSAGE_DU_PARTICIPANT' in n::text) > 0 or position('REPONSE_POUR_B' in n::text) > 0 then raise exception 'Message d’un autre fil exposé'; end if;
  perform seneve.marquer_notifications_vues();
  if (seneve.mes_notifications(50)->>'non_lues')::int <> 0 then raise exception 'Vu non pris en compte'; end if;

  -- Participant B (en, non inscrit) : aucune annonce française, seulement sa réponse.
  perform set_config('request.jwt.claim.sub', ub::text, true);
  n := seneve.mes_notifications(50);
  if position('Annonce' in n::text) > 0 then raise exception 'Annonce hors langue ou hors parcours exposée'; end if;
  if (n->>'non_lues')::int <> 1 then raise exception 'Réponse de B non comptée'; end if;

  -- Retrait : l'annonce disparaît.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  perform seneve.staff_annonce_retirer(ann);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  if exists (select 1 from jsonb_array_elements(seneve.mes_notifications(50)->'elements') e where e->>'id' = ann::text) then raise exception 'Annonce retirée encore visible'; end if;

  -- Sans session : refus.
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform seneve.mes_notifications(10); raise exception 'Session absente acceptée';
  exception when invalid_authorization_specification then null; end;
  raise notice 'Centre de notifications : vérifications réussies';
end $test$;

-- seneve_050 : les rappels reçus comptent dans la pastille (signalé par Dr Justin le 29/10/2026).
-- Rappels des moments (mêmes règles que les rappels d'habitudes, sans les contrôles de jour HD).
do $test$
declare
  ua uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); ea uuid := gen_random_uuid();
  prog text; n jsonb;
begin
  select c.programme_id into prog from seneve.contents c join seneve.programmes p using (programme_id) limit 1;
  insert into auth.users(id) values (ua);
  insert into seneve.participants(participant_id, auth_user_id, prenom, langue) values (pa, ua, 'Fictif R', 'fr');
  insert into seneve.enrollments(enrollment_id, participant_id, programme_id, version, langue, date_debut, etat)
    select ea, pa, prog, (select min(version) from seneve.contents where programme_id = prog), 'fr', current_date, 'active';
  insert into seneve.communications(cle_idempotence, enrollment_id, canal, creneau, etat, motif, modifie_le) values
    ('verification_a_' || gen_random_uuid()::text, ea, 'push', now() - interval '2 days', 'accepte', 'rappel_soir', now() - interval '2 days'),
    ('verification_b_' || gen_random_uuid()::text, ea, 'push', now() - interval '1 hour', 'accepte', 'rappel_midi', now() - interval '1 hour'),
    ('verification_c_' || gen_random_uuid()::text, ea, 'push', now(), 'planifie', 'rappel_soir', now());
  perform set_config('request.jwt.claim.sub', ua::text, true);
  n := seneve.mes_notifications(50);
  if (n->>'non_lues')::int <> 1 then raise exception 'Rappels non lus attendus 1, obtenus %', n->>'non_lues'; end if;
  if (select count(*) from jsonb_array_elements(n->'elements') e where e->>'type' = 'rappel_moment') <> 2 then raise exception 'Historique des rappels incorrect'; end if;
  if (select count(*) from jsonb_array_elements(n->'elements') e where (e->>'nouveau')::boolean) <> 1 then raise exception 'Marque nouveau incorrecte'; end if;
  perform seneve.marquer_notifications_vues();
  if (seneve.mes_notifications(50)->>'non_lues')::int <> 0 then raise exception 'Vu non pris en compte pour les rappels'; end if;
  insert into seneve.communications(cle_idempotence, enrollment_id, canal, creneau, etat, motif, modifie_le)
    values ('verification_d_' || gen_random_uuid()::text, ea, 'push', now(), 'accepte', 'rappel_matin', clock_timestamp() + interval '1 second');
  if (seneve.mes_notifications(50)->>'non_lues')::int <> 1 then raise exception 'Nouveau rappel du matin non compté'; end if;
end $test$;

-- seneve_051 : image téléversée et lien vidéo (décision de Dr Justin du 29/10/2026).
do $test$
declare
  admin uuid; ua uuid := gen_random_uuid(); pa uuid := gen_random_uuid();
  cid uuid := gen_random_uuid(); cid2 uuid := gen_random_uuid(); n jsonb; e jsonb;
begin
  select auth_user_id into admin from seneve.staff_roles where role = 'administrateur' limit 1;
  if not exists (select 1 from storage.buckets where id = 'annonces' and public and file_size_limit = 2097152 and allowed_mime_types = array['image/jpeg']) then
    raise exception 'Stockage annonces mal réglé';
  end if;
  insert into auth.users(id) values (ua);
  insert into seneve.participants(participant_id, auth_user_id, prenom, langue) values (pa, ua, 'Fictif M', 'fr');
  perform set_config('request.jwt.claim.sub', admin::text, true);
  -- Image absente du stockage : refus.
  begin perform seneve.staff_annonce_publier(cid, 'Avec image', 'Texte', 'fr', 'tous', null, cid::text || '.jpg', null); raise exception 'Image absente acceptée';
  exception when invalid_parameter_value then null; end;
  insert into storage.objects(bucket_id, name) values ('annonces', cid::text || '.jpg');
  -- Image d'une autre annonce : refus.
  begin perform seneve.staff_annonce_publier(cid2, 'Image volée', 'Texte', 'fr', 'tous', null, cid::text || '.jpg', null); raise exception 'Image d’une autre annonce acceptée';
  exception when invalid_parameter_value then null; end;
  -- Liens refusés : autre site, http, espace.
  begin perform seneve.staff_annonce_publier(cid2, 'Lien', 'Texte', 'fr', 'tous', null, null, 'https://exemple.com/video'); raise exception 'Lien hors YouTube/TikTok accepté';
  exception when invalid_parameter_value then null; end;
  begin perform seneve.staff_annonce_publier(cid2, 'Lien', 'Texte', 'fr', 'tous', null, null, 'http://youtu.be/dQw4w9WgXcQ'); raise exception 'Lien http accepté';
  exception when invalid_parameter_value then null; end;
  begin perform seneve.staff_annonce_publier(cid2, 'Lien', 'Texte', 'fr', 'tous', null, null, 'https://youtube.com.exemple.com/watch?v=dQw4w9WgXcQ'); raise exception 'Faux domaine accepté';
  exception when invalid_parameter_value then null; end;
  perform seneve.staff_annonce_publier(cid, 'Avec image', 'Texte', 'fr', 'tous', null, cid::text || '.jpg', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  perform seneve.staff_annonce_publier(cid2, 'TikTok', 'Texte', 'fr', 'tous', null, null, 'https://www.tiktok.com/@drjustin/video/7300000000000000000');
  -- Répétition identique acceptée, répétition sans l'image refusée.
  if (seneve.staff_annonce_publier(cid, 'Avec image', 'Texte', 'fr', 'tous', null, cid::text || '.jpg', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')->>'repetition')::boolean is not true then raise exception 'Répétition média non reconnue'; end if;
  begin perform seneve.staff_annonce_publier(cid, 'Avec image', 'Texte', 'fr', 'tous', null, null, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'); raise exception 'Répétition différente acceptée';
  exception when unique_violation then null; end;
  -- Le participant reçoit l'image et le lien.
  perform set_config('request.jwt.claim.sub', ua::text, true);
  n := seneve.mes_notifications(50);
  select x into e from jsonb_array_elements(n->'elements') x where x->>'titre' = 'Avec image';
  if e->>'image' <> cid::text || '.jpg' or e->>'video' <> 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' then raise exception 'Média absent chez le participant : %', e; end if;
  raise notice 'Annonces avec image et vidéo : vérifications réussies';
end $test$;
rollback;
