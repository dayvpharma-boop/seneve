-- SÉNEVÉ 047 (25/10/2026) — Découverte 7 jours EN, version 2 « à relire ».
-- Demande de Dr Justin Tshims (25/10/2026) : « anglais doit être identique au français ».
-- Traduction de la Découverte FR publiée (version 3, textes validés le 19/10/2026) :
--   texte du jour, explication, action, critère de réalisation, question, référence du livre
--   (titres et pages relevés dans « Stop Begging For Miracles EN LIVRE COMPLET.pdf »).
-- Ajoute aussi les 7 « Paroles du jour » EN, citations exactes du livre anglais, en brouillon.
-- RIEN N'EST PUBLIÉ : la version 1 EN reste la version publiée jusqu'à la validation de Dr Justin.
-- Retour arrière : supprimer la version 2 EN (contenus, activités, paroles, ligne programme_versions).
do $migration$
declare
  v_programme constant text := 'PROSPECT_LIVRE_7J_EN_V1';
  v_new uuid;
  v_old record;
begin
  perform pg_advisory_xact_lock(hashtext(v_programme));
  if exists(select 1 from seneve.programme_versions where programme_id = v_programme and version = 2) then
    raise exception 'La V2 EN existe déjà : vérifier avant toute nouvelle préparation';
  end if;
  if (select count(*) from seneve.contents where programme_id = v_programme and version = 1) <> 7
     or not exists(select 1 from seneve.programme_versions where programme_id = v_programme and version = 1 and etat = 'publiee') then
    raise exception 'Source V1 EN publiée de sept jours attendue';
  end if;

  insert into seneve.programme_versions(programme_id, version, etat)
    values (v_programme, 2, 'a_relire');

  for v_old in select * from seneve.contents where programme_id = v_programme and version = 1 order by jour, numero_message loop
    v_new := gen_random_uuid();
    insert into seneve.contents
      select (jsonb_populate_record(null::seneve.contents, to_jsonb(v_old) ||
        jsonb_build_object('content_id', v_new, 'legacy_contenu_id', coalesce(v_old.legacy_contenu_id, v_programme || '_' || v_old.jour::text) || '_V2',
                           'version', 2, 'cree_le', now()))).*;
    insert into seneve.activities
      select (jsonb_populate_record(null::seneve.activities, to_jsonb(a) ||
        jsonb_build_object('activity_id', gen_random_uuid(), 'content_id', v_new, 'cree_le', now()))).*
        from seneve.activities a where a.content_id = v_old.content_id;
  end loop;

  -- Textes du jour, explications et références (alignés sur la Découverte FR V3).
  update seneve.contents c set texte_officiel = t.texte, explication = t.explication, reference_livre = t.reference
  from (values
    (1, $t$Hello {prenom} 👋 Day 1/7 — What comes first in your life. In “Stop Begging for Miracles,” Dr. Justin Tshims invites us to look at what our everyday decisions reveal about the place of God in our lives.

Today, think back to a recent decision. What mainly guided your choice? Take a moment to recognize the priority this decision reveals, without trying to justify or condemn yourself.$t$,
        $t$Today, look at what a recent decision reveals about your priorities.$t$,
        $t$Chapter 1 — Seek First the Kingdom of God — opening — Printed page 9 — PDF page 12$t$),
    (2, $t$Hello {prenom} 👋 Day 2/7 — Taking a step back when life feels urgent. In “Stop Begging for Miracles,” Dr. Justin Tshims tells how his desire to move fast led him to pile up financial commitments.

Today, give yourself a pause before a decision. What consequences could it have? Does it respect your priorities and your responsibilities? You do not need to take on a new commitment to do this exercise: a small everyday decision is enough.$t$,
        $t$In “Stop Begging for Miracles,” Dr. Justin Tshims tells how his desire to move fast led him to pile up financial commitments.$t$,
        $t$Chapter 1 — My testimony — when urgency took the place of God — Printed pages 11 to 13 — PDF pages 14 to 16$t$),
    (3, $t$Hello {prenom} 👋 Day 3/7 — Changing a habit, taking a first step. In “Stop Begging for Miracles,” Dr. Justin Tshims tells of a gradual rebuilding, grounded in responsibility and steady discipline.

Today, choose a habit you can act on and one small step to improve it. For example: preparing a task instead of putting it off. Choose a step simple enough to carry out today. You will be able to come back to this same habit at the end of the week.$t$,
        $t$In “Stop Begging for Miracles,” Dr. Justin Tshims tells of a gradual rebuilding, grounded in responsibility and steady discipline.$t$,
        $t$Chapter 1 — My testimony — when urgency took the place of God — Printed pages 15 to 16 — PDF pages 18 to 19$t$),
    (4, $t$Hello {prenom} 👋 Day 4/7 — Putting your faith into everyday decisions. In “Stop Begging for Miracles,” Dr. Justin Tshims explains that faith is also expressed in everyday choices and behavior.

Today, think of an exchange with another person. Take a moment to pray, then choose a concrete way to put your faith into practice: listening without interrupting, speaking respectfully, or honestly admitting a mistake. Focus on your own behavior; the other person’s reaction does not depend on you.$t$,
        $t$In “Stop Begging for Miracles,” Dr. Justin Tshims explains that faith is also expressed in everyday choices and behavior.$t$,
        $t$Chapter 1 — The Kingdom is not a religion. It is a dominion. — Printed pages 17 to 18 — PDF pages 20 to 21$t$),
    (5, $t$Hello {prenom} 👋 Day 5/7 — Aligning your schedule with your priorities. In “Stop Begging for Miracles,” Dr. Justin Tshims invites us to entrust our whole day to God, beyond our time of prayer alone.

Today, look at your schedule and spot a priority you are neglecting. What realistic time could you give it? Setting this time aside is a first step toward aligning your schedule with your priorities, while staying attentive to God throughout your day and your responsibilities.$t$,
        $t$In “Stop Begging for Miracles,” Dr. Justin Tshims invites us to entrust our whole day to God, beyond our time of prayer alone.$t$,
        $t$Chapter 1 — Putting God first: beyond the morning prayer — Printed pages 20 to 22 — PDF pages 23 to 25$t$),
    (6, $t$Hello {prenom} 👋 Day 6/7 — Facing worry with faith. In “Stop Begging for Miracles,” Dr. Justin Tshims draws on Matthew 6 to invite us to trust God in the face of everyday needs.

Today, entrust a concern to Him in prayer, then choose one useful step within your reach. It might be gathering a piece of information, preparing a request, or asking for help. You do not have to solve everything today. If what comes next depends on someone else, focus on the part that depends on you.$t$,
        $t$In “Stop Begging for Miracles,” Dr. Justin Tshims draws on Matthew 6 to invite us to trust God in the face of everyday needs.$t$,
        $t$Chapter 1 — When God is first, the rest follows — Printed page 23 — PDF page 26$t$),
    (7, $t$Hello {prenom} 👋 Day 7/7 — Reflecting on the week and choosing a commitment. This discovery week is coming to an end. In “Stop Begging for Miracles,” Dr. Justin Tshims invites us to begin without waiting to be perfect and to make a concrete commitment.

Think back on what you tried, even if you did not complete every action. What lesson do you take away? Go back to the habit you chose on day 3 and decide on a next small step. If you did not do day 3, simply choose one action from this week that you would like to start or continue.$t$,
        $t$This discovery week is coming to an end. In “Stop Begging for Miracles,” Dr. Justin Tshims invites us to begin without waiting to be perfect and to make a concrete commitment.$t$,
        $t$Chapter 1 — End of “Why some believers succeed and others stagnate”, self-assessment and written commitment — Printed pages 31 to 33 — PDF pages 34 to 36$t$)
  ) as t(jour, texte, explication, reference)
  where c.programme_id = v_programme and c.version = 2 and c.jour = t.jour and c.numero_message = 1;

  -- Actions du jour (consigne, critère de réalisation, note de source) alignées sur FR V3.
  update seneve.activities a set consigne = t.consigne, critere_realisation = t.critere, note_source = t.note
  from seneve.contents c, (values
    (1, $t$Choose a recent decision and name the priority that guided it. You can keep this reflection to yourself or write it in your journal.$t$,
        $t$When you have identified a specific decision and named the priority it reveals.$t$,
        $t$Short adaptation of the opening reflection.$t$),
    (2, $t$Choose a decision you have to make and name one possible consequence and one priority to respect. If no decision comes up today, go back to a recent decision and ask yourself what you would have wanted to examine before choosing.$t$,
        $t$When you have examined a specific decision and identified one possible consequence and one priority to respect. You do not need to have made the decision.$t$, null),
    (3, $t$Choose a habit and carry out one small, specific step today to improve it. You can write this step in your journal so you can find it again on day 7.$t$,
        $t$When you have carried out the chosen step once. You do not need to have already built a new habit.$t$, null),
    (4, $t$Take a moment to pray, then put one specific behavior into practice in an exchange today. If no exchange comes up, you can do it in a useful message you had already planned to send.$t$,
        $t$When you have taken this moment of prayer and put the chosen behavior into practice, whatever the other person’s reaction. If you have only prepared this exchange, you can mark the action as “prepared”.$t$, null),
    (5, $t$Choose a neglected priority and set aside a specific time slot for it today or tomorrow, without dropping your responsibilities. For example: tomorrow after the meal, ten minutes to take up again the step you chose on day 3.$t$,
        $t$When you have chosen the priority, the day and the time you will give it. Here, the action is to organize this time; you can then put this appointment into practice.$t$, null),
    (6, $t$Take a moment to pray about a concern, then carry out one small, concrete step to face it. You can keep the details of this concern to yourself.$t$,
        $t$When you have taken this moment of prayer and carried out the chosen step. The problem does not need to be solved, nor does another person need to have answered.$t$, null),
    (7, $t$Name one lesson from this week, choose a step to continue, and set the day and the time you will next put it into practice. You can keep this commitment to yourself or write it in your journal.$t$,
        $t$When you have identified a lesson, a specific step and the next time to practice it. You do not need to have succeeded on every day.$t$, null)
  ) as t(jour, consigne, critere, note)
  where a.content_id = c.content_id and a.type_activite = 'action'
    and c.programme_id = v_programme and c.version = 2 and c.jour = t.jour and c.numero_message = 1;

  -- Questions du jour alignées sur FR V3.
  update seneve.activities a set consigne = t.consigne
  from seneve.contents c, (values
    (1, $t$What place do you want to give God in your next decision?$t$),
    (2, $t$What does this pause help you see before choosing?$t$),
    (3, $t$What step did you try, and what did you notice while doing it?$t$),
    (4, $t$How did your faith guide the way you acted in this exchange?$t$),
    (5, $t$Which priority will this time slot help you respect?$t$),
    (6, $t$What part within your reach were you able to carry out today? You can answer without giving personal details.$t$),
    (7, $t$What would you like to keep from this week, and what next step do you choose?$t$)
  ) as t(jour, consigne)
  where a.content_id = c.content_id and a.type_activite = 'question'
    and c.programme_id = v_programme and c.version = 2 and c.jour = t.jour and c.numero_message = 1;

  -- Paroles du jour EN : équivalents exacts, dans le livre anglais, des 7 citations FR validées le 18/10/2026.
  insert into seneve.paroles (programme_id, version, langue, jour, texte, reference_livre, etat) values
    (v_programme, 2, 'en', 1, $t$As long as God is not first, everything else is in disorder — even what appears to be succeeding.$t$, 'Chapter 1 — printed page 9', 'brouillon'),
    (v_programme, 2, 'en', 2, $t$I was driven by urgency — not led by the Spirit.$t$, 'Chapter 1 — printed page 15', 'brouillon'),
    (v_programme, 2, 'en', 3, $t$Lord, I am no longer asking You to erase the consequences. Teach me to change the causes.$t$, 'Chapter 1 — printed page 15', 'brouillon'),
    (v_programme, 2, 'en', 4, $t$For the Kingdom is not in words — it is in the real transformation of a life.$t$, 'Chapter 1 — printed page 18', 'brouillon'),
    (v_programme, 2, 'en', 5, $t$The true Christian does not put God into his schedule — he puts his schedule into God’s hands.$t$, 'Chapter 1 — printed page 21', 'brouillon'),
    (v_programme, 2, 'en', 6, $t$What He asks of you is not to run. It is to seek.$t$, 'Chapter 1 — printed page 23', 'brouillon'),
    (v_programme, 2, 'en', 7, $t$God is not looking for the perfect man. He is looking for the obedient man.$t$, 'Chapter 1 — printed page 31', 'brouillon');

  -- Contrôles : 7 contenus, 14 activités (7 actions + 7 questions), 7 paroles, aucune explication vide.
  if (select count(*) from seneve.contents where programme_id = v_programme and version = 2) <> 7
     or (select count(*) from seneve.contents where programme_id = v_programme and version = 2 and coalesce(explication, '') = '') <> 0
     or (select count(*) from seneve.contents where programme_id = v_programme and version = 2 and reference_livre not like 'Chapter 1 — %') <> 0 then
    raise exception 'Contenus V2 EN incomplets';
  end if;
  if (select count(*) from seneve.activities a join seneve.contents c using (content_id) where c.programme_id = v_programme and c.version = 2) <> 14
     or (select count(*) from seneve.activities a join seneve.contents c using (content_id)
         where c.programme_id = v_programme and c.version = 2 and a.type_activite = 'action' and coalesce(a.critere_realisation, '') = '') <> 0 then
    raise exception 'Activités V2 EN incomplètes';
  end if;
  if (select count(*) from seneve.paroles where programme_id = v_programme and version = 2 and langue = 'en') <> 7 then
    raise exception 'Paroles V2 EN incomplètes';
  end if;
end $migration$;
