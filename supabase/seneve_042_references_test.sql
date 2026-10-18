-- SÉNEVÉ 042 — Test des 7 Racines : référence au livre pour chaque question (cahier n°4, §6 et §15).
-- Source relue le 19/10/2026 : auto-évaluations des chapitres 1 à 7 du livre « Arrête de mendier des miracles »
-- et de « Stop Begging For Miracles » (PDF « LIVRE COMPLET »). Une question = un chapitre, un numéro d'affirmation.
-- Seules les références vides sont remplies : les références déjà écrites (adaptations V2 du 19/10/2026) restent
-- inchangées. Les textes des questions, les versions et le calcul ne changent pas. Relancer ce script ne change rien.
-- Les questions 2 et 7 diffèrent légèrement du livre : elles sont marquées comme adaptations à faire approuver.

with source(ordre, chapitre, numero, adaptation_fr, adaptation_en) as (values
  (1, 1, 1, null, null),
  (2, 1, 2, 'le livre dit « décisions professionnelles importantes »', 'the book says “important professional decisions”'),
  (3, 1, 5, null, null),
  (4, 2, 1, null, null),
  (5, 2, 3, null, null),
  (6, 2, 5, null, null),
  (7, 3, 1, 'le livre dit « quand mon patron n''est pas là »', 'the book says “when my boss is not there”'),
  (8, 3, 3, null, null),
  (9, 3, 5, null, null),
  (10, 4, 2, null, null),
  (11, 4, 3, null, null),
  (12, 4, 5, null, null),
  (13, 5, 1, null, null),
  (14, 5, 2, null, null),
  (15, 5, 3, null, null),
  (16, 6, 1, null, null),
  (17, 6, 4, null, null),
  (18, 6, 5, null, null),
  (19, 7, 2, null, null),
  (20, 7, 4, null, null),
  (21, 7, 5, null, null)
)
update seneve.test_items i
   set reference_livre = case v.langue
     when 'en' then format('Book, Chapter %s, Self-Assessment, statement %s', s.chapitre, s.numero)
       || coalesce(' — adaptation awaiting approval: ' || s.adaptation_en, ' — exact wording')
     else format('Livre, chapitre %s, auto-évaluation, affirmation %s', s.chapitre, s.numero)
       || coalesce(' — adaptation à faire approuver : ' || s.adaptation_fr, ' — formulation exacte du livre')
   end
  from source s, seneve.test_versions v
 where v.test_version_id = i.test_version_id
   and v.test_id = 'TEST_7_RACINES'
   and i.ordre = s.ordre
   and i.reference_livre is null;
