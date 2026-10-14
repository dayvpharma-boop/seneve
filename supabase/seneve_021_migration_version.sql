-- SÉNEVÉ — migration 021 : changement explicite de version d'une inscription (14/10/2026)
-- Décision de Dr Justin Tshims : « Oui je valide » (14/10/2026, 12 h 31) — faire passer ses deux inscriptions
-- de test du livre 14 jours (FR et EN) de la version 1 à la version 2 (trois moments par jour).
--
-- Règle du cahier des charges : chaque inscription garde sa version jusqu'à une migration explicite,
-- avec une possibilité de restauration. Cette fonction est cette migration explicite :
--  * réservée à n8n / à l'équipe technique (service_role) ;
--  * la version cible doit être publiée ou archivée (le retour à une version archivée sert de restauration) ;
--  * chaque activité déjà utilisée par l'inscription (états, journal) doit avoir son équivalent exact dans la
--    version cible (même jour, même numéro de message, même type, même consigne), sinon rien n'est changé ;
--  * les états et les entrées de journal sont rattachés aux activités équivalentes ;
--  * l'historique des événements de progression (progress_events) et des communications n'est pas réécrit ;
--  * la correspondance complète est conservée dans audit_events, pour pouvoir revenir en arrière.
--
-- Retour arrière : select seneve.migrer_inscription_version('<enrollment_id>', <ancienne version>, '<motif>');

create or replace function seneve.migrer_inscription_version(p_enrollment_id uuid, p_version int, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enr seneve.enrollments%rowtype;
  v_etat_cible text;
  v_manquantes jsonb;
  v_correspondances jsonb;
  v_etats int;
  v_journaux int;
begin
  if coalesce(trim(p_motif), '') = '' then
    return jsonb_build_object('resultat', 'refusee', 'erreur', 'motif absent');
  end if;
  select * into v_enr from seneve.enrollments where enrollment_id = p_enrollment_id for update;
  if not found then
    return jsonb_build_object('resultat', 'refusee', 'erreur', 'inscription introuvable');
  end if;
  if v_enr.version = p_version then
    return jsonb_build_object('resultat', 'inchangee', 'version', p_version);
  end if;
  select etat into v_etat_cible from seneve.programme_versions
   where programme_id = v_enr.programme_id and version = p_version;
  if v_etat_cible is null or v_etat_cible not in ('publiee', 'archivee') then
    return jsonb_build_object('resultat', 'refusee', 'erreur', 'version cible ni publiée ni archivée');
  end if;

  -- Activités utilisées par l'inscription et leur équivalent dans la version cible.
  create temporary table _corr on commit drop as
  with utilisees as (
    select activity_id from seneve.activity_state where enrollment_id = p_enrollment_id
    union
    select activity_id from seneve.journal_entries where enrollment_id = p_enrollment_id and activity_id is not null
  )
  select u.activity_id as ancienne, c.jour, c.numero_message, a.type_activite, a.consigne,
         (select a2.activity_id
            from seneve.activities a2 join seneve.contents c2 on c2.content_id = a2.content_id
           where c2.programme_id = v_enr.programme_id and c2.version = p_version
             and c2.jour = c.jour and c2.numero_message = c.numero_message
             and a2.type_activite = a.type_activite and a2.consigne = a.consigne
           limit 1) as nouvelle,
         (c.programme_id = v_enr.programme_id and c.version = v_enr.version) as de_la_version
    from utilisees u
    join seneve.activities a on a.activity_id = u.activity_id
    join seneve.contents c on c.content_id = a.content_id;

  select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'message', numero_message, 'type', type_activite)), '[]'::jsonb)
    into v_manquantes from _corr where nouvelle is null or not de_la_version;
  if jsonb_array_length(v_manquantes) > 0 then
    drop table _corr;
    return jsonb_build_object('resultat', 'refusee', 'erreur', 'activités sans équivalent exact dans la version cible',
                              'activites', v_manquantes);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('ancienne', ancienne, 'nouvelle', nouvelle, 'jour', jour,
                                               'message', numero_message, 'type', type_activite)), '[]'::jsonb)
    into v_correspondances from _corr;

  -- La version change d'abord : le contrôle du journal vérifie l'activité par rapport à la version de l'inscription.
  update seneve.enrollments set version = p_version where enrollment_id = p_enrollment_id;
  update seneve.activity_state s set activity_id = c.nouvelle
    from _corr c where s.enrollment_id = p_enrollment_id and s.activity_id = c.ancienne;
  get diagnostics v_etats = row_count;
  update seneve.journal_entries j set activity_id = c.nouvelle
    from _corr c where j.enrollment_id = p_enrollment_id and j.activity_id = c.ancienne;
  get diagnostics v_journaux = row_count;
  drop table _corr;

  insert into seneve.audit_events (acteur, action, objet, resultat, details)
  values ('equipe_technique', 'migration_version', 'enrollment:' || p_enrollment_id::text, 'ok',
          jsonb_build_object('programme_id', v_enr.programme_id, 'de', v_enr.version, 'vers', p_version,
                             'motif', p_motif, 'etats_deplaces', v_etats, 'journaux_deplaces', v_journaux,
                             'correspondances', v_correspondances));
  return jsonb_build_object('resultat', 'migree', 'de', v_enr.version, 'vers', p_version,
                            'etats_deplaces', v_etats, 'journaux_deplaces', v_journaux);
end $$;

revoke all on function seneve.migrer_inscription_version(uuid, int, text) from public, anon, authenticated;
grant execute on function seneve.migrer_inscription_version(uuid, int, text) to service_role;
