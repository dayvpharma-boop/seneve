-- Applied to seneve-prod via migration fix_continuite_renewal_remaining_days, 2026-10-16.
-- Scope: CONTINUITE_MENSUEL_FR only. Existing security/permissions preserved.
-- Regression checks use a rolled-back transaction; no test customers persist.

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

  if v_offre.programme_id is not null then
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
end $function$
;

-- Regression checks (always rolled back)
begin;

do $tests$
declare
 p uuid; a uuid; b uuid; c uuid; f1 timestamptz; f2 timestamptz; f3 timestamptz; r jsonb; d date;
begin
 insert into seneve.participants(prenom) values ('ESSAI ANNULE RENOUVELLEMENT') returning participant_id into p;
 insert into seneve.payment_events(fournisseur,id_evenement,type_evenement,signature_verifiee,offre_id,date_paiement,controle)
 values ('chariow','verification_'||gen_random_uuid(),'successful.sale',true,'CONTINUITE_MENSUEL_FR',now()-interval '10 days','ok') returning payment_event_id into a;
 perform seneve._ouvrir_acces(a,p);
 select fin into f1 from seneve.entitlements where payment_event_id=a;
 if f1 < now()+interval '30 days' then raise exception 'Premier achat retardé: durée perdue'; end if;
 insert into seneve.payment_events(fournisseur,id_evenement,type_evenement,signature_verifiee,offre_id,date_paiement,controle)
 values ('chariow','verification_'||gen_random_uuid(),'successful.sale',true,'CONTINUITE_MENSUEL_FR',now(),'ok') returning payment_event_id into b;
 perform seneve._ouvrir_acces(b,p);
 select fin into f2 from seneve.entitlements where payment_event_id=b;
 select date_debut into d from seneve.parcours_planifies where entitlement_id=(select entitlement_id from seneve.entitlements where payment_event_id=b);
 if f2 <> f1+interval '30 days' then raise exception 'Renouvellement anticipé: solde perdu'; end if;
 if f2 < ((d+30)::timestamp at time zone 'Africa/Kinshasa') then raise exception 'Parcours non couvert'; end if;
 r:=seneve._ouvrir_acces(b,p);
 if r->>'resultat'<>'deja_acces_ouvert' then raise exception 'Doublon non détecté'; end if;
 if (select fin from seneve.entitlements where payment_event_id=b)<>f2 then raise exception 'Doublon prolonge accès'; end if;
 insert into seneve.payment_events(fournisseur,id_evenement,type_evenement,signature_verifiee,offre_id,date_paiement,controle)
 values ('chariow','verification_'||gen_random_uuid(),'successful.sale',true,'CONTINUITE_MENSUEL_FR',now(),'ok') returning payment_event_id into c;
 perform seneve._ouvrir_acces(c,p);
 select fin into f3 from seneve.entitlements where payment_event_id=c;
 if f3<>f2+interval '30 days' then raise exception 'Troisième achat non cumulé'; end if;
 -- Expiration ancienne et parcours terminé : nouvel achat pour trente jours complets.
 update seneve.entitlements set fin=now()-interval '1 day' where participant_id=p;
 update seneve.enrollments set etat='terminee' where participant_id=p;
 update seneve.parcours_planifies set etat='annule' where participant_id=p;
 insert into seneve.payment_events(fournisseur,id_evenement,type_evenement,signature_verifiee,offre_id,date_paiement,controle)
 values ('chariow','verification_'||gen_random_uuid(),'successful.sale',true,'CONTINUITE_MENSUEL_FR',now(),'ok') returning payment_event_id into c;
 perform seneve._ouvrir_acces(c,p);
 select fin into f3 from seneve.entitlements where payment_event_id=c;
 if f3<>now()+interval '30 days' then raise exception 'Reprise après expiration incorrecte'; end if;
end $tests$;

rollback;
