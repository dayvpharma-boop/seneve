-- SÉNEVÉ 062 — Une phrase propre à chaque habitude (décision de Dr Justin du 04/11/2026, « Oui, applique »).
-- Les 13 habitudes quotidiennes portaient la même consigne générique (« Déclare uniquement ce que tu as réellement
-- préparé ou pratiqué, selon tes possibilités. ») sur les 181 jours. Chacune reçoit sa phrase, en français et en anglais.
-- Seules les activités qui portent encore la phrase générique sont modifiées ; cultes et dîme sont inchangés.
-- Le rappel d'honnêteté reste affiché une fois en bas de la journée (« Tes déclarations décrivent ta pratique »).
-- Retour arrière en fin de fichier.

with phrases(langue, habit_key, critere) as (values
 ('fr','reveil','Lève-toi à l''heure choisie et offre à Dieu tes premières pensées.'),
 ('fr','gratitude_matin','Dis ou écris trois raisons de remercier Dieu ce matin.'),
 ('fr','priere_matin','Prie l''Amidah du matin et remets ta journée entre les mains du Roi.'),
 ('fr','bible_matin','Lis la Bible du matin et garde un verset avec toi pour la journée.'),
 ('fr','exercice','Bouge selon tes forces : ton corps est le temple du Saint-Esprit.'),
 ('fr','lecture_pro','Lis pour grandir dans ton métier : la fidélité se vit aussi dans le travail.'),
 ('fr','priere_midi','Fais une pause à midi pour prier l''Amidah et revenir à l''essentiel.'),
 ('fr','predication','Écoute une prédication avec attention et retiens une vérité à mettre en pratique.'),
 ('fr','lecture_personnelle','Lis pour grandir intérieurement et mieux servir ceux qui t''entourent.'),
 ('fr','bible_soir','Lis la Bible du soir et laisse la Parole conclure ta journée.'),
 ('fr','gratitude_soir','Remercie Dieu pour trois grâces reçues aujourd''hui, même petites.'),
 ('fr','priere_soir','Prie l''Amidah du soir et remets à Dieu ce que tu n''as pas pu achever.'),
 ('fr','coucher','Couche-toi à l''heure choisie : le repos aussi est un acte de confiance.'),
 ('en','reveil','Rise at the time you chose and offer God your first thoughts.'),
 ('en','gratitude_matin','Say or write three reasons to thank God this morning.'),
 ('en','priere_matin','Pray the morning Amidah and place your day in the hands of the King.'),
 ('en','bible_matin','Read the morning Bible passage and carry one verse with you through the day.'),
 ('en','exercice','Move according to your strength: your body is the temple of the Holy Spirit.'),
 ('en','lecture_pro','Read to grow in your work: faithfulness is also lived on the job.'),
 ('en','priere_midi','Pause at midday to pray the Amidah and return to what matters most.'),
 ('en','predication','Listen to a sermon attentively and keep one truth to put into practice.'),
 ('en','lecture_personnelle','Read to grow inwardly and to serve those around you better.'),
 ('en','bible_soir','Read the evening Bible passage and let the Word close your day.'),
 ('en','gratitude_soir','Thank God for three graces received today, even small ones.'),
 ('en','priere_soir','Pray the evening Amidah and give God what you could not finish.'),
 ('en','coucher','Go to bed at the time you chose: rest is also an act of trust.'))
update seneve.activities a
   set critere_realisation = p.critere
  from seneve.contents c, phrases p
 where a.content_id = c.content_id
   and a.note_source = 'RECETTE_HD_QUOTIDIEN_V1:' || p.habit_key
   and c.langue = p.langue
   and a.critere_realisation in ('Déclare uniquement ce que tu as réellement préparé ou pratiqué, selon tes possibilités.',
                                 'Declare only what you actually prepared or practiced, according to your means.');

-- Retour arrière :
-- update seneve.activities a set critere_realisation = case c.langue when 'fr'
--   then 'Déclare uniquement ce que tu as réellement préparé ou pratiqué, selon tes possibilités.'
--   else 'Declare only what you actually prepared or practiced, according to your means.' end
--   from seneve.contents c where a.content_id = c.content_id and a.note_source like 'RECETTE_HD_QUOTIDIEN_V1:%'
--   and split_part(a.note_source, ':', 2) not like 'culte_%';
