-- SÉNEVÉ 2.0 — Migration 028 (16/10/2026) : Sénevé Continuité, mois suivant
-- Le mois 2 (ABONNE_CONTINUITE_M2_FR_V1, 30 défis validés par Dr Justin le 16/10/2026) est publié.
-- Règle : chaque achat Continuité ouvre le mois suivant de l'abonné.
--   achat n° 1, 3, 5… → mois 1 (ABONNE_CONTINUITE_FR_V1) ; achat n° 2, 4, 6… → mois 2 (ABONNE_CONTINUITE_M2_FR_V1),
--   tant que d'autres mois ne sont pas écrits. Un mois non publié est remplacé par le mois 1.
-- Le nouveau mois commence le lendemain du mois en cours ou déjà planifié ; sinon aujourd'hui.
-- La prolongation du droit (solde conservé) reste celle déjà en place.
-- Les autres offres gardent exactement leur comportement.

create or replace function seneve._ouvrir_acces(p_payment_event_id uuid, p_participant_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_pe seneve.payment_events%rowtype; v_offre seneve.offers%rowtype; v_prog seneve.programmes%rowtype;
  v_version integer; v_ent uuid; v_enr uuid; v_enr_ent uuid; v_enr_fin date; v_debut date; v_dernier date;
  v_plan uuid; v_paye_le timestamptz;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
  v_n integer; v_prog_id text;
begin
  select * into v_pe from seneve.payment_events where payment_event_id = p_payment_event_id for update;
  if not found then raise exception 'Paiement introuvable.' using errcode = 'P0002'; end if;
  if v_pe.statut_traitement in ('acces_ouvert', 'revoque') then
    select entitlement_id into v_ent from seneve.entitlements where payment_event_id = p_payment_event_id;
    return jsonb_build_object('resultat', 'deja_' || v_pe.statut_traitement, 'entitlement_id', v_ent);
  end if;
  select * into v_offre from seneve.offers where offre_id = v_pe.offre_id;
  if not found then raise exception 'Aucune offre liée à ce paiement.' using errcode = 'P0002'; end if;
  perform pg_advisory_xact_lock(hashtext('participant:' || p_participant_id::text));
  v_paye_le := coalesce(v_pe.date_paiement, v_pe.recu_le);
  insert into seneve.entitlements (participant_id, offre_id, origine, payment_event_id, etat, debut, fin)
  values (p_participant_id, v_offre.offre_id, 'achat', p_payment_event_id, 'actif', v_paye_le,
          case when v_offre.duree_acces_jours is null then null else v_paye_le + make_interval(days => v_offre.duree_acces_jours) end)
  on conflict (payment_event_id) where payment_event_id is not null do nothing
  returning entitlement_id into v_ent;
  if v_ent is null then select entitlement_id into v_ent from seneve.entitlements where payment_event_id = p_payment_event_id; end if;

  if v_offre.offre_id = 'CONTINUITE_MENSUEL_FR' then
    -- Rang de cet achat parmi les achats Continuité (droits non révoqués), puis mois correspondant.
    select count(*) into v_n from seneve.entitlements
     where participant_id = p_participant_id and offre_id = v_offre.offre_id and etat <> 'revoque';
    v_prog_id := case when v_n % 2 = 0 then 'ABONNE_CONTINUITE_M2_FR_V1' else 'ABONNE_CONTINUITE_FR_V1' end;
    if not exists (select 1 from seneve.programme_versions where programme_id = v_prog_id and etat = 'publiee') then
      v_prog_id := v_offre.programme_id;
    end if;
    -- Fin du mois en cours et du dernier mois planifié (tous mois Continuité confondus).
    select max(coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 30) - 1))) into v_enr_fin
      from seneve.enrollments e join seneve.programmes pr on pr.programme_id = e.programme_id
     where e.participant_id = p_participant_id and e.programme_id like 'ABONNE_CONTINUITE%' and e.etat in ('active', 'en_pause');
    select max(p.date_debut + (coalesce(pr.duree_jours, 30) - 1)) into v_dernier
      from seneve.parcours_planifies p join seneve.programmes pr on pr.programme_id = p.programme_id
     where p.participant_id = p_participant_id and p.programme_id like 'ABONNE_CONTINUITE%' and p.etat = 'en_attente';
    v_debut := greatest(v_auj, coalesce(v_enr_fin + 1, v_auj), coalesce(v_dernier + 1, v_auj));
    select * into v_prog from seneve.programmes where programme_id = v_prog_id;
    if v_enr_fin is null and v_dernier is null then
      select version into v_version from seneve.programme_versions
       where programme_id = v_prog_id and etat = 'publiee' order by version desc limit 1;
      if v_version is null then
        update seneve.payment_events set participant_id = p_participant_id, statut_traitement = 'a_examiner',
               controle = concat_ws(',', nullif(controle, 'ok'), 'programme_non_publie'), email_acheteur = null, traite_le = now()
         where payment_event_id = p_payment_event_id;
        insert into seneve.audit_events (acteur, action, objet, resultat, details)
        values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'programme_non_publie',
                jsonb_build_object('entitlement_id', v_ent, 'programme_id', v_prog_id));
        return jsonb_build_object('resultat', 'programme_non_publie', 'entitlement_id', v_ent);
      end if;
      insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat, entitlement_id)
      values (p_participant_id, v_prog_id, v_version, v_prog.langue, v_debut,
              case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end, 'active', v_ent)
      returning enrollment_id into v_enr;
    else
      insert into seneve.parcours_planifies (participant_id, programme_id, entitlement_id, date_debut)
      values (p_participant_id, v_prog_id, v_ent, v_debut)
      on conflict (entitlement_id) do nothing
      returning planifie_id into v_plan;
      v_enr := null;
    end if;

  elsif v_offre.programme_id is not null then
    select * into v_prog from seneve.programmes where programme_id = v_offre.programme_id;
    select enrollment_id, entitlement_id, coalesce(date_fin_prevue, date_debut + (coalesce(v_prog.duree_jours, 7) - 1))
      into v_enr, v_enr_ent, v_enr_fin
      from seneve.enrollments
     where participant_id = p_participant_id and programme_id = v_offre.programme_id and etat in ('active', 'en_pause')
     for update;

    if v_enr is not null and v_enr_ent is null then
      -- Parcours en cours sans achat rattaché (ex. inscription de la feuille) : on le rattache.
      update seneve.enrollments set entitlement_id = v_ent where enrollment_id = v_enr;
    elsif v_enr is not null then
      -- Second achat (décision du 15/10/2026) : nouveau parcours le lendemain du dernier en cours ou planifié.
      select max(p.date_debut + (coalesce(v_prog.duree_jours, 7) - 1)) into v_dernier
        from seneve.parcours_planifies p
       where p.participant_id = p_participant_id and p.programme_id = v_offre.programme_id and p.etat = 'en_attente';
      v_debut := greatest(v_auj, v_enr_fin + 1, coalesce(v_dernier + 1, v_auj));
      insert into seneve.parcours_planifies (participant_id, programme_id, entitlement_id, date_debut)
      values (p_participant_id, v_offre.programme_id, v_ent, v_debut)
      on conflict (entitlement_id) do nothing
      returning planifie_id into v_plan;
      v_enr := null;
    else
      select version into v_version from seneve.programme_versions
       where programme_id = v_offre.programme_id and etat = 'publiee' order by version desc limit 1;
      if v_version is null then
        update seneve.payment_events set participant_id = p_participant_id, statut_traitement = 'a_examiner',
               controle = concat_ws(',', nullif(controle, 'ok'), 'programme_non_publie'), email_acheteur = null, traite_le = now()
         where payment_event_id = p_payment_event_id;
        insert into seneve.audit_events (acteur, action, objet, resultat, details)
        values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'programme_non_publie',
                jsonb_build_object('entitlement_id', v_ent, 'programme_id', v_offre.programme_id));
        return jsonb_build_object('resultat', 'programme_non_publie', 'entitlement_id', v_ent);
      end if;
      v_debut := greatest(v_auj, (v_paye_le at time zone 'Africa/Kinshasa')::date + coalesce(v_prog.delai_apres_achat_jours, 0));
      insert into seneve.enrollments (participant_id, programme_id, version, langue, date_debut, date_fin_prevue, etat, entitlement_id)
      values (p_participant_id, v_offre.programme_id, v_version, v_prog.langue, v_debut,
              case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end, 'active', v_ent)
      returning enrollment_id into v_enr;
    end if;
  end if;

  -- Chaque renouvellement Continuité conserve le solde et couvre le parcours planifié.
  -- Le verrou participant ci-dessus sérialise aussi les achats distincts simultanés.
  if v_offre.offre_id = 'CONTINUITE_MENSUEL_FR'
     and v_offre.duree_acces_jours is not null then
    update seneve.entitlements
       set fin = greatest(
         now(),
         v_paye_le,
         v_debut::timestamp at time zone 'Africa/Kinshasa',
         (select max(e.fin) from seneve.entitlements e
           where e.participant_id = p_participant_id
             and e.offre_id = v_offre.offre_id
             and e.etat = 'actif' and e.entitlement_id <> v_ent)
       ) + make_interval(days => v_offre.duree_acces_jours)
     where entitlement_id = v_ent;
  end if;

  update seneve.payment_events set participant_id = p_participant_id, statut_traitement = 'acces_ouvert', email_acheteur = null, traite_le = now()
   where payment_event_id = p_payment_event_id;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'acces_ouvert',
          jsonb_build_object('entitlement_id', v_ent, 'enrollment_id', v_enr, 'parcours_planifie', v_plan,
                             'offre_id', v_offre.offre_id, 'controle', v_pe.controle));
  return jsonb_build_object('resultat', 'acces_ouvert', 'entitlement_id', v_ent, 'enrollment_id', v_enr,
                            'parcours_planifie', v_plan, 'controle', v_pe.controle);
end $function$;

update seneve.programmes
   set quota_coach_jour = 50,
       description = 'Abonnement mensuel, mois 2 : un défi par jour sur les 7 racines.'
 where programme_id = 'ABONNE_CONTINUITE_M2_FR_V1';
