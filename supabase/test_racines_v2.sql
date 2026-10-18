-- Test des 7 Racines FR V2 : cinq adaptations approuvées le 19/10/2026.
-- V1 archivée reste accessible aux anciennes pages et aux résultats historiques ; anglais inchangé.
do $$
declare v1 uuid; v2 uuid;
begin
  select test_version_id into strict v1 from seneve.test_versions
   where test_id='TEST_7_RACINES' and langue='fr' and version=1;
  if (select count(*) from seneve.test_items where test_version_id=v1) <> 21 then
    raise exception 'La V1 française doit contenir 21 questions.';
  end if;
  -- Une seule version publiée par langue ; l’ancienne reste conservée et utilisable explicitement.
  update seneve.test_versions set etat='archivee' where test_version_id=v1;
  insert into seneve.test_versions(test_id,version,langue,etat,regles,valide_par,date_validation)
  select test_id,2,langue,'publiee',
    regles || jsonb_build_object('revision','cinq_adaptations_2026_10_19','libelles_reponses',jsonb_build_array('Jamais','Rarement','Parfois','Souvent','Toujours')),
    'Dr Justin Tshims — cinq adaptations françaises et libellés validés le 19/10/2026', now()
    from seneve.test_versions where test_version_id=v1
  on conflict(test_id,version,langue) do nothing;
  select test_version_id into strict v2 from seneve.test_versions
   where test_id='TEST_7_RACINES' and langue='fr' and version=2;
  insert into seneve.test_items(test_version_id,ordre,racine_id,texte,reference_livre)
  select v2,ordre,racine_id,
    case ordre when 6 then 'Quand je donne, je le fais avec confiance plutôt que sous la pression de la peur.'
        when 8 then 'Dans mes activités quotidiennes, je choisis l’honnêteté, même lorsque personne ne peut vérifier.'
        when 9 then 'Je pose des démarches concrètes pour avancer, sans attendre que les occasions viennent seules.'
        when 13 then 'Je prends des nouvelles d’une personne seule ou en difficulté et je lui apporte une aide adaptée à mes possibilités.'
        when 17 then 'Je tiens mes petits engagements du quotidien, même lorsqu’ils semblent peu importants.' else texte end,
    case ordre when 6 then 'Adaptation pédagogique du chapitre 2, approuvée par Dr Justin Tshims le 19/10/2026 ; formulation SÉNEVÉ V2, distincte d’une citation littérale.'
        when 8 then 'Adaptation pédagogique du chapitre 3, approuvée par Dr Justin Tshims le 19/10/2026 ; formulation SÉNEVÉ V2, distincte d’une citation littérale.'
        when 9 then 'Adaptation pédagogique du chapitre 3, approuvée par Dr Justin Tshims le 19/10/2026 ; formulation SÉNEVÉ V2, distincte d’une citation littérale.'
        when 13 then 'Adaptation pédagogique du chapitre 5, approuvée par Dr Justin Tshims le 19/10/2026 ; formulation SÉNEVÉ V2, distincte d’une citation littérale.'
        when 17 then 'Adaptation pédagogique du chapitre 6, approuvée par Dr Justin Tshims le 19/10/2026 ; formulation SÉNEVÉ V2, distincte d’une citation littérale.' else reference_livre end
  from seneve.test_items where test_version_id=v1
  on conflict(test_version_id,ordre) do nothing;
  if (select count(*) from seneve.test_items where test_version_id=v2)<>21
     or exists(select 1 from seneve.test_items i where i.test_version_id=v2 and
       i.texte <> (select case j.ordre when 6 then 'Quand je donne, je le fais avec confiance plutôt que sous la pression de la peur.'
        when 8 then 'Dans mes activités quotidiennes, je choisis l’honnêteté, même lorsque personne ne peut vérifier.'
        when 9 then 'Je pose des démarches concrètes pour avancer, sans attendre que les occasions viennent seules.'
        when 13 then 'Je prends des nouvelles d’une personne seule ou en difficulté et je lui apporte une aide adaptée à mes possibilités.'
        when 17 then 'Je tiens mes petits engagements du quotidien, même lorsqu’ils semblent peu importants.' else j.texte end
         from seneve.test_items j where j.test_version_id=v1 and j.ordre=i.ordre)) then
    raise exception 'Le référentiel V2 ne correspond pas aux formulations validées.';
  end if;
end $$;

CREATE OR REPLACE FUNCTION seneve.submit_test_result_versioned(p_langue text, p_reponses integer[], p_version integer, p_source text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- Mêmes règles que la page : choix libre si tout vaut 1, tout est point d'appui, ou tout est égal.
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
end $function$
;
revoke all on function seneve.submit_test_result_versioned(text,integer[],integer,text) from public;
grant execute on function seneve.submit_test_result_versioned(text,integer[],integer,text) to anon, authenticated;

-- Compatibilité : une page ancienne continue d'enregistrer les réponses sous la V1.
create or replace function seneve.submit_test_result(p_langue text,p_reponses integer[],p_source text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select seneve.submit_test_result_versioned(p_langue,p_reponses,1,p_source);
$$;
