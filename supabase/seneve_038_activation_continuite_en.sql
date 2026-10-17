-- SÉNEVÉ 038 — Activation de Sénevé Continuity (anglais)
-- 17/10/2026 : 90 défis anglais (CONTENUS 3070-3159) relus et validés par Dr Justin Tshims
-- (« Validé » 20:21, confirmé « Oui, relu : valide et publie »), publiés par l'outil n8n :
-- ABONNE_CONTINUITE_EN_V1, ABONNE_CONTINUITE_M2_EN_V1, ABONNE_CONTINUITE_M3_EN_V1 (version 1, 30 jours chacun).
-- Coach : 50 questions par jour, comme en français (décision du 16/10/2026).
-- Test en transaction annulée avant activation : 4 achats → EN M1 (17/10) → M2 (16/11) → M3 (16/12) → M1 (15/01).
update seneve.programmes set quota_coach_jour = 50
 where programme_id in ('ABONNE_CONTINUITE_EN_V1', 'ABONNE_CONTINUITE_M2_EN_V1', 'ABONNE_CONTINUITE_M3_EN_V1');
update seneve.offers set programme_id = 'ABONNE_CONTINUITE_EN_V1', actif = true
 where offre_id = 'CONTINUITE_MENSUEL_EN';
