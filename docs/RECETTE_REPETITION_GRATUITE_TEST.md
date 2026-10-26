# Recette de répétition de l’ouverture gratuite — TEST

Vérification du 26 octobre 2026 sur seneve-test uniquement. Le module reste inactif pour les utilisateurs ; aucune modification de production.

## Résultat établi

Deux appels à `hd_open_free_period` pour la même inscription fictive retrouvent un seul droit et une seule période. Le premier crée le droit, le second renvoie `cree=false, existant=true`, avec le même identifiant, le même début et la même fin exclusive. La durée vérifiée est exactement 720 heures (30 jours), origine gratuit, sans événement de paiement.

La seconde série observée a rendu :
- première session : PID 63173, début 00:28:52.487754 UTC, fin 00:29:12.531859 UTC ;
- seconde session : PID 63193, début 00:29:13.449435 UTC, fin 00:29:13.456588 UTC.

Malgré deux appels outils lancés ensemble, ces intervalles ne se chevauchent pas. Cette recette valide la répétition entre sessions distinctes, **pas une concurrence effective**. Le test concurrent reste à réaliser avec deux connexions PostgreSQL réellement simultanées. Ne pas présenter le verrouillage concurrent comme validé par ces résultats.

## Reproduction

Le script `scripts/prepare-habitudes-gratuite-concurrence.py` génère des UUID fictifs et cinq fichiers temporaires :
1. Exécuter setup.sql uniquement sur seneve-test.
2. Lancer 1.sql et 2.sql dans deux connexions distinctes ; vérifier que leurs intervalles started/finished se chevauchent.
3. Vérifier les deux réponses : un droit créé, l’autre retrouvé, identifiant et échéance identiques.
4. Exécuter check.sql.
5. Toujours exécuter cleanup.sql, même en cas d’échec.

La pause de quatre secondes de la première session peut être augmentée selon le transport. Une seconde tentative avec vingt secondes a également été sérialisée par le transport utilisé ici.

## Nettoyage vérifié

Après suppression ciblée des seules fixtures créées : zéro période HD, zéro correspondance HD, zéro programme fictif et zéro participant fictif de cette recette. Aucun accès réel créé, aucun envoi et aucun paiement déclenché.
