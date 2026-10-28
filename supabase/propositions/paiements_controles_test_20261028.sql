-- Préconditions : refuse les définitions actuelles de PROD et toute base divergente.
do $controle$
begin
 if md5(pg_get_functiondef('seneve._ouvrir_acces(uuid,uuid)'::regprocedure)) not in ('565fd2c2e76323fad139f03fe7ee3239','16a77873f536159ecb8b38fbea7d1313')
 or md5(pg_get_functiondef('seneve.record_chariow_sale(text,text,text,text,numeric,text,text,timestamptz,boolean,text)'::regprocedure)) not in ('f5becb09657a0310b66b2243c62038ba','bebe7d2a4dbbc5cde7ccba43bb693c19') then
  raise exception 'Cette remise à niveau cible les définitions TEST vérifiées le 28/10/2026. Ne pas appliquer sur PROD.';
 end if;
end $controle$;
-- TEST uniquement : rétablir les contrôles de conformité déjà présents en PROD.
-- Les règles Continuité/HD, dates alignées et reprise restent celles de TEST.
CREATE OR REPLACE FUNCTION seneve.record_chariow_sale(p_id_vente text, p_type_evenement text, p_statut_vente text, p_produit_id text, p_montant numeric, p_devise text, p_email text, p_date_paiement timestamp with time zone, p_signature_verifiee boolean, p_livraison_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id          text := btrim(coalesce(p_id_vente, ''));
  v_email       text := lower(btrim(coalesce(p_email, '')));
  v_devise      text := upper(btrim(coalesce(p_devise, '')));
  v_produit     text := btrim(coalesce(p_produit_id, ''));
  v_exist       seneve.payment_events%rowtype;
  v_offre       seneve.offers%rowtype;
  v_controle    text;
  v_pe          uuid;
  v_user        uuid;
  v_participant uuid;
begin
  if v_id = '' then
    raise exception 'Identifiant de vente absent.' using errcode = '22023';
  end if;
  if p_signature_verifiee is not true then
    raise exception 'Signature Chariow non vérifiée : vente refusée.' using errcode = '28000';
  end if;
  if p_type_evenement is distinct from 'successful.sale' or p_statut_vente is distinct from 'completed' then
    return jsonb_build_object('resultat', 'ignore', 'motif', 'evenement_non_pris_en_charge');
  end if;
  if starts_with(v_id, 'test_sale_') then
    return jsonb_build_object('resultat', 'ignore', 'motif', 'vente_de_test');
  end if;

  perform pg_advisory_xact_lock(hashtext('chariow:' || v_id));
  select * into v_exist from seneve.payment_events
   where fournisseur = 'chariow' and id_evenement = v_id;
  if found then
    return jsonb_build_object('resultat', 'deja_recu', 'statut', v_exist.statut_traitement,
                              'payment_event_id', v_exist.payment_event_id);
  end if;

  select * into v_offre from seneve.offers
   where chariow_product_id = v_produit and actif;

  v_controle := concat_ws(',',
    case when v_offre.offre_id is null then 'offre_inconnue' end,
    case when v_email = '' then 'email_absent' end,
    case when v_offre.offre_id is not null
          and v_devise is distinct from upper(coalesce(v_offre.devise, '')) then 'devise_differente' end,
    case when v_offre.offre_id is not null
          and p_montant is distinct from v_offre.prix then 'montant_different' end);
  if v_controle = '' then
    v_controle := 'ok';
  end if;

  insert into seneve.payment_events (fournisseur, id_evenement, type_evenement, signature_verifiee,
                                     montant_observe, devise_observee, offre_id, produit_fournisseur,
                                     email_acheteur, date_paiement, controle, statut_traitement, brut)
  values ('chariow', v_id, p_type_evenement, true,
          p_montant, nullif(v_devise, ''), v_offre.offre_id, nullif(v_produit, ''),
          nullif(v_email, ''), coalesce(p_date_paiement, now()), v_controle, 'recu',
          jsonb_build_object('livraison_id', p_livraison_id))
  returning payment_event_id into v_pe;

  if v_controle <> 'ok' then
    update seneve.payment_events
       set statut_traitement = 'a_examiner', traite_le = now()
     where payment_event_id = v_pe;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement', 'paiement_recu', 'payment_event:' || v_pe, 'a_examiner',
            jsonb_build_object('controle', v_controle));
    return jsonb_build_object('resultat', 'a_examiner', 'controle', v_controle, 'payment_event_id', v_pe);
  end if;

  select u.id into v_user
    from auth.users u
   where lower(u.email) = v_email and u.email_confirmed_at is not null
   order by u.created_at
   limit 1;

  if v_user is null then
    update seneve.payment_events
       set statut_traitement = 'en_attente_compte', traite_le = now()
     where payment_event_id = v_pe;
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    values ('paiement', 'paiement_recu', 'payment_event:' || v_pe, 'en_attente_compte',
            jsonb_build_object('controle', v_controle, 'offre_id', v_offre.offre_id));
    return jsonb_build_object('resultat', 'en_attente_compte', 'controle', v_controle, 'payment_event_id', v_pe);
  end if;

  v_participant := seneve._participant_du_compte(v_user);
  return seneve._ouvrir_acces(v_pe, v_participant) || jsonb_build_object('payment_event_id', v_pe);
end
$function$
;
CREATE OR REPLACE FUNCTION seneve._ouvrir_acces(p_payment_event_id uuid, p_participant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_pe seneve.payment_events%rowtype; v_offre seneve.offers%rowtype; v_prog seneve.programmes%rowtype;
  v_version integer; v_ent uuid; v_enr uuid; v_enr_ent uuid; v_enr_fin date; v_debut date; v_dernier date;
  v_plan uuid; v_paye_le timestamptz;
  v_auj date := (now() at time zone 'Africa/Kinshasa')::date;
  v_n integer; v_prog_id text; v_hd jsonb; v_hd_jour date; v_enr2 uuid; v_plan2 uuid;
begin
  select * into v_pe from seneve.payment_events where payment_event_id = p_payment_event_id for update;
  if not found then raise exception 'Paiement introuvable.' using errcode = 'P0002'; end if;
  if v_pe.statut_traitement in ('acces_ouvert', 'revoque') then
    select entitlement_id into v_ent from seneve.entitlements where payment_event_id = p_payment_event_id;
    return jsonb_build_object('resultat', 'deja_' || v_pe.statut_traitement, 'entitlement_id', v_ent);
  end if;
  -- Refuser les anomalies avant toute création de droit, y compris au rattachement différé.
  if v_pe.signature_verifiee is not true or coalesce(v_pe.controle, '') <> 'ok' then
    update seneve.payment_events set statut_traitement='a_examiner',traite_le=now() where payment_event_id=p_payment_event_id;
    insert into seneve.audit_events(acteur,action,objet,resultat,details)
    values('paiement','ouverture_acces','payment_event:'||p_payment_event_id,'a_examiner',jsonb_build_object('controle',v_pe.controle,'signature_verifiee',v_pe.signature_verifiee));
    return jsonb_build_object('resultat','a_examiner','controle',v_pe.controle,'payment_event_id',p_payment_event_id);
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

  if v_offre.offre_id like 'CONTINUITE_MENSUEL_%' then
    select count(*) into v_n from seneve.entitlements
     where participant_id = p_participant_id and offre_id = v_offre.offre_id and etat <> 'revoque';
    v_prog_id := case (v_n - 1) % 3 when 1 then 'ABONNE_CONTINUITE_M2_' when 2 then 'ABONNE_CONTINUITE_M3_' else 'ABONNE_CONTINUITE_' end
                 || upper(coalesce(nullif(v_offre.langue, ''), 'fr')) || '_V1';
    if not exists (select 1 from seneve.programme_versions where programme_id = v_prog_id and etat = 'publiee') then
      v_prog_id := v_offre.programme_id;
    end if;
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
      update seneve.enrollments set entitlement_id = v_ent where enrollment_id = v_enr;
    elsif v_enr is not null then
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

  if v_offre.offre_id like 'CONTINUITE_MENSUEL_%'
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

  if v_offre.offre_id like 'CONTINUITE_MENSUEL_%' then
    begin
      v_hd := seneve._ouvrir_mois_habitudes(p_participant_id, v_ent);
      v_enr2 := v_enr; v_plan2 := v_plan;
      -- Choix B : les contenus Continuité commencent le jour où commence le mois HD.
      if coalesce((v_hd->>'ouvert')::boolean, false) or v_hd->>'nouveau_cycle' = 'planifie' then
        v_hd_jour := (coalesce(v_hd->>'debut', v_hd->>'debut_prevu')::timestamptz at time zone
                      (select coalesce(nullif(preferences#>>'{rappels,fuseau}',''), nullif(fuseau,''), 'Africa/Kinshasa')
                         from seneve.participants where participant_id = p_participant_id))::date;
        if v_enr2 is not null and v_hd_jour > v_auj then
          delete from seneve.enrollments where enrollment_id = v_enr2;
          insert into seneve.parcours_planifies (participant_id, programme_id, entitlement_id, date_debut)
          values (p_participant_id, v_prog_id, v_ent, v_hd_jour)
          on conflict (entitlement_id) do nothing returning planifie_id into v_plan2;
          v_enr2 := null;
        elsif v_plan2 is not null then
          update seneve.parcours_planifies set date_debut = greatest(date_debut, v_hd_jour), modifie_le = now()
           where planifie_id = v_plan2;
        end if;
      end if;
      v_enr := v_enr2; v_plan := v_plan2;
    exception when others then
      v_hd := jsonb_build_object('ouvert', false, 'motif', 'erreur', 'detail', sqlerrm);
    end;
  end if;
  update seneve.payment_events set participant_id = p_participant_id, statut_traitement = 'acces_ouvert', email_acheteur = null, traite_le = now()
   where payment_event_id = p_payment_event_id;
  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'acces_ouvert',
          jsonb_build_object('entitlement_id', v_ent, 'enrollment_id', v_enr, 'parcours_planifie', v_plan,
                             'offre_id', v_offre.offre_id, 'controle', v_pe.controle, 'habitudes_defis', v_hd));
  return jsonb_build_object('resultat', 'acces_ouvert', 'entitlement_id', v_ent, 'enrollment_id', v_enr,
                            'parcours_planifie', v_plan, 'controle', v_pe.controle, 'habitudes_defis', v_hd);
end $function$
;
