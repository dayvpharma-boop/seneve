# Rappels par tâche et relances — 28 octobre 2026

Décisions de Dr Justin : chaque notification nomme sa tâche et présente un message associé ; relances toutes les 30 minutes jusqu’à réalisation ou choix explicite d’ignorer. L’ignorance d’une notification par le système d’exploitation ne constitue pas ce choix.

## Comportement

- Titre et corps nomment l’activité, y compris aux relances. Les trois prières, les deux lectures bibliques, les gratitudes et les lectures sont distinctes, en français et en anglais. Aucun titre de livre personnel, texte de journal ou compteur sensible n’est exposé.
- Le lien conduit à la journée avec l’ancre de l’activité ; les droits restent vérifiés.
- Relances espacées de 30 minutes à partir de l’horaire personnel, pendant la journée locale de l’activité. Les horaires de silence, le consentement, les habitudes désactivées et les droits restent contrôlés avant envoi.
- « Ignorer les rappels pour aujourd’hui » conserve un choix séparé de la progression. Aucun succès n’est affiché avant confirmation serveur. Une panne réseau nécessite de réessayer. La tâche peut toujours être réalisée ensuite.
- Une réalisation synchronisée annule les rappels en attente. Le choix d’ignorer supprime également la tâche du planning attendu, y compris au contrôle final et à la prochaine préparation. Les tâches du lendemain conservent leurs rappels.
- Aucun rattrapage en rafale : les créneaux passés ne sont pas recréés ; chaque créneau garde ses propres réservation et déduplication. Le tag de notification est stable par activité ; le service worker redemande une alerte lors du remplacement (renotify). Le téléphone garde la décision de son et d’affichage.
- L’interrupteur serveur `relances_30min_actives` permet d’installer le changement sans activer les relances avant la publication du bouton d’arrêt.

## Vérifications

Recette transactionnelle TEST : intervalle de 30 minutes, frontière de journée, préparation répétée sans doublons, choix d’ignorer idempotent sans réalisation, conservation des rappels du lendemain, déclaration explicite de réalisation, isolation entre deux comptes. Aucune notification envoyée par la recette et données fictives annulées, absence vérifiée.

985 tests Vitest réussis, puis test supplémentaire du service worker réussi (986 tests au total) ; vérification TypeScript réussie ; construction avec l’option `VITE_HABITUDES_RELANCES=true` réussie. Les tests de transport utilisent un expéditeur simulé. L’expéditeur a été empaqueté et déployé sur TEST sans invoquer un envoi réel.

L’analyse Supabase dans TEST ne révèle aucun nouveau signal par rapport à l’état précédent. Les avertissements antérieurs sur pg_net et les mots de passe compromis restent hors périmètre.

## Déploiement et retour arrière

1. Sauvegarde des trois fonctions modifiées : `supabase/backups/20261028_hd_rappels_avant_relances.sql`. Ancien expéditeur : `supabase/backups/20261028_hd_edge_avant_relances/`.
2. Installer `supabase/propositions/habitudes_relances_30min.sql` en production, interrupteur de relance initialement fermé. Déployer l’expéditeur nommé `envoyer-rappels-hd` avec JWT vérifié, point d’entrée index.ts et dépendances du dossier.
3. Publier le site avec `VITE_HABITUDES_RELANCES=true`, vérifier le workflow terminé puis activer `seneve_private.hd_push_dispatch_config.relances_30min_actives`.
4. Retour arrière : fermer cet interrupteur, restaurer les trois fonctions sauvegardées, replanifier pour annuler les créneaux devenus inattendus, restaurer l’expéditeur précédent et retirer l’option de construction. Conserver les choix d’ignorer et l’historique ; ne pas supprimer les lignes acceptées.

## Limites de preuve

Acceptation fournisseur ≠ réception/lecture. Les appareils hors réseau dépendent toujours du transport push et de sa durée de conservation. Un rappel déjà transmis ne peut pas être retiré rétroactivement par l’annulation serveur. Les nouveaux textes et le bouton doivent encore être observés sur Android et iPhone ; les tests ne constituent pas cette preuve de réception.

## Changement de journée — 30 octobre 2026

Demande de Dr Justin : à minuit, les rappels de la veille s'arrêtent ; la nouvelle journée commence avec ses propres rappels.

- Existant vérifié (production) : le planning crée les relances jusqu'à 23 h 59 au plus tard ; aucun rappel d'une journée n'a été envoyé après minuit (historique depuis le 27/10 : dernier envoi 23 h 50).
- Expéditeur `envoyer-rappels-hd` version 5 (déployée le 30/10 vers 23 h 37, Kinshasa) : validité chez le fournisseur limitée à minuit dans le fuseau du participant (30 min au plus) ; aucun envoi dans la dernière minute de la journée ; la fin de journée (`fin`) est transmise au téléphone. Premiers envois vérifiés à 23 h 40 (Apple et Google acceptés). Version 4 conservée dans l'historique git (commit précédent 0c747b6^).
- Téléphone (service, cache v72) : chaque rappel habitudes et matin/midi/soir garde sa journée ; ceux d'une journée passée encore affichés sont retirés à l'arrivée d'un nouveau rappel et à l'ouverture de SÉNEVÉ ; le chiffre de l'icône ne les compte plus. Les annonces ne sont pas concernées.
- Limite : sans nouveau rappel ni ouverture de SÉNEVÉ, le téléphone ne peut pas retirer seul une notification exactement à minuit (aucun programme ne tourne sur le téléphone sans message entrant). Elles disparaissent au premier rappel du matin ou à l'ouverture de l'application.
