-- SÉNEVÉ 045 — Libellés anglais restés en français (inventaire du 23/10/2026)
-- Affichage seulement : aucun code ne dépend de type_offre ; l'achat Chariow passe par chariow_product_id.
-- Le nom du parcours a été corrigé par Dr Justin dans l'éditeur SQL le 23/10/2026 ; il est repris ici pour mémoire.
update seneve.programmes set nom = 'Book Companion — 14 days'
 where programme_id = 'ACHETEUR_LIVRE_14J_EN_V1';

update seneve.offers set type_offre = 'Paperback'
 where offre_id = 'LIVRE_PAPIER_EN' and langue = 'en';
update seneve.offers set type_offre = 'Training'
 where offre_id in ('FORMATION_30J_EN', 'FORMATION_90J_EN') and langue = 'en';
update seneve.offers set type_offre = 'Personal coaching'
 where offre_id in ('ACCOMPAGNEMENT_30J_EN', 'ACCOMPAGNEMENT_90J_EN') and langue = 'en';
