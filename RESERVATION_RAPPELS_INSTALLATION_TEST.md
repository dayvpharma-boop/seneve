# Réservation interne des rappels — installation TEST
25 octobre 2026 — migration habitudes_reservation_rappels_sans_envoi.
Projet : seneve-test (rlojnuaajeubzlwofwhn).
Production non modifiée ; aucune liaison HD active conservée.

## Comportement
hd_reserve_reminder(reminder_id, request_id), SECURITY INVOKER, est réservée à service_role.
Le précontrôle serveur est relu après acquisition du verrou transactionnel partagé avec l'annulation par activité.
La table hd_reminder_reservations impose une seule réservation par rappel et un seul rappel par request_id.
Une même demande peut être rejouée sans créer une seconde réservation.
Une autre demande ne peut pas prendre le rappel déjà réservé.
Réutiliser la demande pour un autre rappel est refusé.
Les réponses conservent toujours autorisation_envoi=false.
Aucune expiration ou reprise automatique n'est ajoutée : un traitement incertain reste bloqué.

## Essais exécutés
La recette supabase/tests/habitudes_reservation_rappels.sql a réussi avec rollback :
réservation initiale, reprise idempotente, deuxième worker refusé, demande contradictoire refusée,
identifiants absents refusés, accès client refusé, rôle serveur utilisable,
contrôles existants de progression et de rappels préservés.

Deux transactions service_role ont ensuite été lancées en parallèle sur le même rappel fictif.
La première a gardé la transaction ouverte trois secondes après réservation.
Résultats : reserve=true pour une seule demande, reserve=false / rappel_deja_reserve pour l'autre ;
une seule ligne de réservation après les deux commits. Aucune autorisation d'envoi.
Les fixtures temporaires persistées pour cet essai ont été supprimées avec leurs UUID exacts.

Contrôle final : zéro réservation, préférence, rappel, période d'accès, liaison HD,
programme de recette et participant de recette.

## Reproduire l'essai concurrent, exclusivement en TEST
Le script scripts/prepare-habitudes-reservation-concurrence.py génère un dossier temporaire et en affiche le chemin.
1. Exécuter setup.sql sur TEST. Ce fichier crée des fixtures fictives et les valide.
2. Exécuter 1.sql et 2.sql avec deux sessions indépendantes en parallèle.
3. Vérifier une réponse positive, une négative et une seule réservation.
4. Exécuter cleanup.sql même en cas d'échec, puis vérifier l'absence des fixtures.
Ce script génère du SQL ; il ne se connecte à aucune base et n'envoie aucun message.

## Sécurité et limites
RLS activée, aucune permission client sur la table ou la fonction.
L'avis Supabase INFO « RLS Enabled No Policy » est attendu sur cette table serveur :
aucune politique client, accès seulement service_role avec BYPASSRLS.
Voir https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
Les avertissements globaux préexistants ne sont pas modifiés.

Réserver ne signifie ni envoyer ni garantir une livraison unique chez un fournisseur.
Consentement, progression et droit peuvent changer après la transaction :
le futur expéditeur doit revalider immédiatement avant l'appel et traiter les résultats incertains.
Une progression réalisée annule le rappel planifié ; la réservation historique reste conservée.
Il reste à définir la prise en charge fournisseur, sa clé d'idempotence et les accusés,
l'annulation finale et la reprise contrôlée. Aucun worker ni calendrier n'est activé.
Le générateur générique existant doit exclure HD avant une activation.

Références techniques consultées :
https://www.postgresql.org/docs/current/explicit-locking.html
https://supabase.com/docs/guides/database/functions

## Retour arrière
Après contrôle des dépendances et conservation d'éventuelles réservations :
supprimer seneve.hd_reserve_reminder(uuid,uuid), puis seneve.hd_reminder_reservations.
Ne pas supprimer les autres objets HD.
