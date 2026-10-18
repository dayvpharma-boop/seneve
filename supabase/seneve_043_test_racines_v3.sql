-- SÉNEVÉ 043 — Test des 7 Racines : FR V3 et EN V2, décisions de Dr Justin Tshims du 19/10/2026.
-- 1. Questions 2 et 7 : on reprend exactement les mots du livre (auto-évaluations des chapitres 1 et 3).
-- 2. Seuils des catégories : inchangés (3-6, 7-11, 12-15).
-- 3. Anglais, question 13 : même adaptation que la V2 française (personne seule ou en difficulté).
-- Les versions précédentes (FR V2, EN V1) sont archivées, pas supprimées : les résultats déjà enregistrés
-- gardent leur version, et une page ancienne peut encore enregistrer sous sa version. Calcul inchangé.
-- Relancer ce script ne crée rien de plus.

create or replace function pg_temp.nouvelle_version_test(p_langue text, p_depuis int, p_vers int,
  p_textes jsonb, p_refs jsonb, p_valide_par text) returns void language plpgsql as $$
declare v_old uuid; v_new uuid; n int;
begin
  select test_version_id into strict v_old from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = p_langue and version = p_depuis;
  if (select count(*) from seneve.test_items where test_version_id = v_old) <> 21 then
    raise exception 'La version % (%) doit contenir 21 questions.', p_depuis, p_langue;
  end if;
  insert into seneve.test_versions (test_id, version, langue, etat, regles, valide_par, date_validation)
  select test_id, p_vers, langue, 'archivee', regles, p_valide_par, now()   -- publiée à la fin, après contrôle
    from seneve.test_versions where test_version_id = v_old
  on conflict (test_id, version, langue) do nothing;
  select test_version_id into strict v_new from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = p_langue and version = p_vers;
  insert into seneve.test_items (test_version_id, ordre, racine_id, texte, reference_livre)
  select v_new, ordre, racine_id,
         coalesce(p_textes ->> ordre::text, texte),
         coalesce(p_refs ->> ordre::text, reference_livre)
    from seneve.test_items where test_version_id = v_old
  on conflict (test_version_id, ordre) do nothing;
  -- Contrôle : 21 questions et textes attendus, sinon tout est annulé.
  select count(*) into n from seneve.test_items i join seneve.test_items o
      on o.test_version_id = v_old and o.ordre = i.ordre
   where i.test_version_id = v_new and i.texte = coalesce(p_textes ->> i.ordre::text, o.texte);
  if n <> 21 then
    raise exception 'La version % (%) ne correspond pas aux formulations décidées.', p_vers, p_langue;
  end if;
  -- Une seule version publiée par langue : l'ancienne est archivée, puis la nouvelle est publiée.
  update seneve.test_versions set etat = 'archivee'
   where test_id = 'TEST_7_RACINES' and langue = p_langue and etat = 'publiee' and version <> p_vers;
  update seneve.test_versions set etat = 'publiee' where test_version_id = v_new;
end $$;

select pg_temp.nouvelle_version_test('fr', 2, 3,
  jsonb_build_object(
    '2', 'Je consulte Dieu avant de prendre des décisions professionnelles importantes.',
    '7', 'Est-ce que je travaille avec la même qualité quand mon patron n''est pas là ?'),
  jsonb_build_object(
    '2', 'Livre, chapitre 1, auto-évaluation, affirmation 2 — formulation exacte du livre (décision de Dr Justin Tshims, 19/10/2026)',
    '7', 'Livre, chapitre 3, auto-évaluation, affirmation 1 — formulation exacte du livre (décision de Dr Justin Tshims, 19/10/2026)'),
  'Dr Justin Tshims — questions 2 et 7 reprises du livre, 19/10/2026');

select pg_temp.nouvelle_version_test('en', 1, 2,
  jsonb_build_object(
    '2', 'I consult God before making important professional decisions.',
    '7', 'Do I work with the same quality when my boss is not there?',
    '13', 'I check on a lonely person or someone in difficulty and offer help suited to my means.'),
  jsonb_build_object(
    '2', 'Book, Chapter 1, Self-Assessment, statement 2 — exact wording (decision by Dr Justin Tshims, 19/10/2026)',
    '7', 'Book, Chapter 3, Self-Assessment, statement 1 — exact wording (decision by Dr Justin Tshims, 19/10/2026)',
    '13', 'Adaptation of Chapter 5 approved by Dr Justin Tshims on 19/10/2026 (same change as French V2); English wording translated from the French, to be reread.'),
  'Dr Justin Tshims — questions 2 and 7 from the book, question 13 adapted as in French V2, 19/10/2026');
