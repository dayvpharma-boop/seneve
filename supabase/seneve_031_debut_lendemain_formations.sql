-- SÉNEVÉ 2.0 — Migration 031 (16/10/2026) : début des formations le lendemain de l'achat
-- Décision de Dr Justin (16/10/2026, 19 h 20) : livre 14 jours après l'achat (inchangé) ;
-- formations et accompagnements 30/90 jours (fr et en) : le lendemain de l'achat, pour qu'un achat
-- fait le soir ne fasse pas perdre les moments du matin et de midi. Même valeur (1) mise dans la
-- colonne delai_apres_achat_jours de la feuille PROGRAMMES (suivi WhatsApp). Sénevé Continuité : inchangé (0).
update seneve.programmes set delai_apres_achat_jours = 1
 where programme_id in ('ACHETEUR_FORMATION30_30J_FR_V1','ACHETEUR_FORMATION90_90J_FR_V1','ACHETEUR_ACCOMP30_30J_FR_V1','ACHETEUR_ACCOMP90_90J_FR_V1',
                        'ACHETEUR_FORMATION30_30J_EN_V1','ACHETEUR_FORMATION90_90J_EN_V1','ACHETEUR_ACCOMP30_30J_EN_V1','ACHETEUR_ACCOMP90_90J_EN_V1');
