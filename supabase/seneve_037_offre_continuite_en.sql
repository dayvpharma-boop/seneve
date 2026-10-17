-- SÉNEVÉ 037 — Offre Sénevé Continuité en anglais (préparée, INACTIVE)
-- Produit Chariow créé par Dr Justin le 17/10/2026 : prd_xd6i08ci, 5 USD (page produit lue le 17/10/2026).
-- Licence 30 jours ; le client rachète chaque mois (même fonctionnement que l'offre française).
-- Inactive tant que les 90 défis anglais (CONTENUS 3070-3159) ne sont pas relus, validés et publiés :
-- un achat reçu avant l'activation est enregistré « à examiner », sans ouvrir d'accès.
-- programme_id sera renseigné à la publication de ABONNE_CONTINUITE_EN_V1 (clé étrangère vers programmes).
insert into seneve.offers (offre_id, produit, type_offre, langue, programme_id, chariow_product_id, prix, devise,
                           duree_acces_jours, actif, lien_achat)
values ('CONTINUITE_MENSUEL_EN', 'Sénevé Continuity — 30-day access', 'Access 30 days (one-time payment)', 'en', null,
        'prd_xd6i08ci', '5', 'USD', 30, false, 'https://mmkznvua.mychariow.com/prd_xd6i08ci')
on conflict (offre_id) do nothing;
