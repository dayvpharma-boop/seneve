# Bilan des habitudes par occurrence

Le module src/lib/habitudes.ts prépare le calcul pour des instantanés serveur consolidés, avec une occurrence distincte par inscription, version et date locale. Il ne contrôle pas les droits et ne remplace pas une API sécurisée.

12 tests exécutés avec Node 24 : une prière ne complète pas la journée, trois prières distinctes, aide indépendante, local en attente, local sans écrasement serveur, isolation date/inscription/version, doublons, contradictions refusées, journée vide non évaluée, activités facultatives, dates invalides et états partiels/préparés.

Les réalisations locales restent séparées du total synchronisé. Les doublons identiques sont comptés une seule fois. Les instantanés serveur contradictoires produisent une erreur explicite plutôt qu'une décision arbitraire. Le statut journée réalisée repose sur toutes les activités requises, dont la sélection reste à valider éditorialement.

Exécuter avec Node 22.18+ ou 24 : node --test scripts/test-habitudes.mjs.

Statut : calcul isolé et testé sur branche de travail. Aucun remplacement de src/lib/progres.ts, aucune route reliée au nouveau calcul, aucune migration et aucun déploiement production. Les tests ne valident pas l'écriture API, les droits, l'idempotence transactionnelle, les rappels ou la synchronisation entre appareils. L'affichage actuel public reste inchangé.

Suite : concevoir les occurrences datées côté serveur et les rattacher aux inscriptions/droits ; sauvegarde et restauration isolée préalables aux migrations ; vérifier le rejeu d'un événement et l'annulation des rappels, puis brancher l'écran sur les états réellement synchronisés.
