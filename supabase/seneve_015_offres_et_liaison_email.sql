-- SÉNEVÉ 015 — Catalogue validé et ouverture du suivi acheteur par l'adresse e-mail confirmée.
-- Décisions de Dr Justin du 13/10/2026 (19 h 08) : « 1 valide, 2 oui ».
--  1. Le catalogue CATALOGUE_OFFRES (14 offres) est validé : il est copié dans seneve.offers.
--     Durées d'accès : non renseignées dans le catalogue → laissées vides (aucune valeur inventée).
--     Les programmes des formations 30/90 jours sont déclarés SANS version publiée : aucune
--     inscription ne peut s'y ouvrir tant que leurs contenus ne sont pas rédigés, relus et publiés.
--  2. Une inscription acheteur (feuille INSCRIPTIONS) s'ouvre dans l'espace web du compte dont
--     l'adresse e-mail CONFIRMÉE est identique à celle de l'achat (fiche CONTACTS), même sans WhatsApp relié.
--     La fonction existante sync_legacy_enrollment (liaison par numéro WhatsApp) n'est pas modifiée.

-- 1. Programmes des offres (formations : sans version publiée, donc fermés)
insert into seneve.programmes (programme_id, nom, type_parcours, langue, duree_jours, source_livre) values
  ('ACHETEUR_FORMATION30_30J_FR_V1', 'Formation 30 jours', 'acheteur_formation', 'fr', 30, 'annexe 30 jours du livre'),
  ('ACHETEUR_FORMATION90_90J_FR_V1', 'Formation 90 jours', 'acheteur_formation', 'fr', 90, null),
  ('ACHETEUR_ACCOMP30_30J_FR_V1', 'Accompagnement personnel 30 jours', 'acheteur_accompagnement', 'fr', 30, 'annexe 30 jours du livre'),
  ('ACHETEUR_ACCOMP90_90J_FR_V1', 'Accompagnement personnel 90 jours', 'acheteur_accompagnement', 'fr', 90, null),
  ('ACHETEUR_FORMATION30_30J_EN_V1', '30-Day Training', 'acheteur_formation', 'en', 30, 'annexe 30 jours du livre'),
  ('ACHETEUR_FORMATION90_90J_EN_V1', '90-Day Training', 'acheteur_formation', 'en', 90, null),
  ('ACHETEUR_ACCOMP30_30J_EN_V1', '30-Day Personal Coaching', 'acheteur_accompagnement', 'en', 30, 'annexe 30 jours du livre'),
  ('ACHETEUR_ACCOMP90_90J_EN_V1', '90-Day Personal Coaching', 'acheteur_accompagnement', 'en', 90, null)
on conflict (programme_id) do nothing;

-- 2. Offres validées (copie fidèle de CATALOGUE_OFFRES au 13/10/2026)
insert into seneve.offers (offre_id, produit, type_offre, langue, programme_id, chariow_product_id, prix, devise, duree_acces_jours, actif) values
  ('LIVRE_PDF_FR', 'Arrête de mendier des miracles', 'PDF', 'fr', 'ACHETEUR_LIVRE_14J_FR_V1', 'prd_3e16utqk', 2.99, 'USD', null, true),
  ('LIVRE_AUDIO_FR', 'Arrête de mendier des miracles', 'Audio MP3', 'fr', 'ACHETEUR_LIVRE_14J_FR_V1', 'prd_z1ghiuh1', 4.99, 'USD', null, true),
  ('LIVRE_PAPIER_FR', 'Arrête de mendier des miracles', 'Livre papier', 'fr', 'ACHETEUR_LIVRE_14J_FR_V1', null, 19, 'USD', null, true),
  ('FORMATION_30J_FR', 'Formation 30 jours', 'Formation', 'fr', 'ACHETEUR_FORMATION30_30J_FR_V1', 'prd_tzep7gqk', 39, 'USD', null, true),
  ('FORMATION_90J_FR', 'Formation 90 jours', 'Formation', 'fr', 'ACHETEUR_FORMATION90_90J_FR_V1', 'prd_644jfhtu', 89, 'USD', null, true),
  ('ACCOMPAGNEMENT_30J_FR', 'Accompagnement personnel 30 jours', 'Accompagnement personnel', 'fr', 'ACHETEUR_ACCOMP30_30J_FR_V1', 'prd_gh92snpf', 99, 'USD', null, true),
  ('ACCOMPAGNEMENT_90J_FR', 'Accompagnement personnel 90 jours', 'Accompagnement personnel', 'fr', 'ACHETEUR_ACCOMP90_90J_FR_V1', 'prd_nxxh7lut', 249, 'USD', null, true),
  ('LIVRE_PDF_EN', 'Stop Begging for Miracles', 'PDF', 'en', 'ACHETEUR_LIVRE_14J_EN_V1', 'prd_abo2elaa', 2.99, 'USD', null, true),
  ('LIVRE_AUDIO_EN', 'Stop Begging for Miracles', 'Audio MP3', 'en', 'ACHETEUR_LIVRE_14J_EN_V1', 'prd_b9fr0kuw', 4.99, 'USD', null, true),
  ('LIVRE_PAPIER_EN', 'Stop Begging for Miracles', 'Livre papier', 'en', 'ACHETEUR_LIVRE_14J_EN_V1', null, 19, 'USD', null, true),
  ('FORMATION_30J_EN', '30-Day Training', 'Formation', 'en', 'ACHETEUR_FORMATION30_30J_EN_V1', 'prd_lhpbe7w2', 39, 'USD', null, true),
  ('FORMATION_90J_EN', '90-Day Training', 'Formation', 'en', 'ACHETEUR_FORMATION90_90J_EN_V1', 'prd_9dpd5e43', 89, 'USD', null, true),
  ('ACCOMPAGNEMENT_30J_EN', '30-Day Personal Coaching', 'Accompagnement personnel', 'en', 'ACHETEUR_ACCOMP30_30J_EN_V1', 'prd_chq1uan9', 99, 'USD', null, true),
  ('ACCOMPAGNEMENT_90J_EN', '90-Day Personal Coaching', 'Accompagnement personnel', 'en', 'ACHETEUR_ACCOMP90_90J_EN_V1', 'prd_lwbim0c6', 249, 'USD', null, true)
on conflict (offre_id) do nothing;

insert into seneve.audit_events (acteur, action, objet, resultat, details)
values ('dr_justin', 'catalogue_valide', 'offers', 'ok',
        jsonb_build_object('source', 'CATALOGUE_OFFRES', 'decision', '2026-10-13 19:08 Africa/Kinshasa', 'offres', 14));

-- 3. Ouverture par adresse e-mail confirmée
create or replace function seneve.sync_legacy_enrollment_email(p_inscription_id text, p_email text, p_programme_id text, p_date_debut text, p_statut text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid;
  v_participant uuid;
  v_prog seneve.programmes%rowtype;
  v_version int;
  v_debut date;
  v_etat text;
  v_enr seneve.enrollments%rowtype;
  v_res text;
begin
  if coalesce(trim(p_inscription_id),'') = '' or coalesce(trim(p_email),'') = '' then
    return jsonb_build_object('resultat','donnees_incompletes');
  end if;

  v_etat := case lower(trim(coalesce(p_statut,'')))
              when 'actif' then 'active' when 'active' then 'active'
              when 'pause' then 'en_pause' when 'en_pause' then 'en_pause'
              when 'arrete' then 'annulee' when 'arrêté' then 'annulee' when 'arrete_admin' then 'annulee'
              when 'termine' then 'terminee' when 'terminé' then 'terminee'
              else null end;
  if v_etat is null then
    return jsonb_build_object('resultat','statut_inconnu','statut',p_statut);
  end if;

  -- Seule une adresse CONFIRMÉE par son propriétaire ouvre l'accès.
  select u.id into v_user from auth.users u
   where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;
  if v_user is null then
    return jsonb_build_object('resultat','aucun_compte_confirme');
  end if;

  select participant_id into v_participant from seneve.participants where auth_user_id = v_user;
  if v_participant is null then
    insert into seneve.participants (auth_user_id, prenom)
    select v_user, nullif(trim(u.raw_user_meta_data->>'prenom'), '') from auth.users u where u.id = v_user
    returning participant_id into v_participant;
  end if;

  select * into v_enr from seneve.enrollments where legacy_inscription_id = p_inscription_id;

  if not found then
    if v_etat in ('annulee','terminee') then
      return jsonb_build_object('resultat','ignoree_non_active');
    end if;
    select * into v_prog from seneve.programmes where programme_id = p_programme_id;
    select version into v_version from seneve.programme_versions
     where programme_id = p_programme_id and etat = 'publiee';
    if v_version is null then
      return jsonb_build_object('resultat','programme_non_publie');
    end if;
    if exists (select 1 from seneve.enrollments
                where participant_id = v_participant and programme_id = p_programme_id
                  and etat in ('active','en_pause')) then
      return jsonb_build_object('resultat','deja_inscrit_autrement');
    end if;
    begin
      v_debut := (p_date_debut::timestamptz at time zone 'Africa/Kinshasa')::date;
    exception when others then
      return jsonb_build_object('resultat','date_invalide');
    end;
    insert into seneve.enrollments (legacy_inscription_id, participant_id, programme_id, version,
                                    langue, date_debut, date_fin_prevue, etat)
    values (p_inscription_id, v_participant, p_programme_id, v_version, v_prog.langue, v_debut,
            case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end,
            v_etat)
    returning * into v_enr;
    v_res := 'creee';
  else
    if v_enr.participant_id <> v_participant then
      insert into seneve.audit_events (acteur, action, objet, resultat, details)
      values ('n8n', 'sync_inscription_email', p_inscription_id, 'conflit_compte', '{}'::jsonb);
      return jsonb_build_object('resultat','conflit_compte');
    end if;
    if v_enr.etat = v_etat then
      return jsonb_build_object('resultat','inchangee','enrollment_id',v_enr.enrollment_id,'etat',v_etat);
    end if;
    update seneve.enrollments set etat = v_etat where enrollment_id = v_enr.enrollment_id;
    v_res := 'mise_a_jour';
  end if;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('n8n', 'sync_inscription_email', p_inscription_id, v_res,
          jsonb_build_object('enrollment_id', v_enr.enrollment_id, 'etat', v_etat, 'liaison', 'email_confirme'));
  return jsonb_build_object('resultat', v_res, 'enrollment_id', v_enr.enrollment_id, 'etat', v_etat);
end $$;

revoke all on function seneve.sync_legacy_enrollment_email(text, text, text, text, text) from public, anon, authenticated;
grant execute on function seneve.sync_legacy_enrollment_email(text, text, text, text, text) to service_role;
