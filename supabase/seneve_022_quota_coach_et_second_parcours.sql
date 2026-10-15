-- SÉNEVÉ — seneve_022 : limite du coach par programme et second parcours après le premier.
-- Décisions du Dr Justin Tshims (15/10/2026, tableau des droits) :
--   * Coach : Découverte 7 j = 5 questions/jour ; Livre 14 j = 50 ; Formation 30/90 = 100 ;
--     Accompagnement personnel 30/90 = 500.
--     Le compteur reste unique par participant et par jour (Africa/Kinshasa) ; la limite appliquée
--     est la plus haute parmi ses parcours actifs.
--   * Second achat d'un programme déjà en cours : un nouveau parcours est « planifié » et démarre
--     le lendemain de la fin prévue du précédent. Il devient actif lors de la clôture horaire
--     (n8n « SÉNEVÉ — Fin des parcours » appelle close_finished_enrollments).
--   * Remboursement : l'accès lié à ce paiement est retiré (parcours planifié compris).
-- Aucune suppression de données. Les autres règles d'achat restent identiques.

-- 1. Limite du coach par programme ------------------------------------------------------------
alter table seneve.programmes
  add column if not exists quota_coach_jour integer not null default 5
  constraint programmes_quota_coach_jour_check check (quota_coach_jour between 0 and 10000);

update seneve.programmes set quota_coach_jour = case
    when programme_id like 'PROSPECT\_%'           then 5
    when programme_id like 'ACHETEUR\_LIVRE\_%'     then 50
    when programme_id like 'ACHETEUR\_FORMATION%'   then 100
    when programme_id like 'ACHETEUR\_ACCOMP%'      then 500
    else quota_coach_jour end;

create or replace function seneve._quota_coach(p_participant uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(pr.quota_coach_jour), 5)
    from seneve.enrollments e
    join seneve.programmes pr on pr.programme_id = e.programme_id
   where e.participant_id = p_participant and e.etat = 'active'
$$;
revoke all on function seneve._quota_coach(uuid) from public, anon, authenticated;

create or replace function seneve.coach_quota()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select seneve._quota_coach(seneve.current_participant_id()) as quota)
  select jsonb_build_object('quota', q.quota, 'restants', greatest(0, q.quota - count(m.*)::int))
    from q
    left join seneve.coach_messages m
      on m.participant_id = seneve.current_participant_id() and m.role = 'participant' and m.etat <> 'echec'
     and (m.cree_le at time zone 'Africa/Kinshasa')::date = (now() at time zone 'Africa/Kinshasa')::date
   group by q.quota
$$;

create or replace function seneve.coach_ask(p_client_message_id uuid, p_enrollment_id uuid, p_texte text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_participant uuid := seneve.current_participant_id();
  v_exist seneve.coach_messages%rowtype;
  v_enr seneve.enrollments%rowtype;
  v_jour date := (now() at time zone 'Africa/Kinshasa')::date;
  v_utilises int;
  v_id uuid;
  v_quota int;
begin
  if v_participant is null then
    raise exception 'Session requise.' using errcode = '28000';
  end if;
  if p_client_message_id is null then
    raise exception 'Identifiant de message manquant.' using errcode = '22023';
  end if;
  -- Nouvel envoi du même message : on renvoie celui déjà enregistré (aucun doublon, aucun quota consommé).
  select * into v_exist from seneve.coach_messages where client_message_id = p_client_message_id;
  if found then
    if v_exist.participant_id <> v_participant then
      raise exception 'Identifiant de message déjà utilisé.' using errcode = '23505';
    end if;
    return jsonb_build_object('message_id', v_exist.message_id, 'etat', v_exist.etat, 'repetition', true);
  end if;
  if char_length(btrim(coalesce(p_texte, ''))) not between 1 and 1000 then
    raise exception 'Écris ta question en 1000 caractères au plus.' using errcode = '22023';
  end if;
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id and participant_id = v_participant;
  if not found then
    raise exception 'Inscription introuvable pour ce compte.' using errcode = '42501';
  end if;
  if v_enr.etat <> 'active' then
    raise exception 'Ce parcours n''est pas actif.' using errcode = '42501';
  end if;
  -- Limite du jour : la plus haute parmi les parcours actifs du participant (décision du 15/10/2026).
  v_quota := seneve._quota_coach(v_participant);
  -- Verrou par participant : deux questions envoyées en même temps ne peuvent pas dépasser la limite.
  perform pg_advisory_xact_lock(hashtext('coach:' || v_participant::text));
  select count(*) into v_utilises from seneve.coach_messages
   where participant_id = v_participant and role = 'participant' and etat <> 'echec'
     and (cree_le at time zone 'Africa/Kinshasa')::date = v_jour;
  if v_utilises >= v_quota then
    raise exception 'QUOTA_ATTEINT' using errcode = 'P0001';
  end if;
  insert into seneve.coach_messages (client_message_id, participant_id, enrollment_id, role, texte, etat)
  values (p_client_message_id, v_participant, p_enrollment_id, 'participant', btrim(p_texte), 'en_attente')
  returning message_id into v_id;
  insert into seneve.jobs (type, cle_logique, charge)
  values ('coach_repondre', 'coach:' || v_id::text, jsonb_build_object('message_id', v_id));
  return jsonb_build_object('message_id', v_id, 'etat', 'en_attente', 'repetition', false,
                            'restants', v_quota - v_utilises - 1);
end $$;

-- 2. Nouvel état « planifiee » pour un parcours payé qui attend la fin du précédent ---------------
alter table seneve.enrollments drop constraint enrollments_etat_check;
alter table seneve.enrollments add constraint enrollments_etat_check
  check (etat = any (array['active', 'en_pause', 'terminee', 'annulee', 'planifiee']));

-- 3. Ouverture d'accès : second achat du même programme => parcours planifié après le dernier --------
create or replace function seneve._ouvrir_acces(p_payment_event_id uuid, p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pe      seneve.payment_events%rowtype;
  v_offre   seneve.offers%rowtype;
  v_prog    seneve.programmes%rowtype;
  v_version integer;
  v_ent     uuid;
  v_enr     uuid;
  v_enr_ent uuid;
  v_debut   date;
  v_dernier date;
  v_etat    text := 'active';
  v_paye_le timestamptz;
  v_auj     date := (now() at time zone 'Africa/Kinshasa')::date;
begin
  select * into v_pe from seneve.payment_events
   where payment_event_id = p_payment_event_id
   for update;
  if not found then
    raise exception 'Paiement introuvable.' using errcode = 'P0002';
  end if;

  if v_pe.statut_traitement in ('acces_ouvert', 'revoque') then
    select entitlement_id into v_ent from seneve.entitlements where payment_event_id = p_payment_event_id;
    return jsonb_build_object('resultat', 'deja_' || v_pe.statut_traitement, 'entitlement_id', v_ent);
  end if;

  select * into v_offre from seneve.offers where offre_id = v_pe.offre_id;
  if not found then
    raise exception 'Aucune offre liée à ce paiement.' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext('participant:' || p_participant_id::text));

  v_paye_le := coalesce(v_pe.date_paiement, v_pe.recu_le);

  insert into seneve.entitlements (participant_id, offre_id, origine, payment_event_id, etat, debut, fin)
  values (p_participant_id, v_offre.offre_id, 'achat', p_payment_event_id, 'actif', v_paye_le,
          case when v_offre.duree_acces_jours is null then null
               else v_paye_le + make_interval(days => v_offre.duree_acces_jours) end)
  on conflict (payment_event_id) where payment_event_id is not null do nothing
  returning entitlement_id into v_ent;
  if v_ent is null then
    select entitlement_id into v_ent from seneve.entitlements where payment_event_id = p_payment_event_id;
  end if;

  if v_offre.programme_id is not null then
    select enrollment_id, entitlement_id into v_enr, v_enr_ent
      from seneve.enrollments
     where participant_id = p_participant_id
       and programme_id = v_offre.programme_id
       and etat in ('active', 'en_pause')
     for update;

    if v_enr is not null and (v_enr_ent is null or v_enr_ent = v_ent) then
      -- Parcours en cours encore sans achat rattaché (ex. inscription de la feuille) : on le rattache.
      update seneve.enrollments
         set entitlement_id = v_ent
       where enrollment_id = v_enr and entitlement_id is null;
    else
      select * into v_prog from seneve.programmes where programme_id = v_offre.programme_id;
      select version into v_version
        from seneve.programme_versions
       where programme_id = v_offre.programme_id and etat = 'publiee'
       order by version desc
       limit 1;

      if v_version is null then
        update seneve.payment_events
           set participant_id = p_participant_id,
               statut_traitement = 'a_examiner',
               controle = concat_ws(',', nullif(controle, 'ok'), 'programme_non_publie'),
               email_acheteur = null,
               traite_le = now()
         where payment_event_id = p_payment_event_id;
        insert into seneve.audit_events (acteur, action, objet, resultat, details)
        values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'programme_non_publie',
                jsonb_build_object('entitlement_id', v_ent, 'programme_id', v_offre.programme_id));
        return jsonb_build_object('resultat', 'programme_non_publie', 'entitlement_id', v_ent);
      end if;

      v_debut := greatest(v_auj,
                          (v_paye_le at time zone 'Africa/Kinshasa')::date
                            + coalesce(v_prog.delai_apres_achat_jours, 0));

      if v_enr is not null then
        -- Second achat (décision du 15/10/2026) : nouveau parcours après le dernier parcours en cours ou planifié.
        select max(coalesce(e.date_fin_prevue, e.date_debut + (coalesce(v_prog.duree_jours, 7) - 1)))
          into v_dernier
          from seneve.enrollments e
         where e.participant_id = p_participant_id
           and e.programme_id = v_offre.programme_id
           and e.etat in ('active', 'en_pause', 'planifiee');
        v_debut := greatest(v_debut, v_dernier + 1);
        v_etat := 'planifiee';
      end if;

      insert into seneve.enrollments (participant_id, programme_id, version, langue,
                                      date_debut, date_fin_prevue, etat, entitlement_id)
      values (p_participant_id, v_offre.programme_id, v_version, v_prog.langue, v_debut,
              case when v_prog.duree_jours is null then null else v_debut + (v_prog.duree_jours - 1) end,
              v_etat, v_ent)
      returning enrollment_id into v_enr;
    end if;
  end if;

  update seneve.payment_events
     set participant_id = p_participant_id,
         statut_traitement = 'acces_ouvert',
         email_acheteur = null,
         traite_le = now()
   where payment_event_id = p_payment_event_id;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement', 'acces_achat', 'payment_event:' || p_payment_event_id, 'acces_ouvert',
          jsonb_build_object('entitlement_id', v_ent, 'enrollment_id', v_enr, 'etat_parcours', v_etat,
                             'offre_id', v_offre.offre_id, 'controle', v_pe.controle));

  return jsonb_build_object('resultat', 'acces_ouvert', 'entitlement_id', v_ent,
                            'enrollment_id', v_enr, 'etat_parcours', v_etat, 'controle', v_pe.controle);
end
$$;

-- 4. Clôture horaire : termine les parcours arrivés au bout, puis démarre les parcours planifiés ----
create or replace function seneve.close_finished_enrollments()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_act uuid[];
begin
  with fini as (
    update seneve.enrollments e set etat = 'terminee'
      from seneve.participants p, seneve.programmes pr
     where p.participant_id = e.participant_id
       and pr.programme_id = e.programme_id
       and e.etat in ('active', 'en_pause')
       and (now() at time zone coalesce(nullif(p.fuseau, ''), 'Africa/Kinshasa'))::date
           > coalesce(e.date_fin_prevue, e.date_debut + (coalesce(pr.duree_jours, 7) - 1))
    returning e.enrollment_id
  )
  select coalesce(array_agg(enrollment_id), '{}') into v_ids from fini;

  if cardinality(v_ids) > 0 then
    update seneve.communications set etat = 'annule', modifie_le = now()
     where enrollment_id = any(v_ids) and etat = 'planifie';
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    select 'systeme', 'parcours_termine', 'enrollment:' || x::text, 'ok', jsonb_build_object('regle', 'fin_de_duree')
      from unnest(v_ids) x;
  end if;

  -- Parcours planifiés : le plus ancien de chaque programme démarre à sa date, si aucun autre n'est en cours.
  with candidats as (
    select distinct on (e.participant_id, e.programme_id) e.enrollment_id
      from seneve.enrollments e
      join seneve.participants p on p.participant_id = e.participant_id
     where e.etat = 'planifiee'
       and e.date_debut <= (now() at time zone coalesce(nullif(p.fuseau, ''), 'Africa/Kinshasa'))::date
       and not exists (select 1 from seneve.enrollments x
                        where x.participant_id = e.participant_id and x.programme_id = e.programme_id
                          and x.etat in ('active', 'en_pause'))
     order by e.participant_id, e.programme_id, e.date_debut, e.enrollment_id
  ), demarre as (
    update seneve.enrollments e set etat = 'active'
      from candidats c
     where e.enrollment_id = c.enrollment_id
    returning e.enrollment_id
  )
  select coalesce(array_agg(enrollment_id), '{}') into v_act from demarre;

  if cardinality(v_act) > 0 then
    insert into seneve.audit_events (acteur, action, objet, resultat, details)
    select 'systeme', 'parcours_demarre', 'enrollment:' || x::text, 'ok', jsonb_build_object('regle', 'parcours_planifie')
      from unnest(v_act) x;
  end if;

  return jsonb_build_object('termines', cardinality(v_ids), 'demarres', cardinality(v_act));
end $$;

-- 5. Remboursement : le parcours planifié de ce paiement est aussi retiré ---------------------------
create or replace function seneve.revoke_purchase(p_id_vente text, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pe    seneve.payment_events%rowtype;
  v_ent   seneve.entitlements%rowtype;
  v_prog  text;
  v_autre uuid;
  v_res   text := 'aucun_droit_actif';
begin
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Motif obligatoire.' using errcode = '22023';
  end if;

  select * into v_pe from seneve.payment_events
   where fournisseur = 'chariow' and id_evenement = btrim(coalesce(p_id_vente, ''))
   for update;
  if not found then
    return jsonb_build_object('resultat', 'introuvable');
  end if;
  if v_pe.statut_traitement = 'revoque' then
    return jsonb_build_object('resultat', 'deja_revoque');
  end if;

  select * into v_ent from seneve.entitlements
   where payment_event_id = v_pe.payment_event_id
   for update;

  if found and v_ent.etat = 'actif' then
    update seneve.entitlements set etat = 'revoque', fin = now()
     where entitlement_id = v_ent.entitlement_id;

    -- Parcours planifié payé par ce paiement : retiré (décision « Accès retiré »).
    update seneve.enrollments set etat = 'annulee'
     where entitlement_id = v_ent.entitlement_id and etat = 'planifiee';

    select programme_id into v_prog from seneve.offers where offre_id = v_ent.offre_id;

    -- Un autre achat actif du même programme ne reprend le parcours que s'il n'a jamais eu le sien
    -- (un achat dont le parcours est terminé, en cours ou planifié ne peut pas servir deux fois).
    select e.entitlement_id into v_autre
      from seneve.entitlements e
      join seneve.offers o on o.offre_id = e.offre_id
     where e.participant_id = v_ent.participant_id
       and e.etat = 'actif'
       and o.programme_id = v_prog
       and e.entitlement_id <> v_ent.entitlement_id
       and not exists (select 1 from seneve.enrollments x where x.entitlement_id = e.entitlement_id)
     order by e.cree_le
     limit 1;

    if not exists (select 1 from seneve.enrollments
                    where entitlement_id = v_ent.entitlement_id and etat in ('active', 'en_pause')) then
      v_res := 'droit_revoque';
    elsif v_autre is not null then
      update seneve.enrollments set entitlement_id = v_autre
       where entitlement_id = v_ent.entitlement_id and etat in ('active', 'en_pause');
      v_res := 'droit_revoque_inscription_conservee';
    else
      update seneve.communications set etat = 'annule', modifie_le = now()
       where etat = 'planifie'
         and enrollment_id in (select enrollment_id from seneve.enrollments
                                where entitlement_id = v_ent.entitlement_id
                                  and etat in ('active', 'en_pause'));
      update seneve.enrollments set etat = 'annulee'
       where entitlement_id = v_ent.entitlement_id and etat in ('active', 'en_pause');
      v_res := 'droit_revoque_inscription_annulee';
    end if;
  end if;

  update seneve.payment_events
     set statut_traitement = 'revoque', email_acheteur = null, traite_le = now()
   where payment_event_id = v_pe.payment_event_id;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('paiement', 'revocation_achat', 'payment_event:' || v_pe.payment_event_id, v_res,
          jsonb_build_object('motif', btrim(p_motif), 'entitlement_id', v_ent.entitlement_id));

  return jsonb_build_object('resultat', v_res);
end
$$;
