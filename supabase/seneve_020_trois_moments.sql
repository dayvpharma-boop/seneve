-- SÉNEVÉ — migration 020 : trois moments par jour (14/10/2026)
-- Décision de Dr Justin Tshims : « A » (14/10/2026, 12 h 10) — afficher sur le site les messages 2 et 3
-- de l'accompagnement du livre 14 jours, déjà validés dans la feuille CONTENUS.
--
-- Ajouts uniquement, rien n'est modifié ni supprimé :
--  1. programmes.heures_messages : horaires des moments (ex. {08:00,13:00,19:00}), lus dans PROGRAMMES.
--     Vide = tous les moments du jour sont visibles dès l'ouverture du jour.
--  2. publish_programme_moments : publie une version avec 1 à 3 contenus par jour.
--     La fonction publish_programme existante reste inchangée.
--     Règles : une version publiée ne se modifie pas ; chaque jour a exactement les messages 1..N ;
--     l'action et la question du jour appartiennent au message 1 (une seule action par jour) ;
--     une publication invalide est bloquée et enregistrée avec ses erreurs.
--
-- Correction appliquée le même jour (migration seneve_020b_correction_messages) : messages d'erreur
-- ajoutés avec array_append (un texte seul était lu comme un tableau).
--
-- Retour arrière : drop function seneve.publish_programme_moments(text, text, text, text, int, int, text[], text, int, text, jsonb);
--                  alter table seneve.programmes drop column heures_messages;

alter table seneve.programmes add column if not exists heures_messages text[];

create or replace function seneve.publish_programme_moments(
  p_programme_id text, p_nom text, p_type_parcours text, p_langue text,
  p_duree_jours int, p_messages_par_jour int, p_heures text[],
  p_source_livre text, p_version int, p_valide_par text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_erreurs text[] := '{}';
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
  v_item jsonb;
  v_content uuid;
  v_precedente int;
  v_n int := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  v_attendu int;
  v_numero int;
begin
  -- Contrôles du lot
  if p_langue is null or p_langue not in ('fr','en') then v_erreurs := array_append(v_erreurs, ('langue invalide')::text); end if;
  if p_duree_jours is null or p_duree_jours < 1 then v_erreurs := array_append(v_erreurs, ('durée invalide')::text); end if;
  if p_messages_par_jour is null or p_messages_par_jour not between 1 and 3 then
    v_erreurs := array_append(v_erreurs, ('nombre de messages par jour invalide (1 à 3)')::text); end if;
  if p_heures is not null and (
       coalesce(array_length(p_heures, 1), 0) is distinct from p_messages_par_jour
       or exists (select 1 from unnest(p_heures) h where h is null or h !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) then
    v_erreurs := array_append(v_erreurs, ('horaires invalides (un horaire HH:MM par message)')::text); end if;
  v_attendu := coalesce(p_duree_jours, 0) * coalesce(p_messages_par_jour, 0);
  if v_n <> v_attendu then
    v_erreurs := array_append(v_erreurs, (format('%s contenus reçus pour %s attendus (%s jours × %s messages)',
                                     v_n, v_attendu, p_duree_jours, p_messages_par_jour))::text); end if;
  if exists (select 1 from jsonb_array_elements(v_items) e
              where case when coalesce(e->>'jour','') ~ '^[0-9]{1,4}$' and coalesce(e->>'numero','') ~ '^[0-9]{1,2}$'
                         then (e->>'jour')::int not between 1 and coalesce(p_duree_jours, 0)
                              or (e->>'numero')::int not between 1 and coalesce(p_messages_par_jour, 0)
                         else true end) then
    v_erreurs := array_append(v_erreurs, ('jour ou numéro de message hors limites')::text); end if;
  if (select count(distinct (e->>'jour') || '-' || (e->>'numero')) from jsonb_array_elements(v_items) e) <> v_n then
    v_erreurs := array_append(v_erreurs, ('jour et numéro de message en double')::text); end if;
  if exists (select 1 from jsonb_array_elements(v_items) e
              where coalesce(trim(e->>'texte'),'') = '' or coalesce(trim(e->>'legacy'),'') = '') then
    v_erreurs := array_append(v_erreurs, ('texte ou identifiant manquant')::text); end if;
  if exists (select 1 from jsonb_array_elements(v_items) e group by e->>'legacy' having count(*) > 1) then
    v_erreurs := array_append(v_erreurs, ('identifiant de contenu en double')::text); end if;
  if exists (select 1 from jsonb_array_elements(v_items) e
              where e->>'numero' = '1' and coalesce(trim(e->>'action'),'') = '') then
    v_erreurs := array_append(v_erreurs, ('action manquante pour le message 1')::text); end if;
  if exists (select 1 from jsonb_array_elements(v_items) e
              where e->>'numero' <> '1' and (coalesce(trim(e->>'action'),'') <> '' or coalesce(trim(e->>'question'),'') <> '')) then
    v_erreurs := array_append(v_erreurs, ('action ou question prévue hors du message 1 (une seule action par jour)')::text); end if;
  if exists (select 1 from seneve.programme_versions where programme_id = p_programme_id and version = p_version) then
    v_erreurs := array_append(v_erreurs, (format('la version %s existe déjà (une version publiée ne se modifie pas)', p_version))::text); end if;
  if coalesce(trim(p_valide_par),'') = '' then v_erreurs := array_append(v_erreurs, ('preuve de validation absente')::text); end if;

  if array_length(v_erreurs, 1) > 0 then
    insert into seneve.publications (programme_id, version, langue, demande_par, resultat, erreurs)
    values (p_programme_id, coalesce(p_version, 0), coalesce(p_langue, 'fr'), p_valide_par, 'bloquee', to_jsonb(v_erreurs));
    return jsonb_build_object('resultat', 'bloquee', 'erreurs', to_jsonb(v_erreurs));
  end if;

  insert into seneve.programmes (programme_id, nom, type_parcours, langue, duree_jours, messages_par_jour, source_livre, heures_messages)
  values (p_programme_id, p_nom, p_type_parcours, p_langue, p_duree_jours, p_messages_par_jour, p_source_livre, p_heures)
  on conflict (programme_id) do update set nom = excluded.nom, duree_jours = excluded.duree_jours,
    messages_par_jour = excluded.messages_par_jour, source_livre = excluded.source_livre,
    heures_messages = excluded.heures_messages;

  insert into seneve.programme_versions (programme_id, version, etat, valide_par, date_validation)
  values (p_programme_id, p_version, 'approuvee', p_valide_par, now());

  for v_item in select * from jsonb_array_elements(v_items) order by (value->>'jour')::int, (value->>'numero')::int loop
    v_numero := (v_item->>'numero')::int;
    insert into seneve.contents (legacy_contenu_id, programme_id, version, langue, jour, numero_message, theme, titre,
                                 explication, texte_officiel, type_texte, reference_livre)
    values (v_item->>'legacy', p_programme_id, p_version, p_langue, (v_item->>'jour')::int, v_numero,
            v_item->>'theme', v_item->>'theme', nullif(v_item->>'expl',''), v_item->>'texte', 'adaptation', nullif(v_item->>'ref',''))
    returning content_id into v_content;
    if v_numero = 1 then
      insert into seneve.activities (content_id, type_activite, consigne, obligatoire, note_source)
      values (v_content, 'action', v_item->>'action', true, nullif(v_item->>'note',''));
      if coalesce(trim(v_item->>'question'),'') <> '' then
        insert into seneve.activities (content_id, type_activite, consigne, obligatoire)
        values (v_content, 'question', v_item->>'question', false);
      end if;
    end if;
  end loop;

  -- Activation : l'ancienne version publiée est archivée (les inscriptions existantes la gardent).
  select version into v_precedente from seneve.programme_versions where programme_id = p_programme_id and etat = 'publiee';
  update seneve.programme_versions set etat = 'archivee' where programme_id = p_programme_id and etat = 'publiee';
  update seneve.programme_versions set etat = 'publiee', publiee_le = now() where programme_id = p_programme_id and version = p_version;

  insert into seneve.publications (programme_id, version, langue, demande_par, resultat, date_publication, version_precedente)
  values (p_programme_id, p_version, p_langue, p_valide_par, 'reussie', now(), v_precedente);
  return jsonb_build_object('resultat', 'reussie', 'contenus', v_n, 'version_precedente', v_precedente);
end $$;

revoke all on function seneve.publish_programme_moments(text, text, text, text, int, int, text[], text, int, text, jsonb) from public, anon, authenticated;
grant execute on function seneve.publish_programme_moments(text, text, text, text, int, int, text[], text, int, text, jsonb) to service_role;
