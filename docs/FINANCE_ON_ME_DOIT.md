# On me doit — 25 novembre 2026

Ajout distinct de Mes dettes, accessible depuis SÉNEVÉ Finance → On me doit.
Nom, montant, devise, date du prêt, échéance facultative. Remboursements partiels, solde, historique et totaux séparés par devise, français et anglais.

## Périmètre
Suivi déclaratif privé des prêts déjà versés. Aucune modification des caisses, des revenus, du calcul de dîme ou de la répartition. Les anciens prêts peuvent être ajoutés sans débit supplémentaire. Le bilan existant ne mélange pas ces créances aux dettes à rembourser. Le rapprochement automatique des caisses et l'intégration dans le rapport général restent à réaliser.

## Dépendances vérifiées
Base seneve-prod : enrollments, hd_programme_links, current_participant_id, hd_has_current_right, hd_finance_enrollment, hd_finance_amount_fits. Frontend : ComptePrive, CadreHabitudes, ChoixDevise et configuration existante du suivi financier.
Nouvelles tables : hd_finance_receivables, hd_finance_receivable_payments. RPC dédiées, accès propriétaire et droit HD vérifiés, tables sans accès direct, RLS activée, refus anonyme. L'expiration bloque l'accès sans effacer les prêts.

## Vérifications
Recette transactionnelle sur seneve-test, ROLLBACK : prêt 100, remboursement 30 rejoué sans doublon, solde 70, refus de 71, remboursement final 70, refus supplémentaire, refus autre compte et privilèges anonymes. Le droit actif est simulé uniquement dans cette transaction car les inscriptions de test ont expiré ; la fonction originale est restaurée par ROLLBACK.
Tests unitaires : calculs partiels, devises entières, données incohérentes, formulaire, erreurs, composants Finance existants. Tous les appels réseau sont simulés dans les tests unitaires.

## Retour arrière
Référence préalable : 377a563a695a8fe6a2acc1d9b095bc7d67d60048. Revenir sur les changements d'interface du commit dédié et exécuter hd_finance_receivables_retour.sql pour fermer les nouvelles RPC. Conserver les tables et leurs données. Réactivation : restaurer les GRANT de la migration. Aucune table existante ni donnée financière existante n'est modifiée par l'installation.

Résultat local : 192 fichiers de tests, 1 344 tests réussis ; TypeScript et construction réussis. La vérification visuelle par navigateur reste à effectuer : le binaire Chromium local n'est pas disponible. La migration additive est appliquée sur test et production ; accès direct des tables et exécution anonyme des RPC refusés.
