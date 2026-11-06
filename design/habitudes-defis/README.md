# Habitudes & Défis — intégration financière

## État au 6 novembre 2026

- La page publique `/habitudes` contient deux calculateurs facultatifs, en français et en anglais. Les montants sont calculés dans l’écran et ne sont pas sauvegardés.
- Le panneau de réglage des habitudes financières est intégré au parcours de planning, mais ne s’affichera que pour un module HD version 2 avec un accès actif.
- Le client appelle des RPC dédiées pour lire les choix, activer/désactiver une habitude et enregistrer les horaires. Ces RPC n’existent pas encore dans la base.
- La proposition SQL prépare une V2 FR/EN séparée, copie les contenus et activités existants, ajoute quatre activités optionnelles quotidiennes et conserve les liens inactifs. Elle comprend aussi les réglages privés, leur effet à partir du lendemain, la vérification serveur et le raccordement au planificateur push.
- L’offrande est activée par défaut ; le remboursement de dette reste désactivé tant que le participant ne l’active pas. Aucun montant, créancier ou détail de dette n’est envoyé ou stocké.
- Le participant choisit commerçant (rappel quotidien) ou salarié (rappel hebdomadaire avec jour choisi). Ce choix de situation reste local à l’écran. L’offrande et la dette ont leurs propres jours et heures.
- Les activités financières restent optionnelles et ne mesurent pas la foi. Elles n’effectuent aucun transfert d’argent. Le consentement push, les droits actifs, les appareils, le fuseau et l’état « réalisée » restent contrôlés par le système existant.

## Vérification et limites

La compilation de production a réussi (`npm run build`). Les tests Vitest n’ont pas été validés : l’exécution a été rejetée par la revue automatique car la suite de tests contacte l’endpoint Supabase configuré pour la production. Je n’ai pas retenté ces tests ni appliqué de SQL. La branche de validation demandée n’est pas disponible sur le plan actuel (branches réservées à Pro+) et l’organisation a atteint sa limite de deux projets gratuits ; la création d’un nouvel environnement isolé a été refusée.

La migration reste un brouillon local dans `supabase/propositions/habitudes_finances_v2.sql`. Elle n’a pas été appliquée en test ou en production ; aucun rappel financier réel n’est actif. L’historique des migrations de production et de test diverge. Il manque une sauvegarde restaurable et un environnement réellement isolé pour valider les changements serveur. Les liens de programme restent inactifs et la V1 n’est pas migrée.

Voir `decision-reserve-joie-epargne-investissement.md` pour les décisions fonctionnelles, et `integration-v2-finances-rappels.md` pour la cartographie des dépendances et les étapes bloquantes avant déploiement.
