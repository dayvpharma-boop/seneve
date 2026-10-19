-- English questionnaire V3: translations of the five approved French adaptations.
-- Keeps English V2 (including questions 2 and 7 from the book) and historical results intact.
do $$
declare v_old uuid; v_new uuid;
begin
 select test_version_id into strict v_old from seneve.test_versions
  where test_id='TEST_7_RACINES' and langue='en' and version=2;
 if (select count(*) from seneve.test_items where test_version_id=v_old)<>21 then
  raise exception 'English V2 must contain 21 questions.';
 end if;
 insert into seneve.test_versions(test_id,version,langue,etat,regles,valide_par,date_validation)
 select test_id,3,langue,'archivee',
  regles || jsonb_build_object('revision','english_translations_2026_10_19','libelles_reponses',jsonb_build_array('Never','Rarely','Sometimes','Often','Always')),
  'Dr Justin Tshims — English translations of the five approved French adaptations, 19/10/2026', now()
 from seneve.test_versions where test_version_id=v_old
 on conflict(test_id,version,langue) do nothing;
 select test_version_id into strict v_new from seneve.test_versions
  where test_id='TEST_7_RACINES' and langue='en' and version=3;
 insert into seneve.test_items(test_version_id,ordre,racine_id,texte,reference_livre)
 select v_new,ordre,racine_id,
  case ordre when 6 then 'When I give, I do so with trust rather than out of fear.'
        when 8 then 'In my daily activities, I choose honesty, even when no one can check.'
        when 9 then 'I take practical steps to move forward, rather than waiting for opportunities to come on their own.'
        when 13 then 'I check on a lonely person or someone in difficulty and offer help suited to my means.'
        when 17 then 'I keep my small everyday commitments, even when they seem unimportant.' else texte end,
  case ordre when 6 then 'Book, Chapter 2 — English translation of the French adaptation approved by Dr Justin Tshims on 19/10/2026; not a literal quotation.'
        when 8 then 'Book, Chapter 3 — English translation of the French adaptation approved by Dr Justin Tshims on 19/10/2026; not a literal quotation.'
        when 9 then 'Book, Chapter 3 — English translation of the French adaptation approved by Dr Justin Tshims on 19/10/2026; not a literal quotation.'
        when 13 then 'Book, Chapter 5 — English translation of the French adaptation approved by Dr Justin Tshims on 19/10/2026; not a literal quotation.'
        when 17 then 'Book, Chapter 6 — English translation of the French adaptation approved by Dr Justin Tshims on 19/10/2026; not a literal quotation.' else reference_livre end
 from seneve.test_items where test_version_id=v_old
 on conflict(test_version_id,ordre) do nothing;
 if (select count(*) from seneve.test_items i join seneve.test_items o on o.test_version_id=v_old and o.ordre=i.ordre
  where i.test_version_id=v_new and i.texte=case o.ordre when 6 then 'When I give, I do so with trust rather than out of fear.'
        when 8 then 'In my daily activities, I choose honesty, even when no one can check.'
        when 9 then 'I take practical steps to move forward, rather than waiting for opportunities to come on their own.'
        when 13 then 'I check on a lonely person or someone in difficulty and offer help suited to my means.'
        when 17 then 'I keep my small everyday commitments, even when they seem unimportant.' else o.texte end)<>21 then
  raise exception 'English V3 does not match the approved translations.';
 end if;
 update seneve.test_versions set etat='archivee'
  where test_id='TEST_7_RACINES' and langue='en' and etat='publiee' and version<>3;
 update seneve.test_versions set etat='publiee' where test_version_id=v_new;
end $$;
