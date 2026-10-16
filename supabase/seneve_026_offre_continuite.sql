-- SÉNEVÉ 2.0 — Migration 026 : offre Sénevé Continuité (préparée, NON en vente)
-- Décisions de Dr Justin Tshims (16/10/2026) : 5 USD par mois ; 50 questions au coach par jour ;
-- un défi par jour ; accès jusqu'à la fin du mois payé, puis défis et coach s'arrêtent, l'historique reste.
-- Le programme ABONNE_CONTINUITE_FR_V1 (30 défis, version 1) a été publié par l'outil n8n le 16/10/2026.
-- L'offre reste inactive (actif = false) : elle n'apparaît nulle part tant que le produit Chariow
-- n'existe pas et que les paiements ne sont pas reliés.

update seneve.programmes
   set quota_coach_jour = 50,
       description = 'Abonnement mensuel : un défi par jour sur les 7 racines.'
 where programme_id = 'ABONNE_CONTINUITE_FR_V1';

insert into seneve.offers (offre_id, produit, type_offre, langue, programme_id, chariow_product_id,
                           prix, devise, duree_acces_jours, actif, lien_achat)
values ('CONTINUITE_MENSUEL_FR', 'Sénevé Continuité', 'Abonnement mensuel', 'fr', 'ABONNE_CONTINUITE_FR_V1',
        null, 5, 'USD', null, false, null)
on conflict (offre_id) do nothing;
