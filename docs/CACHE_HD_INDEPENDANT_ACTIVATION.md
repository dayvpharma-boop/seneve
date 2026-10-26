# Identification HD indépendante de l’interface

La lecture de hd_programme_links dans l’espace ne dépend plus de VITE_HABITUDES_DEFIS. Les inscriptions HD sont ainsi exclues du cache même lorsque leur interface est désactivée. La comparaison conserve programme, version et langue ; les correspondances inactives sont aussi prises en compte.

Si la lecture du registre échoue (erreur retournée ou rejet réseau), classificationCacheVerifiee=false interdit la copie et retire l’ancienne copie à la prochaine écriture réussie du stockage. Interface désactivée : l’espace en ligne reste accessible. Interface activée : l’erreur conserve le comportement de refus de chargement HD. Aucun droit serveur supplémentaire n’est accordé.

Validation : 18 tests HD espace/cache et 51 tests espace/parcours/hors-ligne réussis ; TypeScript et Vite réussis. Pas de validation visuelle Safari.

Limites : une ancienne copie dépourvue de classification HD ne peut pas être identifiée rétrospectivement hors connexion. Un stockage refusant sa suppression peut conserver physiquement une ancienne valeur. Le registre et ses permissions doivent être installés avant toute activation : en leur absence, aucune nouvelle copie de l’espace n’est conservée, même pour les parcours ordinaires. Ces changements restent sur la branche de préparation, sans déploiement en production.
