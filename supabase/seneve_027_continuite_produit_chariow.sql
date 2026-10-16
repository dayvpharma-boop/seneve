-- SÉNEVÉ 2.0 — Migration 027 (appliquée le 16/10/2026) : produit Chariow de Sénevé Continuité
-- Chariow ne propose pas d'abonnement automatique dans la boutique (vérifié par Dr Justin, 16/10/2026) :
-- produit de type Licence, paiement unique de 5 USD, validité 30 jours (prd_xn8p0wrx).
-- Chaque achat ouvre 30 jours ; un nouvel achat prolonge l'accès et planifie le mois suivant
-- (logique déjà présente dans seneve._ouvrir_acces pour CONTINUITE_MENSUEL_FR).
-- L'offre reste inactive (actif = false) jusqu'à l'accord de Dr Justin.
update seneve.offers
   set chariow_product_id = 'prd_xn8p0wrx',
       lien_achat = 'https://mmkznvua.mychariow.com/prd_xn8p0wrx',
       duree_acces_jours = 30,
       produit = 'Sénevé Continuité — Accès 30 jours',
       type_offre = 'Accès 30 jours (paiement unique)'
 where offre_id = 'CONTINUITE_MENSUEL_FR';
