# Historique du blocage d’installation des horaires

**Statut actualisé : blocage résolu le 26 octobre 2026.** La migration `habitudes_horaires_personnels` est installée sur seneve-test et la recette SQL a réussi avec rollback. Voir [la validation actuelle](HORAIRES_PERSONNELS_INSTALLATION_TEST.md). La production reste inchangée.

La section ci-dessous conserve le compte rendu antérieur au rétablissement de l’appel ; elle ne décrit plus l’état actuel.

# Sauvegarde des horaires : proposition non installée

## État réel au 26 octobre 2026

Le calcul du planning reste validé par les tests précédents. L’écriture SQL de la sauvegarde a été préparée mais **n’a pas été installée ni validée par exécution**. Deux tentatives de recette transactionnelle puis une tentative apply_migration ont renvoyé `McpServerError: Invalid or expired requestState`. Les requêtes de lecture continuent de fonctionner. Après les tentatives : `to_regclass('seneve_private.hd_schedule_heads')` vaut NULL, zéro horaire, zéro programme fictif HD_RECETTE. Ne pas décrire les tests SQL de ce fichier comme réussis.

Aucune modification de la production, de l’aperçu publié, des droits, des paiements ou des rappels. Aucun formulaire de sauvegarde rendu accessible. Les deux fichiers SQL sont des propositions à vérifier, pas des migrations automatiquement exécutées au déploiement.

## Choix d’implémentation de préparation

- Ajouter un identifiant de créneau à la table existante pour permettre, par exemple, deux heures de culte en semaine différentes.
- Garder des horaires personnels propres au participant, module, version, langue et habitude ; pas de texte libre intime.
- Appliquer les changements le lendemain local, en fermant les anciennes périodes la veille. Une modification du lendemain encore à venir peut être remplacée, sans toucher aux journées passées.
- Préserver la fréquence du modèle : sept rendez-vous pour un repère quotidien, deux cultes en semaine et un autre créneau hebdomadaire. Les règles pédagogiques d’adaptation restent à développer séparément ; cet endpoint ne supprime pas une obligation du parcours.
- Contrôler propriétaire, inscription, droit actif et fuseau à chaque appel. Refuser les écritures directes.
- Employer une révision attendue pour prévenir les écrasements par une page périmée ; reconnaître le rejeu de la dernière demande avec le même identifiant et contenu. Une ancienne demande déjà supplantée doit être refusée, jamais réappliquée.
- Garder les fonctions privilégiées et les révisions dans un schéma privé ; exposer des façades invoker limitées à authenticated. Le schéma privé ne doit pas être ajouté à la configuration des schémas exposés.

## Validation restant à faire

Relire puis exécuter la recette transactionnelle sur seneve-test, corriger les erreurs observées, appliquer la version validée via apply_migration, rejouer la recette et les vérifications d’accès/advisors. La recette préparée couvre propriété A/B, lecture historique, rejet du jour courant, rejeu, révision périmée, heures/jours/fréquence invalides, interdiction d’écriture directe, révocation et absence d’effets sur progression/paiements/rappels. Le test concurrent effectif reste nécessaire ; ne pas le déduire de deux appels sérialisés du connecteur.

Documentation technique consultée : https://supabase.com/docs/guides/database/functions (permissions et search_path). Le changelog Supabase a été consulté ; aucune nouvelle fonctionnalité de plateforme n’est requise pour cette proposition.
