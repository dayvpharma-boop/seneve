-- SÉNEVÉ 046 — Test des 7 Racines : FR V5, 21 questions envoyées par Dr Justin Tshims le 23/10/2026.
-- 3 questions par racine, dans l'ordre des racines (1 à 7). Toutes dans le même sens :
-- « Tout à fait » = racine forte, donc aucune question comptée à l'envers (items_inverses vide).
-- Même échelle que la V4 (« Cela me ressemble… »). FR V4 est archivée, pas supprimée.
-- L'anglais reste en V3. Relancer ce script ne crée rien de plus.
do $$
declare v_new uuid; n int;
begin
  insert into seneve.test_versions (test_id, version, langue, etat, regles, valide_par, date_validation)
  values ('TEST_7_RACINES', 5, 'fr', 'archivee',   -- publiée à la fin, après contrôle
    jsonb_build_object(
      'nb_items', 21, 'items_par_racine', 3, 'echelle_min', 1, 'echelle_max', 5,
      'items_inverses', '[]'::jsonb,
      'consigne', 'Cela me ressemble…',
      'libelles_reponses', jsonb_build_array('Pas du tout','Un peu','À moitié','Beaucoup','Tout à fait'),
      'revision', 'v5_questions_2026_10_23'),
    'Dr Justin Tshims — 21 questions envoyées et demandées en ligne (« Met à jour »), 23/10/2026', now())
  on conflict (test_id, version, langue) do nothing;
  select test_version_id into strict v_new from seneve.test_versions
   where test_id = 'TEST_7_RACINES' and langue = 'fr' and version = 5;

  insert into seneve.test_items (test_version_id, ordre, racine_id, texte, reference_livre)
  select v_new, t.ordre, (t.ordre + 2) / 3, t.texte, null
    from (values
      (1, 'Je commence chaque journée par un temps de prière avant toute autre activité.'),
      (2, 'Je consulte Dieu avant de prendre des décisions importantes.'),
      (3, 'Ma relation avec Dieu ne dépend pas de ma situation financière du moment.'),
      (4, 'Ma dîme est la première dépense que je règle dès que je reçois un revenu.'),
      (5, 'Je donne avec joie et non par obligation ou par peur.'),
      (6, 'Je crois que Dieu peut protéger et multiplier mes ressources.'),
      (7, 'Est-ce que je travaille avec la même qualité quand personne ne me regarde ?'),
      (8, 'Ma conscience est-elle nette de toute pratique malhonnête au travail ?'),
      (9, 'Est-ce que je crois que Dieu peut ouvrir des portes que mes diplômes ne peuvent pas ouvrir ?'),
      (10, 'Je garde ma paix intérieure même lorsque ma situation financière est difficile.'),
      (11, 'Puis-je me réjouir sincèrement quand un frère prospère plus que moi ?'),
      (12, 'Est-ce que ma vie reflète une simplicité intentionnelle ?'),
      (13, 'Je prends régulièrement soin d''une personne isolée ou dans le besoin, selon mes possibilités.'),
      (14, 'J''apporte une aide concrète aux personnes dans le besoin, par mes ressources, mon temps ou mes actions.'),
      (15, 'Est-ce que je donne dans le secret, sans chercher la reconnaissance ?'),
      (16, 'Est-ce que je tiens un carnet de dépenses qui me permet de voir où va mon argent ?'),
      (17, 'Est-ce que je mets régulièrement de l''argent de côté en épargne ?'),
      (18, 'Est-ce que j''accomplis les petites tâches avec le même sérieux que les grandes ?'),
      (19, 'Lorsque je ressens une pression pour décider rapidement, je prends le temps de prier et de rechercher une paix durable avant d''agir.'),
      (20, 'Avant de suivre une impression intérieure, je vérifie qu''elle est cohérente avec la Parole de Dieu.'),
      (21, 'Avant une décision importante, je demande conseil à des personnes sages et compétentes.')
    ) as t(ordre, texte)
  on conflict (test_version_id, ordre) do nothing;

  select count(*) into n from seneve.test_items where test_version_id = v_new;
  if n <> 21 or exists (select 1 from seneve.test_items where test_version_id = v_new
                        group by racine_id having count(*) <> 3) then
    raise exception 'La version 5 (fr) doit contenir 21 questions, 3 par racine.';
  end if;

  update seneve.test_versions set etat = 'archivee'
   where test_id = 'TEST_7_RACINES' and langue = 'fr' and etat = 'publiee' and version <> 5;
  update seneve.test_versions set etat = 'publiee' where test_version_id = v_new;
end $$;
