-- SÉNEVÉ 044 — Test des 7 Racines : FR V4 « l'âme et l'esprit », validée par Dr Justin Tshims le 22/10/2026.
-- 1. 21 nouvelles affirmations (3 par racine : le miroir, le cœur, le pas), ancrées dans le livre.
-- 2. Les 7 « miroirs » (affirmations 1, 4, 7, 10, 13, 16, 19) sont comptés à l'envers : score = 6 - réponse.
--    La liste est écrite dans regles.items_inverses : le calcul la lit, version par version.
--    Les versions 1 à 3 n'ont pas cette liste : leur calcul ne change pas.
-- 3. Échelle « Cela me ressemble… » : Pas du tout, Un peu, À moitié, Beaucoup, Tout à fait.
-- 4. La question libre sur le manteau n'est pas enregistrée : elle n'existe pas dans la base.
-- 5. FR V3 est archivée, pas supprimée : les résultats déjà enregistrés gardent leur version,
--    et une page encore ouverte en V3 peut toujours enregistrer en V3. L'anglais reste en V3.
-- Les réponses brutes sont enregistrées telles quelles ; les totaux enregistrés sont les totaux ajustés.
-- Relancer ce script ne crée rien de plus.

-- A. Calcul : lecture des affirmations inversées de la version.
create or replace function seneve.submit_test_result_versioned(p_langue text, p_reponses integer[], p_version integer, p_source text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_langue text := case when p_langue = 'en' then 'en' else 'fr' end;
  v_version uuid;
  v_regles jsonb;
  v_aj int[];
  v_totaux int[] := array[0,0,0,0,0,0,0];
  v_min int; v_max int; v_faibles int[]; v_choix int[]; v_retenue int; v_id uuid;
  v_all_one boolean; v_all_support boolean;
begin
  if p_reponses is null or array_ndims(p_reponses) is distinct from 1 or array_lower(p_reponses, 1) is distinct from 1
     or array_length(p_reponses, 1) is distinct from 21
     or exists (select 1 from unnest(p_reponses) x where x is null or x < 1 or x > 5) then
    raise exception 'Réponses invalides.' using errcode = '22023';
  end if;
  select test_version_id, regles into v_version, v_regles from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = v_langue and version = p_version
     and etat in ('publiee','archivee');
  if v_version is null then
    raise exception 'Aucune version publiée du test.' using errcode = 'P0001';
  end if;
  v_aj := seneve.test_reponses_ajustees(p_reponses, v_regles);
  for k in 1..7 loop
    v_totaux[k] := v_aj[3*k-2] + v_aj[3*k-1] + v_aj[3*k];
  end loop;
  select min(t), max(t) into v_min, v_max from unnest(v_totaux) t;
  select array_agg(k order by k) into v_faibles from generate_subscripts(v_totaux, 1) k where v_totaux[k] = v_min;
  v_all_one := not exists (select 1 from unnest(v_aj) x where x <> 1);
  v_all_support := v_min >= 12;
  -- Mêmes règles que la page : choix libre si tout vaut 1 (après inversion), tout est point d'appui, ou tout est égal.
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

-- Réponses ajustées : 6 - réponse pour les affirmations listées dans regles.items_inverses (numérotées de 1 à 21).
create or replace function seneve.test_reponses_ajustees(p_reponses integer[], p_regles jsonb)
 returns integer[]
 language sql
 immutable
 set search_path to ''
as $function$
  select array_agg(case when coalesce(p_regles -> 'items_inverses', '[]'::jsonb) @> to_jsonb(o::int)
                        then 6 - x else x end order by o)
    from unnest(p_reponses) with ordinality a(x, o)
$function$;

create or replace function seneve.choose_test_root(p_result_id uuid, p_racine integer)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r record; v_min int; v_max int; v_rep int[]; v_tot int[]; v_regles jsonb;
begin
  select * into r from seneve.test_results where result_id = p_result_id;
  if r is null or r.cree_le < now() - interval '24 hours' then
    raise exception 'Choix impossible pour ce résultat.' using errcode = 'P0001';
  end if;
  if p_racine is null or p_racine < 1 or p_racine > 7 then
    raise exception 'Racine invalide.' using errcode = '22023';
  end if;
  select regles into v_regles from seneve.test_versions where test_version_id = r.test_version_id;
  select array_agg(x::int order by o) into v_rep from jsonb_array_elements_text(r.reponses) with ordinality a(x, o);
  v_rep := seneve.test_reponses_ajustees(v_rep, v_regles);
  select array_agg(x::int order by o) into v_tot from jsonb_array_elements_text(r.totaux) with ordinality a(x, o);
  select min(t), max(t) into v_min, v_max from unnest(v_tot) t;
  if not (v_min >= 12 or v_min = v_max or not exists (select 1 from unnest(v_rep) x where x <> 1))
     and v_tot[p_racine] <> v_min then
    raise exception 'Cette racine ne fait pas partie du choix proposé.' using errcode = '22023';
  end if;
  update seneve.test_results set racine_retenue = p_racine where result_id = p_result_id;
end $function$;

revoke all on function seneve.test_reponses_ajustees(integer[], jsonb) from public, anon, authenticated;

-- B. Version FR 4 : 21 affirmations validées le 22/10/2026.
do $$
declare v_new uuid; n int;
begin
  insert into seneve.test_versions (test_id, version, langue, etat, regles, valide_par, date_validation)
  values ('TEST_7_RACINES', 4, 'fr', 'archivee',   -- publiée à la fin, après contrôle
    jsonb_build_object(
      'nb_items', 21, 'items_par_racine', 3, 'echelle_min', 1, 'echelle_max', 5,
      'items_inverses', jsonb_build_array(1,4,7,10,13,16,19),
      'consigne', 'Cela me ressemble…',
      'libelles_reponses', jsonb_build_array('Pas du tout','Un peu','À moitié','Beaucoup','Tout à fait'),
      'revision', 'v4_ame_esprit_2026_10_22'),
    'Dr Justin Tshims — proposition V4 validée (« Je valide »), 22/10/2026', now())
  on conflict (test_id, version, langue) do nothing;
  select test_version_id into strict v_new from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = 'fr' and version = 4;

  insert into seneve.test_items (test_version_id, ordre, racine_id, texte, reference_livre)
  select v_new, t.ordre, (t.ordre + 2) / 3, t.texte, t.ref
    from (values
      (1, 'Je demande à Dieu de bénir mes plans plus souvent que je ne Lui demande quels sont Ses plans.', 'Miroir, compté à l''envers — chapitre 1, témoignage : « je priais pour que Dieu bénisse mes plans. Je ne priais pas pour connaître Ses plans »'),
      (2, 'Mes décisions réelles (mon temps, mon argent, mon téléphone) montrent que Dieu passe vraiment en premier.', 'Cœur — chapitre 1, ouverture : « ce que révèlent tes décisions, ton agenda, ton portefeuille, ton téléphone »'),
      (3, 'Ce que Dieu m''a déjà demandé, je l''ai commencé, sans le remettre à plus tard.', 'Pas — chapitre 1, clé 1.7 : « qu''est-ce que Dieu t''a déjà demandé, que tu n''as pas encore fait ? »'),
      (4, 'Je donne à Dieu ce qui reste, une fois que j''ai payé tous les autres.', 'Miroir, compté à l''envers — chapitre 2, frère Évariste : « tu fais de Dieu le dernier créancier de ta vie »'),
      (5, 'Quand je donne, ce n''est pas la peur de manquer qui me gouverne.', 'Cœur — chapitre 2, Cécile : « j''ai arrêté d''avoir peur de manquer »'),
      (6, 'Il m''arrive de donner quelque chose qui me coûte vraiment, et pas seulement mon surplus.', 'Pas — chapitre 2, clé 2.4, la veuve aux deux pites ; chapitre 4, clé 4.3'),
      (7, 'J''attends une « grande porte » et je néglige le travail plus modeste qui est devant moi.', 'Miroir, compté à l''envers — chapitre 3, Gaston : « Quelle porte trop petite refuses-tu ? »'),
      (8, 'Dans mon travail ou mon activité, je fais de mon mieux, que quelqu''un me regarde ou non.', 'Cœur — chapitre 3, Richard : « Celui que je sers voit tout » ; Colossiens 3:23'),
      (9, 'Je refuse un gain, même petit, s''il demande un mensonge.', 'Pas — chapitre 3, clé 3.2 et le certificat refusé'),
      (10, 'Ma paix intérieure monte et descend avec mon argent.', 'Miroir, compté à l''envers — chapitre 4, auto-évaluation, question 1'),
      (11, 'Je cherche Dieu autant quand tout va bien que lorsque je manque.', 'Cœur — chapitre 4, Serge : « sais-tu encore prier comme tu priais quand tu n''avais rien ? »'),
      (12, 'Si Dieu me demandait ce à quoi je tiens le plus, je pourrais ouvrir les mains.', 'Pas — chapitre 4, clé 4.4 : « C''est exactement là que se trouve ton Isaac »'),
      (13, 'Je remarque les besoins autour de moi, mais je passe souvent mon chemin.', 'Miroir, compté à l''envers — chapitre 5, prière : « toutes les fois où j''ai détourné la tête »'),
      (14, 'Dans la personne en détresse, je vois quelqu''un que le Christ met sur ma route.', 'Cœur — chapitre 5, Matthieu 25:40'),
      (15, 'Je donne du temps, une présence ou une aide sans que personne ne le sache.', 'Pas — chapitre 5, clés 5.4 et 5.5 : « Le temps est une monnaie »'),
      (16, 'Je me dis que je serai fidèle quand j''aurai plus.', 'Miroir, compté à l''envers — chapitre 6, prière : « Pardonne-moi d''avoir attendu d''avoir plus pour commencer à être fidèle »'),
      (17, 'Je sais où va mon argent, jusqu''aux petites dépenses.', 'Cœur — chapitre 6, clé 6.4 : « la lumière d''un carnet »'),
      (18, 'Je prends le temps de remarquer le visage triste de quelqu''un à côté de moi.', 'Pas — chapitre 6, clé 6.3 : Joseph et « deux visages tristes »'),
      (19, 'Quand on me presse de décider, je décide vite, de peur de rater.', 'Miroir, compté à l''envers — chapitre 7, clé 7.3 : « la peur de rater »'),
      (20, 'Ma journée commence par un moment de silence avec Dieu, avant mon téléphone.', 'Cœur — chapitre 7, clé 7.1 et auto-évaluation, question 3'),
      (21, 'Quand la paix est absente, je sais attendre, même si les autres ne me comprennent pas.', 'Pas — chapitre 1, Marie-Claire ; chapitre 7, clé 7.4')
    ) as t(ordre, texte, ref)
  on conflict (test_version_id, ordre) do nothing;

  -- Contrôle : 21 affirmations, 3 par racine, sinon tout est annulé.
  select count(*) into n from seneve.test_items where test_version_id = v_new;
  if n <> 21 or exists (select 1 from seneve.test_items where test_version_id = v_new
                        group by racine_id having count(*) <> 3) then
    raise exception 'La version 4 (fr) doit contenir 21 affirmations, 3 par racine.';
  end if;

  -- Une seule version publiée par langue : FR V3 est archivée, puis FR V4 est publiée.
  update seneve.test_versions set etat = 'archivee'
   where test_id = 'TEST_7_RACINES' and langue = 'fr' and etat = 'publiee' and version <> 4;
  update seneve.test_versions set etat = 'publiee' where test_version_id = v_new;
end $$;
