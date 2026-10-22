-- SÉNEVÉ 044 — retour arrière (à n'utiliser que si la V4 doit être retirée).
-- Remet le calcul tel qu'il était avant le 22/10/2026 (copié depuis la base, identique sur seneve-test et seneve-prod),
-- puis republie FR V3. FR V4 reste archivée avec ses résultats : rien n'est supprimé.
-- Attention : après ce retour, il faut aussi remettre TEST_VERSIONS.fr à 3 sur le site.

create or replace function seneve.choose_test_root(p_result_id uuid, p_racine integer)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r record; v_min int; v_max int; v_rep int[]; v_tot int[];
begin
  select * into r from seneve.test_results where result_id = p_result_id;
  if r is null or r.cree_le < now() - interval '24 hours' then
    raise exception 'Choix impossible pour ce résultat.' using errcode = 'P0001';
  end if;
  if p_racine is null or p_racine < 1 or p_racine > 7 then
    raise exception 'Racine invalide.' using errcode = '22023';
  end if;
  select array_agg(x::int order by o) into v_rep from jsonb_array_elements_text(r.reponses) with ordinality a(x, o);
  select array_agg(x::int order by o) into v_tot from jsonb_array_elements_text(r.totaux) with ordinality a(x, o);
  select min(t), max(t) into v_min, v_max from unnest(v_tot) t;
  if not (v_min >= 12 or v_min = v_max or not exists (select 1 from unnest(v_rep) x where x <> 1))
     and v_tot[p_racine] <> v_min then
    raise exception 'Cette racine ne fait pas partie du choix proposé.' using errcode = '22023';
  end if;
  update seneve.test_results set racine_retenue = p_racine where result_id = p_result_id;
end $function$;

create or replace function seneve.submit_test_result_versioned(p_langue text, p_reponses integer[], p_version integer, p_source text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_langue text := case when p_langue = 'en' then 'en' else 'fr' end;
  v_version uuid;
  v_totaux int[] := array[0,0,0,0,0,0,0];
  v_min int; v_max int; v_faibles int[]; v_choix int[]; v_retenue int; v_id uuid;
  v_all_one boolean; v_all_support boolean;
begin
  if p_reponses is null or array_ndims(p_reponses) is distinct from 1 or array_lower(p_reponses, 1) is distinct from 1
     or array_length(p_reponses, 1) is distinct from 21
     or exists (select 1 from unnest(p_reponses) x where x is null or x < 1 or x > 5) then
    raise exception 'Réponses invalides.' using errcode = '22023';
  end if;
  select test_version_id into v_version from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = v_langue and version = p_version
     and etat in ('publiee','archivee');
  if v_version is null then
    raise exception 'Aucune version publiée du test.' using errcode = 'P0001';
  end if;
  for k in 1..7 loop
    v_totaux[k] := p_reponses[3*k-2] + p_reponses[3*k-1] + p_reponses[3*k];
  end loop;
  select min(t), max(t) into v_min, v_max from unnest(v_totaux) t;
  select array_agg(k order by k) into v_faibles from generate_subscripts(v_totaux, 1) k where v_totaux[k] = v_min;
  v_all_one := not exists (select 1 from unnest(p_reponses) x where x <> 1);
  v_all_support := v_min >= 12;
  if v_all_one or v_all_support or v_min = v_max then
    v_choix := array[1,2,3,4,5,6,7];
  elsif array_length(v_faibles, 1) > 1 then
    v_choix := v_faibles;
  else
    v_retenue := v_faibles[1];
  end if;
  insert into seneve.test_results (test_version_id, reponses, totaux, racine_retenue, langue, source)
  values (v_version, to_jsonb(p_reponses), to_jsonb(v_totaux), v_retenue, v_langue, seneve.clean_source(p_source))
  returning result_id into v_id;
  return jsonb_build_object('result_id', v_id, 'totaux', to_jsonb(v_totaux), 'racine_retenue', v_retenue, 'choix', to_jsonb(coalesce(v_choix, '{}'::int[])));
end $function$;

update seneve.test_versions set etat = 'archivee' where test_id = 'TEST_7_RACINES' and langue = 'fr' and version = 4;
update seneve.test_versions set etat = 'publiee' where test_id = 'TEST_7_RACINES' and langue = 'fr' and version = 3;
